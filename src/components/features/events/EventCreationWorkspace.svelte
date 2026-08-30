<script lang="ts">
	import { onMount } from 'svelte';

	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import IconOptionPicker from '../../shared/IconOptionPicker.svelte';
	import SearchSelect from '../../shared/SearchSelect.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import { ensureMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import {
		ensureOrganizationManageCache,
		type OrganizationManageCharacter,
		type OrganizationManageSummary,
	} from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import {
		getRecentOrganizationAssetsByOrganization,
		loadRecentOrganizationAssets,
		recordRecentOrganizationAsset,
		type RecentOrganizationAssetEntry,
	} from '../../../libs/assets/recent-organization-assets.ts';
	import {
		getOrganizationRecentEventCreations,
		loadRecentEventCreations,
		recordRecentEventCreations,
		type RecentEventCreationEntry,
	} from '../../../libs/events/recent-event-creations.ts';
	import { getOrganizationReference, resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import { getLatestActiveOrganization, readPreferredOrganization, writePreferredOrganization } from '../../../libs/ledger/workspace-preferences.ts';
	import type { CreateLedgerEventRequest } from '../../../libs/api/openapi/generated/schema';

	interface GameOption {
		id: number;
		name: string;
		iconUrl: string | null;
		officialSiteUrl: string | null;
		resolvedIconUrl: string | null;
	}

	interface AssetInputRow {
		id: string;
		assetId: string;
		selectedLabel: string;
	}

	interface AssetDuplicateSuggestion {
		assetId: number;
		name: string;
	}

	interface SearchOption {
		value: string;
		label: string;
		metaLabel?: string | null;
	}

	interface KnownAssetRecord {
		assetId: number;
		name: string;
		assetType: RecentOrganizationAssetEntry['assetType'];
	}

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		sessionTitle: string;
		sessionBody: string;
		sessionCountLabel: string;
		quickCreateLabel: string;
		quickCreateEmpty: string;
		quickCreateTitle: string;
		quickCreateBody: string;
		quickCreateSelectLabel: string;
		quickCreateConfirmLabel: string;
		quickCreateCancelLabel: string;
		quickCreateCloseLabel: string;
		quickCreateDefaultPrefix: string;
		yesterdayPrefix: string;
		orgRequiredTitle: string;
		orgRequiredBody: string;
		contextTitle: string;
		contextBodyPrefix: string;
		contextSelectLabel: string;
		contextSelectPlaceholder: string;
		contextSelectEmpty: string;
		titleLabel: string;
		titlePlaceholder: string;
		occurredAtLabel: string;
		eventTypeLabel: string;
		sourceTypeLabel: string;
		sourceTypeLockedHint: string;
		gameIdLabel: string;
		gameRequiredHint: string;
		holderTypeLabel: string;
		holderRefLabel: string;
		holderRefPlaceholder: string;
		holderRefEmpty: string;
		holderRefHint: string;
		holderRefManualHint: string;
		holderRefUnclaimedMeta: string;
		holderRefSelectedLabel: string;
		holderRefAddLabel: string;
		holderRefChangeLabel: string;
		participantsLabel: string;
		participantsPlaceholder: string;
		participantsEmpty: string;
		participantsHint: string;
		participantsSelectedLabel: string;
		participantsAddLabel: string;
		notesLabel: string;
		notesPlaceholder: string;
		assetSectionLabel: string;
		assetSectionBody: string;
		assetCatalogHint: string;
		assetQuickPickLabel: string;
		assetQuickPickPlaceholder: string;
		assetQuickPickEmpty: string;
		assetIdLabel: string;
		assetIdPlaceholder: string;
		assetManualHint: string;
		assetSelectedLabel: string;
		clearSelectionLabel: string;
		addAssetLabel: string;
		removeAssetLabel: string;
		createItemLabel: string;
		createItemTitle: string;
		createItemNameLabel: string;
		createItemNamePlaceholder: string;
		createItemCreateLabel: string;
		createItemCancelLabel: string;
		createItemKnownDuplicateTitle: string;
		createItemKnownDuplicateBody: string;
		createItemResolveReviewBody: string;
		createItemCreateAnywayLabel: string;
		useExistingItemLabel: string;
		submitLabel: string;
		requiredHint: string;
		optionalHint: string;
		validationRequired: string;
		validationDate: string;
		validationNumber: string;
		validationContext: string;
		validationHolderCharacter: string;
		loadingGames: string;
		eventTypeLoot: string;
		eventTypeRaid: string;
		eventTypeActivity: string;
		eventTypeBonus: string;
		eventTypeSalary: string;
		eventTypeGuildEvent: string;
		eventTypeOther: string;
		sourceTypeManual: string;
		sourceTypeApi: string;
		sourceTypeImport: string;
		holderTypeCharacter: string;
		holderTypeOrgTreasury: string;
		holderTypeMarket: string;
		holderTypeExternal: string;
		holderTypeCustom: string;
		loadingCreateTitle: string;
		loadingCreateSingleBody: string;
		loadingCreateBatchPrefix: string;
		errorCreateTitle: string;
		errorTimeoutBody: string;
		errorRetryLabel: string;
		errorPartialPrefix: string;
		successCreateTitle: string;
		successCreateSingleBody: string;
		successCreateBatchPrefix: string;
		successCreateSuffix: string;
		successCloseLabel: string;
	}

	type FieldErrors = Record<string, string>;
	type EventType = NonNullable<CreateLedgerEventRequest['eventType']>;
	type HolderType = NonNullable<CreateLedgerEventRequest['holderType']>;

	const CREATE_TIMEOUT_MS = 20000;

	const eventTypeOptions: Array<{ value: EventType; labelKey: keyof Labels }> = [
		{ value: 'loot', labelKey: 'eventTypeLoot' },
		{ value: 'raid', labelKey: 'eventTypeRaid' },
		{ value: 'activity', labelKey: 'eventTypeActivity' },
		{ value: 'bonus', labelKey: 'eventTypeBonus' },
		{ value: 'salary', labelKey: 'eventTypeSalary' },
		{ value: 'guild_event', labelKey: 'eventTypeGuildEvent' },
		{ value: 'other', labelKey: 'eventTypeOther' },
	];

	const holderTypeOptions: Array<{ value: HolderType; labelKey: keyof Labels }> = [
		{ value: 'character', labelKey: 'holderTypeCharacter' },
		{ value: 'org_treasury', labelKey: 'holderTypeOrgTreasury' },
		{ value: 'market', labelKey: 'holderTypeMarket' },
		{ value: 'external', labelKey: 'holderTypeExternal' },
		{ value: 'custom', labelKey: 'holderTypeCustom' },
	];

	export let organization: string | null = null;
	export let quickCreateId: string | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let organizations: OrganizationCardResponse[] = [];
	let organizationSummary: OrganizationManageSummary | null = null;
	let organizationCharacters: OrganizationManageCharacter[] = [];
	let organizationReference: string | null = null;
	let games: GameOption[] = [];
	let contextLoading = true;
	let contextError = '';

	let title = '';
	let occurredAt = '';
	let eventType: EventType = 'loot';
	let gameId = '';
	let holderType: HolderType = 'character';
	let holderRef = '';
	let holderCharacterId = '';
	let participantPickerValue = '';
	let participantCharacterIds: string[] = [];
	let notes = '';
	let assetRows: AssetInputRow[] = [createAssetRow()];
	let assetSearchOptionsByRowId: Record<string, SearchOption[]> = {};
	let knownAssetsById: Record<string, KnownAssetRecord> = {};

	let recentEntries: RecentEventCreationEntry[] = [];
	let recentAssets: RecentOrganizationAssetEntry[] = [];
	let quickCreateOpen = false;
	let selectedRecentId = '';

	let createItemOpen = false;
	let createItemName = '';
	let createItemSubmitting = false;
	let createItemError = '';
	let createItemTargetRowId = '';
	let duplicateSuggestions: AssetDuplicateSuggestion[] = [];
	let createItemResolved = false;

	let errors: FieldErrors = {};
	let isSubmitting = false;

	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; onClick?: () => void } | null = null;
	let dialogSecondaryAction: { label: string; onClick?: () => void } | null = null;

	function createAssetRow(assetId = '', selectedLabel = ''): AssetInputRow {
		return {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			assetId,
			selectedLabel,
		};
	}

	function toLocalDateTimeValue(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		const hours = `${date.getHours()}`.padStart(2, '0');
		const minutes = `${date.getMinutes()}`.padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function getCurrentRecentEntries() {
		return organization ? getOrganizationRecentEventCreations(recentEntries, organization) : [];
	}

	function getCurrentRecentAssets() {
		return organization ? getRecentOrganizationAssetsByOrganization(recentAssets, organization) : [];
	}

	function findOrganizationByReference(reference: string) {
		return organizations.find((entry) => getOrganizationReference(entry) === reference) ?? null;
	}

	function refreshRecentEntries() {
		if (typeof window === 'undefined') {
			return;
		}

		recentEntries = loadRecentEventCreations(window.localStorage);
		const currentEntries = getCurrentRecentEntries();
		if (!selectedRecentId && currentEntries[0]) {
			selectedRecentId = currentEntries[0].id;
		}
	}

	function refreshRecentAssets() {
		if (typeof window === 'undefined') {
			return;
		}

		recentAssets = loadRecentOrganizationAssets(window.localStorage);
	}

	function getSelectedRecentEntry() {
		return getCurrentRecentEntries().find((entry) => entry.id === selectedRecentId) ?? null;
	}

	function formatRecentEntryLabel(entry: RecentEventCreationEntry) {
		const createdAtDate = new Date(entry.createdAt);
		const now = new Date();
		const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const createdDay = new Date(createdAtDate.getFullYear(), createdAtDate.getMonth(), createdAtDate.getDate());
		const dayDiff = Math.round((currentDay.getTime() - createdDay.getTime()) / (24 * 60 * 60 * 1000));
		const timeLabel = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit',
		}).format(createdAtDate);
		const prefix = dayDiff === 1 ? `${labels.yesterdayPrefix} ` : '';
		return `${entry.payload.title} - ${prefix}${timeLabel}`;
	}

	function openPendingDialog(totalEvents: number) {
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.loadingCreateTitle;
		dialogMessage =
			totalEvents > 1
				? `${labels.loadingCreateBatchPrefix} ${totalEvents} ${labels.successCreateSuffix}`
				: labels.loadingCreateSingleBody;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
	}

	function openErrorDialog(message: string) {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.errorCreateTitle;
		dialogMessage = message;
		dialogPrimaryAction = {
			label: labels.errorRetryLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
		dialogSecondaryAction = null;
	}

	function openSuccessDialog(totalEvents: number) {
		dialogOpen = true;
		dialogState = 'success';
		dialogTitle = labels.successCreateTitle;
		dialogMessage =
			totalEvents > 1
				? `${labels.successCreateBatchPrefix} ${totalEvents} ${labels.successCreateSuffix}`
				: labels.successCreateSingleBody;
		dialogPrimaryAction = {
			label: labels.successCloseLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
		dialogSecondaryAction = null;
	}

	function addAssetRow() {
		const row = createAssetRow();
		assetRows = [...assetRows, row];
		assetSearchOptionsByRowId = { ...assetSearchOptionsByRowId, [row.id]: recentAssetOptions };
	}

	function updateAssetRow(rowId: string, assetId: string, selectedLabel = '') {
		assetRows = assetRows.map((row) => (row.id === rowId ? { ...row, assetId, selectedLabel } : row));
	}

	function removeAssetRow(rowId: string) {
		if (assetRows.length === 1) {
			assetRows = [createAssetRow()];
			assetSearchOptionsByRowId = {};
			return;
		}

		assetRows = assetRows.filter((row) => row.id !== rowId);
		const nextOptions = { ...assetSearchOptionsByRowId };
		delete nextOptions[rowId];
		assetSearchOptionsByRowId = nextOptions;
	}

	function getNormalizedAssetIds() {
		const values: number[] = [];

		for (const row of assetRows) {
			const trimmed = row.assetId.trim();
			if (!trimmed) {
				continue;
			}

			const parsed = Number(trimmed);
			if (!Number.isInteger(parsed) || parsed <= 0) {
				return null;
			}

			values.push(parsed);
		}

		return values;
	}

	function getPreferredGameId(
		characters: OrganizationManageCharacter[],
		summary: OrganizationManageSummary | null,
		currentSession: AuthSession | null,
	) {
		if (isAuthenticatedSession(currentSession)) {
			const claimedCharacter = characters.find(
				(character) => character.claimedBy?.userId === currentSession.user.id && typeof character.gameId === 'number',
			);
			if (typeof claimedCharacter?.gameId === 'number') {
				return String(claimedCharacter.gameId);
			}
		}

		const primaryGame = summary?.games.find((game) => game.primary) ?? summary?.games[0];
		return primaryGame ? String(primaryGame.gameId) : '';
	}

	function getDefaultHolderCharacterId(
		nextGameId: string,
		characters: OrganizationManageCharacter[],
		currentSession: AuthSession | null,
	) {
		const normalizedGameId = Number(nextGameId);
		if (!Number.isFinite(normalizedGameId)) {
			return '';
		}

		const charactersInGame = characters.filter((character) => character.gameId === normalizedGameId);
		if (isAuthenticatedSession(currentSession)) {
			const claimedByCurrentUser = charactersInGame.find(
				(character) => character.claimedBy?.userId === currentSession.user.id,
			);
			if (claimedByCurrentUser) {
				return String(claimedByCurrentUser.id);
			}
		}

		return '';
	}

	function getCharacterById(characterId: string) {
		return organizationCharacters.find((character) => String(character.id) === characterId) ?? null;
	}

	function getCharacterMetaLabel(character: OrganizationManageCharacter) {
		return character.claimedBy?.displayName ?? labels.holderRefUnclaimedMeta;
	}

	function syncHolderFromCharacterId(characterId: string) {
		holderCharacterId = characterId;
		holderRef = getCharacterById(characterId)?.name ?? '';
	}

	function addParticipantCharacterId(characterId: string) {
		if (!characterId || participantCharacterIds.includes(characterId)) {
			participantPickerValue = '';
			return;
		}

		participantCharacterIds = [...participantCharacterIds, characterId];
		participantPickerValue = '';
	}

	function removeParticipantCharacterId(characterId: string) {
		participantCharacterIds = participantCharacterIds.filter((value) => value !== characterId);
	}

	function normalizeParticipantCharacterIdsForGame(nextGameId: string) {
		const normalizedGameId = Number(nextGameId);
		if (!Number.isFinite(normalizedGameId)) {
			participantCharacterIds = [];
			participantPickerValue = '';
			return;
		}

		participantCharacterIds = participantCharacterIds.filter(
			(characterId) => getCharacterById(characterId)?.gameId === normalizedGameId,
		);
		participantPickerValue = '';
	}

	function applyRecentEntry(entry: RecentEventCreationEntry) {
		title = entry.payload.title;
		occurredAt = toLocalDateTimeValue(new Date(entry.payload.occurredAt));
		eventType = entry.payload.eventType ?? 'loot';
		gameId =
			typeof entry.payload.gameId === 'number' && Number.isFinite(entry.payload.gameId)
				? String(entry.payload.gameId)
				: '';
		holderType = entry.payload.holderType ?? 'character';
		holderRef = typeof entry.payload.holderRef === 'string' ? entry.payload.holderRef : '';
		holderCharacterId =
			holderType === 'character'
				? String(
						organizationCharacters.find(
							(character) =>
								character.gameId === Number(gameId) && character.name === entry.payload.holderRef,
						)?.id ?? '',
					)
				: '';
		participantCharacterIds = (entry.payload.participants ?? [])
			.map((participant) =>
				typeof participant.characterId === 'number' && Number.isFinite(participant.characterId)
					? String(participant.characterId)
					: '',
			)
			.filter(Boolean);
		participantPickerValue = '';
		notes = typeof entry.payload.notes === 'string' ? entry.payload.notes : '';
		assetRows =
			typeof entry.payload.assetId === 'number' && Number.isFinite(entry.payload.assetId)
				? [createAssetRow(String(entry.payload.assetId), getKnownAssetName(entry.payload.assetId) ?? '')]
				: [createAssetRow()];
		errors = {};
	}

	function getKnownAssetName(assetId: number) {
		return knownAssetsById[String(assetId)]?.name ?? getCurrentRecentAssets().find((asset) => asset.assetId === assetId)?.name ?? '';
	}

	function confirmQuickCreate() {
		const entry = getSelectedRecentEntry();
		if (!entry) {
			return;
		}

		applyRecentEntry(entry);
		quickCreateOpen = false;
	}

	function validate() {
		const nextErrors: FieldErrors = {};

		if (!organizationReference) {
			nextErrors.organization = labels.validationContext;
		}

		if (!title.trim()) {
			nextErrors.title = labels.validationRequired;
		}

		if (!occurredAt.trim()) {
			nextErrors.occurredAt = labels.validationRequired;
		} else if (!Number.isFinite(new Date(occurredAt).getTime())) {
			nextErrors.occurredAt = labels.validationDate;
		}

		if (!gameId.trim()) {
			nextErrors.gameId = labels.validationRequired;
		} else {
			const parsedGameId = Number(gameId);
			if (!Number.isInteger(parsedGameId) || parsedGameId <= 0) {
				nextErrors.gameId = labels.validationNumber;
			}
		}

		if (holderType === 'character' && !holderRef.trim()) {
			nextErrors.holderRef = labels.validationHolderCharacter;
		}

		const assetIds = getNormalizedAssetIds();
		if (assetIds === null) {
			nextErrors.assetIds = labels.validationNumber;
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function buildBasePayload(): Omit<CreateLedgerEventRequest, 'assetId'> {
		const payload: Omit<CreateLedgerEventRequest, 'assetId'> = {
			title: title.trim(),
			occurredAt: new Date(occurredAt).toISOString(),
			eventType,
			sourceType: 'manual',
			gameId: Number(gameId),
			holderType,
		};

		if (holderRef.trim()) {
			payload.holderRef = holderRef.trim();
		}

		if (notes.trim()) {
			payload.notes = notes.trim();
		}

		if (participantCharacterIds.length > 0) {
			payload.participants = participantCharacterIds
				.map((characterId) => Number(characterId))
				.filter((characterId) => Number.isInteger(characterId) && characterId > 0)
				.map((characterId) => ({ characterId }));
		}

		return payload;
	}

	async function loadOrganizationContext() {
		contextLoading = true;
		contextError = '';

		try {
			session = await ensureAuthSession();
			const organizationSnapshot = await ensureMyOrganizationsCache();
			organizations = organizationSnapshot.organizations;
			if (!organization && organizations.length > 0 && typeof window !== 'undefined') {
				const recentOrganization = getLatestActiveOrganization(window.localStorage, window.sessionStorage);
				const preferredOrganization = readPreferredOrganization(window.localStorage);
				const nextOrganization =
					(recentOrganization && findOrganizationByReference(recentOrganization) && recentOrganization) ||
					(preferredOrganization && findOrganizationByReference(preferredOrganization) && preferredOrganization) ||
					getOrganizationReference(organizations[0]);
				organization = nextOrganization;
			}

			if (!organization) {
				return;
			}

			const snapshot = await ensureOrganizationManageCache(organization);
			organizationSummary = snapshot.organization;
			organizationCharacters = snapshot.characters;
			organizationReference = String(snapshot.organization.id);
			games = snapshot.organization.games.map((game) => ({
				id: game.gameId,
				name: game.displayName ?? game.name,
				iconUrl: game.iconUrl,
				officialSiteUrl: game.officialSiteUrl,
				resolvedIconUrl: game.resolvedIconUrl,
			}));
			if (!gameId) {
				gameId = getPreferredGameId(snapshot.characters, snapshot.organization, session);
			}
			normalizeParticipantCharacterIdsForGame(gameId);
			if (holderType === 'character' && !holderRef) {
				syncHolderFromCharacterId(getDefaultHolderCharacterId(gameId, snapshot.characters, session));
			}
			if (typeof window !== 'undefined') {
				writePreferredOrganization(window.localStorage, organization);
				const url = new URL(window.location.href);
				url.searchParams.set('orgVanity', organization);
				window.history.replaceState({}, '', url);
			}
		} catch (error) {
			contextError = getErrorMessage(error, labels.errorCreateTitle);
		} finally {
			contextLoading = false;
		}
	}

	async function changeOrganization(nextOrganization: string) {
		if (!nextOrganization || nextOrganization === organization) {
			return;
		}

		organization = nextOrganization;
		organizationSummary = null;
		organizationCharacters = [];
		organizationReference = null;
		games = [];
		gameId = '';
		holderRef = '';
		holderCharacterId = '';
		participantCharacterIds = [];
		participantPickerValue = '';
		assetRows = [createAssetRow()];
		assetSearchOptionsByRowId = {};
		await loadOrganizationContext();
	}

	function parseDuplicateSuggestions(error: unknown) {
		if (!(error instanceof Error)) {
			return [];
		}

		try {
			const parsed = JSON.parse(error.message) as {
				duplicate?: {
					exactMatch?: { asset?: { id?: number; name?: string } };
					possibleMatches?: Array<{ asset?: { id?: number; name?: string } }>;
				};
			};
			const candidates = [parsed.duplicate?.exactMatch, ...(parsed.duplicate?.possibleMatches ?? [])];
			return candidates.flatMap((candidate) => {
				if (typeof candidate?.asset?.id !== 'number' || typeof candidate.asset.name !== 'string') {
					return [];
				}

				return [{ assetId: candidate.asset.id, name: candidate.asset.name }];
			});
		} catch {
			return [];
		}
	}

	function openCreateItem(rowId: string) {
		createItemTargetRowId = rowId;
		createItemName = '';
		createItemError = '';
		createItemSubmitting = false;
		duplicateSuggestions = [];
		createItemResolved = false;
		createItemOpen = true;
	}

	function useExistingAssetSuggestion(assetId: number) {
		if (!createItemTargetRowId) {
			return;
		}

		updateAssetRow(createItemTargetRowId, String(assetId), getKnownAssetName(assetId));
		createItemOpen = false;
	}

	function rememberKnownAsset(asset: { id: number; name: string; assetType: RecentOrganizationAssetEntry['assetType'] }) {
		knownAssetsById = {
			...knownAssetsById,
			[String(asset.id)]: {
				assetId: asset.id,
				name: asset.name,
				assetType: asset.assetType,
			},
		};
	}

	function rememberAssetSelection(assetId: number) {
		if (typeof window === 'undefined' || !organization) {
			return;
		}

		const knownAsset = knownAssetsById[String(assetId)];
		if (!knownAsset) {
			return;
		}

		recentAssets = recordRecentOrganizationAsset(window.localStorage, {
			organization,
			assetId: knownAsset.assetId,
			name: knownAsset.name,
			assetType: knownAsset.assetType,
			createdAt: new Date().toISOString(),
		});
	}

	function getAssetOptionsForRow(rowId: string) {
		const mappedRecent = recentAssetOptions.filter(
			(option, index, array) => array.findIndex((candidate) => candidate.value === option.value) === index,
		);
		const rowOptions = assetSearchOptionsByRowId[rowId] ?? [];
		return [...rowOptions, ...mappedRecent].filter(
			(option, index, array) => array.findIndex((candidate) => candidate.value === option.value) === index,
		);
	}

	async function loadAssetSearchOptions(rowId: string, query = '') {
		if (!organizationReference) {
			return;
		}

		if (!query.trim()) {
			assetSearchOptionsByRowId = { ...assetSearchOptionsByRowId, [rowId]: recentAssetOptions };
			return;
		}

		try {
			const response = await getApiAdapter().searchOrganizationAssets(organizationReference, {
				q: query.trim(),
				gameId: Number(gameId) || undefined,
				assetType: 'item',
				limit: 8,
			});
			const options = response.assets.map((asset) => {
				rememberKnownAsset(asset);
				return {
					value: String(asset.id),
					label: asset.name,
					metaLabel: `#${asset.id}`,
				};
			});
			assetSearchOptionsByRowId = { ...assetSearchOptionsByRowId, [rowId]: options };
		} catch {
			assetSearchOptionsByRowId = { ...assetSearchOptionsByRowId, [rowId]: recentAssetOptions };
		}
	}

	function clearAssetSelection(rowId: string) {
		updateAssetRow(rowId, '', '');
	}

	async function submitCreateItem() {
		if (!organizationReference || !organization || !createItemName.trim() || createItemSubmitting) {
			createItemError = !organizationReference ? labels.validationContext : labels.validationRequired;
			return;
		}

		createItemSubmitting = true;
		createItemError = '';
		duplicateSuggestions = [];

		try {
			if (!createItemResolved && Number.isFinite(Number(gameId)) && Number(gameId) > 0) {
				try {
					const resolveResponse = await getApiAdapter().resolveOrganizationAsset(organizationReference, {
						gameId: Number(gameId),
						name: createItemName.trim(),
					});
					duplicateSuggestions = [
						resolveResponse.duplicate.exactMatch,
						...resolveResponse.duplicate.possibleMatches,
					].flatMap((candidate) => {
						if (typeof candidate?.asset?.id !== 'number' || typeof candidate.asset.name !== 'string') {
							return [];
						}
						rememberKnownAsset(candidate.asset);
						return [{ assetId: candidate.asset.id, name: candidate.asset.name }];
					}).filter(
						(suggestion, index, array) =>
							array.findIndex((candidate) => candidate.assetId === suggestion.assetId) === index,
					);
					if (duplicateSuggestions.length > 0 && resolveResponse.duplicate.recommendedAction !== 'allow_create') {
						createItemResolved = true;
						createItemError = labels.createItemResolveReviewBody;
						return;
					}
					createItemResolved = true;
				} catch {
					// If duplicate resolution fails on the backend, keep the flow usable and let direct create handle it.
					createItemResolved = true;
				}
			}

			const response = await getApiAdapter().createOrganizationAsset(organizationReference, {
				name: createItemName.trim(),
				assetType: 'item',
			});
			rememberKnownAsset(response.asset);
			if (typeof window !== 'undefined') {
				recentAssets = recordRecentOrganizationAsset(window.localStorage, {
					organization,
					assetId: response.asset.id,
					name: response.asset.name,
					assetType: response.asset.assetType,
					createdAt: new Date().toISOString(),
				});
			}
			if (createItemTargetRowId) {
				updateAssetRow(createItemTargetRowId, String(response.asset.id), response.asset.name);
			}
			createItemOpen = false;
		} catch (error) {
			duplicateSuggestions = parseDuplicateSuggestions(error);
			createItemError = getErrorMessage(error, labels.errorCreateTitle);
		} finally {
			createItemSubmitting = false;
		}
	}

	async function submit() {
		if (isSubmitting || !validate() || !organizationReference || contextLoading) {
			return;
		}

		const assetIds = getNormalizedAssetIds() ?? [];
		const basePayload = buildBasePayload();
		const payloads: CreateLedgerEventRequest[] =
			assetIds.length > 0 ? assetIds.map((assetId) => ({ ...basePayload, assetId })) : [{ ...basePayload }];

		isSubmitting = true;
		openPendingDialog(payloads.length);

		let timedOut = false;
		let createdCount = 0;
		const timeoutId = window.setTimeout(() => {
			timedOut = true;
			openErrorDialog(labels.errorTimeoutBody);
		}, CREATE_TIMEOUT_MS);

		try {
			for (const payload of payloads) {
				await getApiAdapter().createOrganizationLedgerEvent(organizationReference, payload);
				createdCount += 1;
			}

			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			if (typeof window !== 'undefined' && organization) {
				recentEntries = recordRecentEventCreations(window.localStorage, organization, payloads, new Date().toISOString());
				selectedRecentId = getCurrentRecentEntries()[0]?.id ?? '';
			}
			openSuccessDialog(payloads.length);
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			const baseMessage = getErrorMessage(error, labels.errorCreateTitle);
			openErrorDialog(
				createdCount > 0 ? `${baseMessage} ${labels.errorPartialPrefix} ${createdCount}.` : baseMessage,
			);
		} finally {
			isSubmitting = false;
		}
	}

	$: filteredHolderCharacters = organizationCharacters
		.filter((character) => character.gameId === Number(gameId))
		.map((character) => ({
			value: String(character.id),
			label: character.name,
			metaLabel: getCharacterMetaLabel(character),
		}));

	$: participantCharacterOptions = organizationCharacters
		.filter((character) => character.gameId === Number(gameId))
		.filter((character) => !participantCharacterIds.includes(String(character.id)))
		.map((character) => ({
			value: String(character.id),
			label: character.name,
			metaLabel: getCharacterMetaLabel(character),
		}));

	$: selectedParticipantCharacters = participantCharacterIds
		.map((characterId) => getCharacterById(characterId))
		.filter((character): character is OrganizationManageCharacter => Boolean(character));

	$: recentAssetOptions = getCurrentRecentAssets().map((asset) => ({
		value: String(asset.assetId),
		label: asset.name,
		metaLabel: `#${asset.assetId}`,
	}));

	$: selectedHolderCharacter = getCharacterById(holderCharacterId);
	$: organizationOptions = organizations.map((entry) => ({
		value: getOrganizationReference(entry),
		label: entry.name,
		metaLabel: entry.vanity ? `@${entry.vanity}` : `${entry.stats.memberCount} members`,
		iconUrl: entry.iconUrl,
	}));
	$: gameOptions = games.map((game) => ({
		value: String(game.id),
		label: game.name,
		iconUrl: game.iconUrl,
		resolvedIconUrl: game.resolvedIconUrl,
		officialSiteUrl: game.officialSiteUrl,
	}));

	onMount(() => {
		organization = resolveOrganizationQuery(organization);
		occurredAt = toLocalDateTimeValue(new Date());
		refreshRecentEntries();
		refreshRecentAssets();
		if (quickCreateId) {
			selectedRecentId = quickCreateId;
			const entry = getSelectedRecentEntry();
			if (entry) {
				applyRecentEntry(entry);
			}
		}
		void loadOrganizationContext();
	});
</script>

<section class="event-workspace-shell">
	<div class="event-workspace-header">
		<div>
			<p class="event-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p class="event-intro">{labels.intro}</p>
		</div>

		<div class="event-session-card">
			<h2>{labels.sessionTitle}</h2>
			<p>{labels.sessionBody}</p>
			<div class="event-session-meta">
				<span>{labels.sessionCountLabel}</span>
				<strong>{getCurrentRecentEntries().length}</strong>
			</div>
			{#if getCurrentRecentEntries().length > 0}
				<button
					type="button"
					class="event-session-button"
					on:click={() => {
						selectedRecentId = getCurrentRecentEntries()[0]?.id ?? '';
						quickCreateOpen = true;
					}}
				>
					{labels.quickCreateLabel}
				</button>
			{:else}
				<p class="event-session-empty">{labels.quickCreateEmpty}</p>
			{/if}
		</div>
	</div>

	{#if !organization}
		<section class="event-org-required">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</section>
	{:else}
		<section class="event-context-card">
			<h2>{labels.contextTitle}</h2>
			<p>{labels.contextBodyPrefix}</p>
			{#if organizationOptions.length > 0}
				<label class="event-field">
					<span>{labels.contextSelectLabel}</span>
					<IconOptionPicker
						value={organization}
						ariaLabel={labels.contextSelectLabel}
						placeholder={labels.contextSelectPlaceholder}
						searchPlaceholder={labels.contextSelectPlaceholder}
						emptyLabel={labels.contextSelectEmpty}
						disabled={contextLoading}
						theme="guild"
						items={organizationOptions}
						on:change={(event) => {
							void changeOrganization(event.detail.value);
						}}
					/>
				</label>
			{:else}
				<p>{organizationSummary?.name ?? `@${organization}`}</p>
			{/if}
			{#if contextError}<em>{contextError}</em>{/if}
		</section>
	{/if}

	<form
		class="event-form"
		on:submit|preventDefault={() => {
			void submit();
		}}
	>
		<div class="event-grid">
			<label class="event-field event-field-wide">
				<span>{labels.titleLabel}</span>
				<input
					class:error={Boolean(errors.title)}
					bind:value={title}
					type="text"
					maxlength="200"
					placeholder={labels.titlePlaceholder}
					disabled={!organization || contextLoading}
				/>
				<small>{labels.requiredHint}</small>
				{#if errors.title}<em>{errors.title}</em>{/if}
			</label>

			<label class="event-field">
				<span>{labels.occurredAtLabel}</span>
				<input class:error={Boolean(errors.occurredAt)} bind:value={occurredAt} type="datetime-local" disabled={!organization || contextLoading} />
				<small>{labels.requiredHint}</small>
				{#if errors.occurredAt}<em>{errors.occurredAt}</em>{/if}
			</label>

			<label class="event-field">
				<span>{labels.eventTypeLabel}</span>
				<select bind:value={eventType} disabled={!organization || contextLoading}>
					{#each eventTypeOptions as option}
						<option value={option.value}>{labels[option.labelKey]}</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<label class="event-field">
				<span>{labels.sourceTypeLabel}</span>
				<input value={labels.sourceTypeManual} type="text" disabled />
				<small>{labels.sourceTypeLockedHint}</small>
			</label>

			<label class="event-field">
				<span>{labels.gameIdLabel}</span>
				<IconOptionPicker
					value={gameId}
					ariaLabel={labels.gameIdLabel}
					placeholder={contextLoading ? labels.loadingGames : labels.gameRequiredHint}
					searchPlaceholder={labels.gameRequiredHint}
					disabled={!organization || contextLoading}
					error={Boolean(errors.gameId)}
					theme="game"
					items={gameOptions}
					on:change={(event) => {
						gameId = event.detail.value;
						normalizeParticipantCharacterIdsForGame(event.detail.value);
						if (holderType === 'character') {
							syncHolderFromCharacterId(getDefaultHolderCharacterId(event.detail.value, organizationCharacters, session));
						}
					}}
				/>
				<small>{labels.gameRequiredHint}</small>
				{#if errors.gameId}<em>{errors.gameId}</em>{/if}
			</label>

			<label class="event-field">
				<span>{labels.holderTypeLabel}</span>
				<select
					bind:value={holderType}
					disabled={!organization || contextLoading}
					on:change={() => {
						if (holderType === 'character') {
							syncHolderFromCharacterId(getDefaultHolderCharacterId(gameId, organizationCharacters, session));
						} else {
							holderCharacterId = '';
							holderRef = '';
						}
					}}
				>
					{#each holderTypeOptions as option}
						<option value={option.value}>{labels[option.labelKey]}</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<label class="event-field event-field-wide">
				<span>{labels.holderRefLabel}</span>
				{#if holderType === 'character'}
					{#if selectedHolderCharacter}
						<div class="event-selected-chip-row">
							<span>{labels.holderRefSelectedLabel}</span>
							<button
								type="button"
								class="event-selected-chip"
								on:click={() => {
									holderCharacterId = '';
									holderRef = '';
								}}
							>
								<strong>{selectedHolderCharacter.name}</strong>
								<small>{selectedHolderCharacter.claimedBy?.displayName ?? labels.holderRefUnclaimedMeta}</small>
								<b aria-hidden="true">x</b>
								<span class="sr-only">{labels.clearSelectionLabel}</span>
							</button>
						</div>
					{/if}
					<SearchSelect
						value={holderCharacterId}
						ariaLabel={labels.holderRefLabel}
						placeholder={labels.holderRefPlaceholder}
						searchPlaceholder={labels.holderRefPlaceholder}
						emptyLabel={labels.holderRefEmpty}
						disabled={!organization || !gameId || contextLoading}
						error={Boolean(errors.holderRef)}
						triggerMode="button"
						buttonIdleLabel={labels.holderRefAddLabel}
						buttonActiveLabel={labels.holderRefChangeLabel}
						items={filteredHolderCharacters}
						on:change={(event) => {
							syncHolderFromCharacterId(event.detail.value);
						}}
					/>
					<small>{labels.holderRefHint}</small>
				{:else}
					<input bind:value={holderRef} type="text" maxlength="120" placeholder={labels.holderRefPlaceholder} disabled={!organization || contextLoading} />
					<small>{labels.holderRefManualHint}</small>
				{/if}
				{#if errors.holderRef}<em>{errors.holderRef}</em>{/if}
			</label>

			<label class="event-field event-field-wide">
				<span>{labels.participantsLabel}</span>
				{#if selectedParticipantCharacters.length > 0}
					<div class="event-selected-chip-row">
						<span>{labels.participantsSelectedLabel}</span>
						<div class="event-selected-chip-list">
							{#each selectedParticipantCharacters as character}
								<button
									type="button"
									class="event-selected-chip"
									on:click={() => removeParticipantCharacterId(String(character.id))}
								>
									<strong>{character.name}</strong>
									<small>{getCharacterMetaLabel(character)}</small>
									<b aria-hidden="true">x</b>
									<span class="sr-only">{labels.clearSelectionLabel}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}
				<SearchSelect
					value={participantPickerValue}
					ariaLabel={labels.participantsLabel}
					placeholder={labels.participantsPlaceholder}
					searchPlaceholder={labels.participantsPlaceholder}
					emptyLabel={labels.participantsEmpty}
					disabled={!organization || !gameId || contextLoading}
					triggerMode="button"
					buttonIdleLabel={labels.participantsAddLabel}
					buttonActiveLabel={labels.participantsAddLabel}
					items={participantCharacterOptions}
					on:change={(event) => {
						addParticipantCharacterId(event.detail.value);
					}}
				/>
				<small>{labels.participantsHint}</small>
			</label>

			<label class="event-field event-field-wide">
				<span>{labels.notesLabel}</span>
				<textarea bind:value={notes} rows="4" maxlength="1000" placeholder={labels.notesPlaceholder} disabled={!organization || contextLoading}></textarea>
				<small>{labels.optionalHint}</small>
			</label>
		</div>

		<section class="event-assets-card">
			<div class="event-assets-copy">
				<h2>{labels.assetSectionLabel}</h2>
				<p>{labels.assetSectionBody}</p>
				<p class="event-assets-catalog-hint">{labels.assetCatalogHint}</p>
			</div>

			<div class="event-assets-list">
				{#each assetRows as row, index (row.id)}
					<div class="event-asset-row">
						<label class="event-field">
							<span>{labels.assetQuickPickLabel} #{index + 1}</span>
							<SearchSelect
								value={row.assetId}
								ariaLabel={`${labels.assetQuickPickLabel} ${index + 1}`}
								placeholder={labels.assetQuickPickPlaceholder}
								emptyLabel={labels.assetQuickPickEmpty}
								disabled={!organization || contextLoading}
								items={getAssetOptionsForRow(row.id)}
								on:focus={() => {
									void loadAssetSearchOptions(row.id);
								}}
								on:search={(event) => {
									void loadAssetSearchOptions(row.id, event.detail.query);
								}}
								on:change={(event) => {
									const selectedOption = getAssetOptionsForRow(row.id).find((option) => option.value === event.detail.value);
									updateAssetRow(row.id, event.detail.value, selectedOption?.label ?? '');
									rememberAssetSelection(Number(event.detail.value));
								}}
							/>
							{#if row.assetId && row.selectedLabel}
								<div class="event-selected-chip-row">
									<span>{labels.assetSelectedLabel}</span>
									<button type="button" class="event-selected-chip" on:click={() => clearAssetSelection(row.id)}>
										<strong>{row.selectedLabel}</strong>
										<small>#{row.assetId}</small>
										<b aria-hidden="true">x</b>
										<span class="sr-only">{labels.clearSelectionLabel}</span>
									</button>
								</div>
							{/if}
							<small>{labels.optionalHint}</small>
						</label>
						<label class="event-field">
							<span>{labels.assetIdLabel} #{index + 1}</span>
							<input
								class:error={Boolean(errors.assetIds)}
								type="text"
								value={row.assetId}
								placeholder={labels.assetIdPlaceholder}
								readonly
								disabled={!organization || contextLoading}
							/>
							<small>{labels.assetManualHint}</small>
						</label>
						<div class="event-asset-row-actions">
							<button type="button" class="event-asset-create" on:click={() => openCreateItem(row.id)} disabled={!organization || contextLoading}>
								{labels.createItemLabel}
							</button>
							<button type="button" class="event-asset-remove" on:click={() => removeAssetRow(row.id)} disabled={!organization || contextLoading}>
								{labels.removeAssetLabel}
							</button>
						</div>
					</div>
				{/each}
				{#if errors.assetIds}<em class="event-assets-error">{errors.assetIds}</em>{/if}
			</div>

			<div class="event-assets-actions">
				<button type="button" class="event-asset-add" on:click={addAssetRow} disabled={!organization || contextLoading}>
					{labels.addAssetLabel}
				</button>
			</div>
		</section>

		<div class="event-actions">
			<button class="event-submit" type="submit" disabled={!organization || !organizationReference || contextLoading || isSubmitting}>
				{labels.submitLabel}
			</button>
		</div>
	</form>

	{#if quickCreateOpen}
		<div class="quick-create-backdrop" role="presentation">
			<div class="quick-create-modal" role="dialog" aria-modal="true" aria-labelledby="quick-create-title">
				<button
					type="button"
					class="quick-create-close"
					aria-label={labels.quickCreateCloseLabel}
					on:click={() => {
						quickCreateOpen = false;
					}}
				>
					<span></span>
					<span></span>
				</button>

				<h2 id="quick-create-title">{labels.quickCreateTitle}</h2>
				<p>{labels.quickCreateBody}</p>

				{#if getCurrentRecentEntries().length > 0}
					<label class="event-field">
						<span>{labels.quickCreateSelectLabel}</span>
						<select bind:value={selectedRecentId}>
							{#each getCurrentRecentEntries() as entry, index}
								<option value={entry.id}>
									{index === 0 ? `${labels.quickCreateDefaultPrefix} ${formatRecentEntryLabel(entry)}` : formatRecentEntryLabel(entry)}
								</option>
							{/each}
						</select>
					</label>
				{/if}

				<div class="quick-create-actions">
					<button type="button" class="quick-create-cancel" on:click={() => (quickCreateOpen = false)}>
						{labels.quickCreateCancelLabel}
					</button>
					<button type="button" class="quick-create-confirm" on:click={confirmQuickCreate}>
						{labels.quickCreateConfirmLabel}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if createItemOpen}
		<div class="quick-create-backdrop" role="presentation">
			<div class="quick-create-modal" role="dialog" aria-modal="true">
				<h2>{labels.createItemTitle}</h2>
				<label class="event-field">
					<span>{labels.createItemNameLabel}</span>
					<input bind:value={createItemName} type="text" maxlength="120" placeholder={labels.createItemNamePlaceholder} />
				</label>
				{#if createItemError}<em class="event-assets-error">{createItemError}</em>{/if}
				{#if duplicateSuggestions.length > 0}
					<div class="event-duplicate-card">
						<h3>{labels.createItemKnownDuplicateTitle}</h3>
						<p>{labels.createItemKnownDuplicateBody}</p>
						<div class="event-duplicate-actions">
							{#each duplicateSuggestions as suggestion}
								<button type="button" class="event-duplicate-use" on:click={() => useExistingAssetSuggestion(suggestion.assetId)}>
									{labels.useExistingItemLabel}: {suggestion.name} #{suggestion.assetId}
								</button>
							{/each}
						</div>
					</div>
				{/if}
				<div class="quick-create-actions">
					<button type="button" class="quick-create-cancel" on:click={() => (createItemOpen = false)}>
						{labels.createItemCancelLabel}
					</button>
					<button type="button" class="quick-create-confirm" on:click={() => void submitCreateItem()} disabled={createItemSubmitting}>
						{createItemResolved ? labels.createItemCreateAnywayLabel : labels.createItemCreateLabel}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<RequestStatusDialog
		open={dialogOpen}
		state={dialogState}
		title={dialogTitle}
		message={dialogMessage}
		primaryAction={dialogPrimaryAction}
		secondaryAction={dialogSecondaryAction}
		onClose={() => {
			dialogOpen = false;
		}}
	/>
</section>

<style>
	.event-workspace-shell {
		width: min(1080px, 100%);
		margin: 24px auto 0;
		display: grid;
		gap: 24px;
	}

	.event-workspace-header {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
		gap: 20px;
		align-items: start;
	}

	.event-session-card,
	.event-form,
	.event-org-required,
	.event-context-card,
	.quick-create-modal {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
	}

	.event-eyebrow,
	.event-session-card h2,
	.event-assets-copy h2,
	.event-org-required h2,
	.event-context-card h2 {
		margin: 0;
	}

	.event-eyebrow {
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.event-workspace-header h1 {
		margin: 10px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		line-height: 1.05;
		letter-spacing: -0.05em;
	}

	.event-intro {
		max-width: 64ch;
		margin: 16px 0 0;
		color: var(--text-soft);
		line-height: 1.8;
	}

	.event-session-card p,
	.event-org-required p,
	.event-context-card p,
	.event-context-card em {
		margin: 10px 0 0;
		line-height: 1.7;
		color: var(--text-soft);
		font-style: normal;
	}

	.event-session-meta {
		margin-top: 18px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
	}

	.event-session-button,
	.event-submit,
	.event-asset-add,
	.event-asset-create,
	.quick-create-confirm,
	.event-duplicate-use {
		border: 1px solid transparent;
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
	}

	.event-session-button,
	.event-submit,
	.event-asset-add,
	.event-asset-create,
	.event-asset-remove,
	.quick-create-confirm,
	.quick-create-cancel,
	.event-duplicate-use {
		min-height: 44px;
		padding: 0 16px;
		border-radius: 16px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.event-session-button,
	.event-submit {
		margin-top: 18px;
	}

	.event-form {
		display: grid;
		gap: 24px;
	}

	.event-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.event-field {
		display: grid;
		gap: 8px;
	}

	.event-field-wide {
		grid-column: 1 / -1;
	}

	.event-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.event-field input,
	.event-field textarea,
	.event-field select {
		width: 100%;
		min-height: 48px;
		padding: 10px 14px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.event-field textarea {
		resize: vertical;
	}

	.event-field input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.event-field small,
	.event-assets-copy p,
	.event-session-empty {
		color: var(--text-soft);
		line-height: 1.6;
	}

	.event-field em,
	.event-assets-error {
		color: #c24e4e;
		font-style: normal;
	}

	.event-selected-chip-row {
		display: grid;
		gap: 8px;
	}

	.event-selected-chip-row span {
		font-size: 0.84rem;
		font-weight: 700;
		color: var(--text-soft);
	}

	.event-selected-chip {
		min-height: 44px;
		padding: 0 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--line));
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		display: inline-flex;
		align-items: center;
		gap: 10px;
		width: fit-content;
		max-width: 100%;
		font: inherit;
		cursor: pointer;
	}

	.event-selected-chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.event-selected-chip strong,
	.event-selected-chip small,
	.event-selected-chip b {
		display: inline-block;
	}

	.event-selected-chip strong {
		max-width: 28ch;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.event-selected-chip small {
		color: var(--text-soft);
	}

	.event-selected-chip b {
		font-size: 0.86rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.event-assets-card {
		padding: 22px;
		border: 1px solid color-mix(in srgb, var(--line) 90%, white);
		border-radius: 24px;
		background: color-mix(in srgb, var(--surface-strong) 74%, white);
		display: grid;
		gap: 18px;
	}

	.event-assets-copy p,
	.event-duplicate-card p {
		margin: 8px 0 0;
	}

	.event-assets-list {
		display: grid;
		gap: 16px;
	}

	.event-asset-row {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) auto;
		gap: 12px;
		align-items: end;
	}

	.event-asset-row-actions,
	.event-duplicate-actions,
	.quick-create-actions {
		display: grid;
		gap: 10px;
	}

	.event-asset-remove,
	.quick-create-cancel {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		color: var(--text-main);
	}

	.event-submit {
		min-width: 180px;
	}

	.event-actions {
		display: flex;
		justify-content: flex-end;
	}

	.quick-create-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.quick-create-modal {
		width: min(560px, 100%);
		position: relative;
		display: grid;
		gap: 16px;
	}

	.quick-create-modal h2,
	.quick-create-modal p,
	.event-duplicate-card h3 {
		margin: 0;
	}

	.quick-create-close {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		cursor: pointer;
	}

	.quick-create-close span {
		position: absolute;
		top: 17px;
		left: 8px;
		width: 18px;
		height: 2px;
		background: currentColor;
	}

	.quick-create-close span:first-child {
		transform: rotate(45deg);
	}

	.quick-create-close span:last-child {
		transform: rotate(-45deg);
	}

	.event-duplicate-card {
		padding: 18px;
		border: 1px solid color-mix(in srgb, var(--line) 84%, white);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.event-session-button:hover,
	.event-submit:hover,
	.event-asset-add:hover,
	.event-asset-create:hover,
	.quick-create-confirm:hover,
	.event-duplicate-use:hover {
		background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
	}

	.event-asset-remove:hover,
	.quick-create-cancel:hover {
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
	}

	.event-submit:disabled,
	.event-asset-add:disabled,
	.event-asset-create:disabled,
	.event-asset-remove:disabled,
	.quick-create-confirm:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	@media (max-width: 900px) {
		.event-workspace-header,
		.event-grid {
			grid-template-columns: 1fr;
		}

		.event-asset-row {
			grid-template-columns: 1fr;
		}

		.event-actions {
			justify-content: stretch;
		}

		.event-submit {
			width: 100%;
		}
	}

	@media (max-width: 720px) {
		.event-session-card,
		.event-form,
		.event-org-required,
		.event-context-card,
		.quick-create-modal {
			padding: 22px;
			border-radius: 22px;
		}
	}
</style>
