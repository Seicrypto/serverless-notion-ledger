<script lang="ts">
	import { onMount } from 'svelte';

	import SettlementEventPickerSection from './SettlementEventPickerSection.svelte';
	import SettlementFormSection from './SettlementFormSection.svelte';
	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { ensureMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import {
		ensureOrganizationManageCache,
		type OrganizationManageCharacter,
		type OrganizationManageSummary,
	} from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import { getLatestActiveOrganization, readPreferredOrganization, writePreferredOrganization } from '../../../libs/ledger/workspace-preferences.ts';
	import { calculateSettlementNetAmount, parseAmountValue } from '../../../libs/ledger/settlement-amounts.ts';
	import { getOrganizationReference, resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import { devDebugError, devDebugLog } from '../../../libs/runtime/dev-debug.ts';
	import {
		recordRecentSettlementCreation,
	} from '../../../libs/settlements/recent-settlement-creations.ts';
	import {
		readSettlementDefaultsCache,
		writeSettlementDefaultsCache,
	} from '../../../libs/settlements/settlement-defaults-cache.ts';
	import type {
		CreateLedgerSettlementRequest,
		LedgerEventDetail,
		LedgerEventListItem,
		LedgerSettlementDefaultsResponse,
		SettleLedgerEventRequest,
	} from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
		contextTitle: string;
		contextBody: string;
		contextSelectLabel: string;
		contextSelectPlaceholder: string;
		contextSelectEmpty: string;
		gameSelectLabel: string;
		gameSelectPlaceholder: string;
		gameSelectEmpty: string;
		noOrganizationsTitle: string;
		noOrganizationsBody: string;
		noOrganizationsActionLabel: string;
		eventSectionTitle: string;
		eventSectionBody: string;
		eventLoadingLabel: string;
		eventEmptyTitle: string;
		eventEmptyBody: string;
		eventEmptyActionLabel: string;
		eventEmptyRefreshHint: string;
		eventRefreshLabel: string;
		eventFilterFromLabel: string;
		eventFilterToLabel: string;
		eventFilterApplyLabel: string;
		eventPagePreviousLabel: string;
		eventPageNextLabel: string;
		eventPageSummaryLabel: string;
		eventPageSizeLabel: string;
		eventTableNameLabel: string;
		eventTableOccurredAtLabel: string;
		eventTableHolderLabel: string;
		eventTableAssetLabel: string;
		eventTableActionLabel: string;
		eventTablePickLabel: string;
		eventTablePickPendingLabel: string;
		eventTablePickedLabel: string;
		formReadyTitle: string;
		formReadyBody: string;
		formLoadingLabel: string;
		formContextEventLabel: string;
		formContextGameLabel: string;
		formContextAssetLabel: string;
		formContextHolderLabel: string;
		formTitleLabel: string;
		formTitlePlaceholder: string;
		formDecidedAtLabel: string;
		formAmountLabel: string;
		formGrossAmountLabel: string;
		formNetAmountLabel: string;
		formFeeRuleSectionLabel: string;
		formFeeRuleToggleLabel: string;
		formFeeRuleHideLabel: string;
		formFeePercentLabel: string;
		formFeeAmountLabel: string;
		formFeeRuleKeyLabel: string;
		formFeeRuleKeyPlaceholder: string;
		formPayerTypeLabel: string;
		formPayerRefLabel: string;
		formPayerRefPlaceholder: string;
		formPayerRefEmpty: string;
		formPayerRefHint: string;
		formPayerRefUnclaimedMeta: string;
		formPayerRefSelectedLabel: string;
		formPayerRefAddLabel: string;
		formPayerRefChangeLabel: string;
		formRecipientsLabel: string;
		formRecipientsPlaceholder: string;
		formRecipientsEmpty: string;
		formRecipientsHint: string;
		formRecipientsSelectedLabel: string;
		formRecipientsAddLabel: string;
		formRecipientsMismatchWarning: string;
		formRecipientsMismatchError: string;
		clearSelectionLabel: string;
		formSettlementTypeLabel: string;
		formAllocationModeLabel: string;
		formNotesLabel: string;
		formNotesPlaceholder: string;
		formAutoNetHint: string;
		submitLabel: string;
		requiredHint: string;
		optionalHint: string;
		validationRequired: string;
		validationNumber: string;
		validationDate: string;
		settlementTypeSale: string;
		settlementTypeBonus: string;
		settlementTypeSalary: string;
		settlementTypeReward: string;
		settlementTypeSubsidy: string;
		settlementTypeAdjustment: string;
		payerTypeCharacter: string;
		payerTypeOrgTreasury: string;
		payerTypeExternal: string;
		payerTypeCustom: string;
		allocationModeEqual: string;
		allocationModeWeight: string;
		allocationModeManual: string;
		feeModeNone: string;
		feeModePercent: string;
		feeModeFixed: string;
		feeModeRule: string;
		loadingCreateTitle: string;
		loadingCreateBody: string;
		errorCreateTitle: string;
		errorTimeoutBody: string;
		errorRetryLabel: string;
		successCreateTitle: string;
		successCreateBody: string;
		successCloseLabel: string;
	}

	type SettlementType = NonNullable<CreateLedgerSettlementRequest['settlementType']>;
	type PayerType = NonNullable<CreateLedgerSettlementRequest['payerType']>;
	type AllocationMode = NonNullable<CreateLedgerSettlementRequest['allocationMode']>;
	type FeeMode = NonNullable<CreateLedgerSettlementRequest['feeMode']>;
	type WorkspaceRole = 'owner' | 'admin' | 'member';

	const CREATE_TIMEOUT_MS = 20000;
	const FETCH_EVENT_BATCH_LIMIT = 100;
	const DEFAULT_EVENT_PAGE_LIMIT = 5;
	const DEFAULT_EVENT_LOOKBACK_DAYS = 7;

	export let lang: string;
	export let organization: string | null = null;
	export let eventId: number | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let organizations: OrganizationCardResponse[] = [];
	let organizationSummary: OrganizationManageSummary | null = null;
	let organizationCharacters: OrganizationManageCharacter[] = [];
	let currentWorkspaceRole: WorkspaceRole | null = null;

	let allEvents: LedgerEventListItem[] = [];
	let eventDetailsById: Record<string, LedgerEventDetail> = {};
	let hydratingEventIds = new Set<number>();
	let eventsLoading = false;
	let eventsError = '';
	let hasAnyEvents = false;
	let pageSize = DEFAULT_EVENT_PAGE_LIMIT;
	let currentPage = 1;
	let eventQueryFromDate = '';
	let eventQueryToDate = '';
	let selectedGameId = '';
	let selectedEventId = '';
	let selectedEvent: LedgerEventDetail | null = null;
	let selectedEventLoading = false;
	let selectedEventError = '';
	let pendingPickEventId: number | null = null;
	let initialEventIdPending: number | null = null;

	let settlementDefaultsByGameId: Record<string, LedgerSettlementDefaultsResponse> = {};
	let defaultsLoadingGameId = '';

	let title = '';
	let decidedAt = '';
	let grossAmount = '';
	let netAmount = '';
	let feeMode: FeeMode = 'none';
	let feePercent = '';
	let feeAmount = '';
	let feeRuleKey = '';
	let payerType: PayerType = 'character';
	let payerRef = '';
	let payerCharacterId = '';
	let recipientCharacterIds: string[] = [];
	let eventParticipantCharacterIds: string[] = [];
	let settlementType: SettlementType = 'sale';
	let allocationMode: AllocationMode = 'equal';
	let notes = '';

	let errors: Record<string, string> = {};
	let isSubmitting = false;

	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; href?: string; onClick?: () => void } | null = null;
	let dialogSecondaryAction: { label: string; href?: string; onClick?: () => void } | null = null;

	function findOrganizationByReference(reference: string) {
		return organizations.find((entry) => getOrganizationReference(entry) === reference) ?? null;
	}

	function toLocalDateTimeValue(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		const hours = `${date.getHours()}`.padStart(2, '0');
		const minutes = `${date.getMinutes()}`.padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function toDateInputValue(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function getDefaultEventRange() {
		const today = new Date();
		const start = new Date(today);
		start.setDate(today.getDate() - (DEFAULT_EVENT_LOOKBACK_DAYS - 1));
		return {
			from: toDateInputValue(start),
			to: toDateInputValue(today),
		};
	}

	function toRangeStartIso(value: string) {
		return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
	}

	function toRangeEndIso(value: string) {
		return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
	}

	function parsePositiveNumber(value: string | number | null | undefined) {
		return parseAmountValue(value);
	}

	function hasNonEmptyValue(value: string | number | null | undefined) {
		if (value === null || value === undefined) {
			return false;
		}

		return typeof value === 'number' ? Number.isFinite(value) : value.trim().length > 0;
	}

	function openLoginDialog() {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.authRequiredTitle;
		dialogMessage = labels.authRequiredBody;
		dialogPrimaryAction = { label: labels.loginLabel, href: `/${lang}/login` };
		dialogSecondaryAction = { label: labels.homeLabel, href: `/${lang}/` };
	}

	function openNoOrganizationsDialog() {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.noOrganizationsTitle;
		dialogMessage = labels.noOrganizationsBody;
		dialogPrimaryAction = { label: labels.noOrganizationsActionLabel, href: `/${lang}/guilds` };
		dialogSecondaryAction = { label: labels.homeLabel, href: `/${lang}/` };
	}

	function openPendingDialog() {
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.loadingCreateTitle;
		dialogMessage = labels.loadingCreateBody;
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

	function openSuccessDialog() {
		dialogOpen = true;
		dialogState = 'success';
		dialogTitle = labels.successCreateTitle;
		dialogMessage = labels.successCreateBody;
		dialogPrimaryAction = {
			label: labels.successCloseLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
		dialogSecondaryAction = null;
	}

	function resetFormState() {
		title = '';
		grossAmount = '';
		netAmount = '';
		feeMode = 'none';
		feePercent = '';
		feeAmount = '';
		feeRuleKey = '';
		payerType = 'character';
		payerRef = '';
		payerCharacterId = '';
		recipientCharacterIds = [];
		eventParticipantCharacterIds = [];
		settlementType = 'sale';
		allocationMode = 'equal';
		notes = '';
		errors = {};
	}

	function resetSelectedEventState() {
		selectedEventId = '';
		selectedEvent = null;
		selectedEventLoading = false;
		selectedEventError = '';
		pendingPickEventId = null;
		resetFormState();
	}

	function resetWorkspaceState() {
		organizationSummary = null;
		organizationCharacters = [];
		currentWorkspaceRole = null;
		allEvents = [];
		eventDetailsById = {};
		hydratingEventIds = new Set<number>();
		eventsLoading = false;
		eventsError = '';
		hasAnyEvents = false;
		pageSize = DEFAULT_EVENT_PAGE_LIMIT;
		currentPage = 1;
		selectedGameId = '';
		settlementDefaultsByGameId = {};
		defaultsLoadingGameId = '';
		resetSelectedEventState();
	}

	function getPrimaryGameId(summary: OrganizationManageSummary | null) {
		const primaryGame = summary?.games.find((game) => game.primary) ?? summary?.games[0];
		return primaryGame ? String(primaryGame.gameId) : '';
	}

	function syncUrl() {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		const url = new URL(window.location.href);
		url.searchParams.set('orgVanity', organization);
		if (selectedEventId) {
			url.searchParams.set('eventId', selectedEventId);
		} else {
			url.searchParams.delete('eventId');
		}
		window.history.replaceState({}, '', url);
	}

	function formatDateTime(value: string) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	function getCharacterById(characterId: string) {
		return organizationCharacters.find((character) => String(character.id) === characterId) ?? null;
	}

	function getCharacterMetaLabel(character: OrganizationManageCharacter) {
		return character.claimedBy?.displayName ?? labels.formPayerRefUnclaimedMeta;
	}

	function syncPayerFromCharacterId(characterId: string) {
		payerCharacterId = characterId;
		payerRef = getCharacterById(characterId)?.name ?? '';
	}

	function setRecipients(characterIds: string[]) {
		eventParticipantCharacterIds = [...characterIds];
		recipientCharacterIds = [...characterIds];
	}

	function addRecipientCharacterId(characterId: string) {
		if (!characterId || recipientCharacterIds.includes(characterId)) {
			return;
		}

		recipientCharacterIds = [...recipientCharacterIds, characterId];
	}

	function removeRecipientCharacterId(characterId: string) {
		recipientCharacterIds = recipientCharacterIds.filter((value) => value !== characterId);
	}

	function haveSameCharacterSelection(left: string[], right: string[]) {
		if (left.length !== right.length) {
			return false;
		}

		const leftSorted = [...left].sort();
		const rightSorted = [...right].sort();
		return leftSorted.every((value, index) => value === rightSorted[index]);
	}

	function mapEventHolderToPayerType(event: LedgerEventDetail): PayerType {
		switch (event.holder.type) {
			case 'character':
				return 'character';
			case 'org_treasury':
				return 'org_treasury';
			case 'custom':
				return 'custom';
			default:
				return 'external';
		}
	}

	function parseStructuredApiError(error: unknown) {
		if (!(error instanceof Error)) {
			return null;
		}

		try {
			return JSON.parse(error.message) as {
				code?: string;
				error?: string;
				message?: string;
			};
		} catch {
			return null;
		}
	}

	function getDefaultPayerCharacterId(gameId: number, detail: LedgerEventDetail | null) {
		if (
			currentWorkspaceRole === 'member' &&
			isAuthenticatedSession(session)
		) {
			const ownedCharacter = organizationCharacters.find(
				(character) =>
					character.gameId === gameId &&
					character.claimedBy?.userId === session.user.id,
			);
			if (ownedCharacter) {
				return String(ownedCharacter.id);
			}
		}

		if (detail?.holder.type === 'character' && detail.holder.character?.id) {
			return String(detail.holder.character.id);
		}

		return String(
			organizationCharacters.find((character) => character.gameId === gameId)?.id ?? '',
		);
	}

	async function ensureSettlementDefaultsForGame(gameId: string) {
		if (!organization || !gameId) {
			return null;
		}

		if (settlementDefaultsByGameId[gameId]) {
			return settlementDefaultsByGameId[gameId];
		}

		defaultsLoadingGameId = gameId;

		try {
			if (typeof window !== 'undefined') {
				const cached = readSettlementDefaultsCache(
					window.sessionStorage,
					organization,
					Number(gameId),
				);
				if (cached) {
					settlementDefaultsByGameId = {
						...settlementDefaultsByGameId,
						[gameId]: cached,
					};
					return cached;
				}
			}

			const response = await getApiAdapter().getOrganizationLedgerSettlementDefaults(organization, {
				gameId: Number(gameId),
			});
			if (typeof window !== 'undefined') {
				writeSettlementDefaultsCache(window.sessionStorage, organization, response, Number(gameId));
			}
			settlementDefaultsByGameId = {
				...settlementDefaultsByGameId,
				[gameId]: response,
			};
			return response;
		} catch (error) {
			devDebugError('settlements.defaults', 'Failed to load settlement defaults', {
				organization,
				gameId,
				error,
			});
			return null;
		} finally {
			if (defaultsLoadingGameId === gameId) {
				defaultsLoadingGameId = '';
			}
		}
	}

	function seedFormFromEvent(detail: LedgerEventDetail, defaults: LedgerSettlementDefaultsResponse | null) {
		title = `${detail.title} settlement`;
		payerType = mapEventHolderToPayerType(detail);
		payerRef = detail.holder.ref ?? '';
		payerCharacterId = '';
		const participantIds = (detail.recommendedRecipientCharacterIds.length
			? detail.recommendedRecipientCharacterIds
			: detail.participantCharacterIds
		).map((characterId) => String(characterId));
		setRecipients(participantIds);
		settlementType = 'sale';

		if (defaults) {
			feeMode = defaults.defaults.defaultFeeMode;
			allocationMode = defaults.defaults.defaultAllocationMode;
		} else {
			feeMode = 'none';
			allocationMode = 'equal';
		}

		feePercent = '';
		feeAmount = '';
		feeRuleKey = '';
		grossAmount = '';
		netAmount = calculateSettlementNetAmount({
			grossAmount,
			feeMode,
			feePercent,
			feeAmount,
		});

		if (payerType === 'character') {
			syncPayerFromCharacterId(getDefaultPayerCharacterId(detail.game.id, detail));
		}
	}

	async function hydrateVisibleEventDetails() {
		if (!organization || visibleEvents.length === 0) {
			return;
		}

		const targets = visibleEvents.filter(
			(event) => !eventDetailsById[String(event.id)] && !hydratingEventIds.has(event.id),
		);
		if (!targets.length) {
			return;
		}

		hydratingEventIds = new Set([...hydratingEventIds, ...targets.map((event) => event.id)]);

		const results = await Promise.allSettled(
			targets.map((event) => getApiAdapter().getOrganizationLedgerEvent(organization as string, event.id)),
		);

		let nextDetails = eventDetailsById;
		const nextLoadingIds = new Set(hydratingEventIds);

		results.forEach((result, index) => {
			const event = targets[index];
			nextLoadingIds.delete(event.id);
			if (result.status === 'fulfilled') {
				nextDetails = {
					...nextDetails,
					[String(event.id)]: result.value.event,
				};
			}
		});

		eventDetailsById = nextDetails;
		hydratingEventIds = nextLoadingIds;
	}

	async function loadEvents() {
		if (!organization) {
			return;
		}

		eventsLoading = true;
		eventsError = '';

		try {
			const [allEventsResponse, filteredResponse] = await Promise.all([
				getApiAdapter().listOrganizationLedgerEvents(organization, {
					limit: 1,
					sortBy: 'occurredAt',
					sortOrder: 'desc',
				}),
				getApiAdapter().listOrganizationLedgerEvents(organization, {
					statusGroup: 'unsettled',
					fromOccurredAt: toRangeStartIso(eventQueryFromDate),
					toOccurredAt: toRangeEndIso(eventQueryToDate),
					include: 'participants_summary',
					limit: FETCH_EVENT_BATCH_LIMIT,
					sortBy: 'occurredAt',
					sortOrder: 'desc',
				}),
			]);
			hasAnyEvents = allEventsResponse.events.length > 0;
			allEvents = filteredResponse.events;
			currentPage = 1;
			if (selectedEventId && !filteredEvents.some((event) => String(event.id) === selectedEventId)) {
				resetSelectedEventState();
			}
			await hydrateVisibleEventDetails();
			if (initialEventIdPending && filteredEvents.some((event) => event.id === initialEventIdPending)) {
				const nextEventId = initialEventIdPending;
				initialEventIdPending = null;
				void pickEvent(nextEventId);
			}
		} catch (error) {
			eventsError = getErrorMessage(error, labels.errorCreateTitle);
			hasAnyEvents = false;
			allEvents = [];
		} finally {
			eventsLoading = false;
		}
	}

	async function loadOrganizationContext() {
		const normalizedOrganization = resolveOrganizationQuery(organization);
		session = await ensureAuthSession();
		if (!isAuthenticatedSession(session)) {
			organization = normalizedOrganization;
			openLoginDialog();
			return;
		}

		const snapshot = await ensureMyOrganizationsCache();
		organizations = snapshot.organizations;
		if (!organizations.length) {
			organization = normalizedOrganization;
			openNoOrganizationsDialog();
			return;
		}

		const recentOrganization =
			typeof window !== 'undefined'
				? getLatestActiveOrganization(window.localStorage, window.sessionStorage)
				: null;
		const preferredOrganization =
			typeof window !== 'undefined' ? readPreferredOrganization(window.localStorage) : null;
		const nextOrganization =
			(normalizedOrganization && findOrganizationByReference(normalizedOrganization)
				? normalizedOrganization
				: null) ||
			(recentOrganization && findOrganizationByReference(recentOrganization) ? recentOrganization : null) ||
			(preferredOrganization && findOrganizationByReference(preferredOrganization)
				? preferredOrganization
				: null) ||
			getOrganizationReference(organizations[0]);

		await changeOrganization(nextOrganization);
	}

	async function changeOrganization(nextOrganization: string) {
		if (!nextOrganization) {
			return;
		}

		organization = nextOrganization;
		resetWorkspaceState();
		if (typeof window !== 'undefined') {
			writePreferredOrganization(window.localStorage, nextOrganization);
		}

		const manageSnapshot = await ensureOrganizationManageCache(nextOrganization);
		organizationSummary = manageSnapshot.organization;
		organizationCharacters = manageSnapshot.characters;
		currentWorkspaceRole =
			findOrganizationByReference(nextOrganization)?.membership.role ?? null;
		selectedGameId = getPrimaryGameId(manageSnapshot.organization);
		syncUrl();

		if (selectedGameId) {
			void ensureSettlementDefaultsForGame(selectedGameId);
		}

		await loadEvents();
	}

	function handleOrganizationChange(event: CustomEvent<{ value: string }>) {
		if (event.detail.value === organization) {
			return;
		}

		void changeOrganization(event.detail.value);
	}

	function handleGameChange(event: CustomEvent<{ value: string }>) {
		if (event.detail.value === selectedGameId) {
			return;
		}

		selectedGameId = event.detail.value;
		currentPage = 1;
		resetSelectedEventState();
		if (selectedGameId) {
			void ensureSettlementDefaultsForGame(selectedGameId);
		}
		void hydrateVisibleEventDetails();
	}

	function handleEventRangeChange(event: CustomEvent<{ start: string; end: string }>) {
		eventQueryFromDate = event.detail.start;
		eventQueryToDate = event.detail.end;
	}

	function applyEventFilters() {
		resetSelectedEventState();
		void loadEvents();
	}

	function handlePageSizeChange(event: CustomEvent<{ value: number }>) {
		pageSize = event.detail.value;
		currentPage = 1;
		void hydrateVisibleEventDetails();
	}

	function loadPreviousEventPage() {
		if (currentPage <= 1) {
			return;
		}

		currentPage -= 1;
		void hydrateVisibleEventDetails();
	}

	function loadNextEventPage() {
		if (currentPage >= totalPages) {
			return;
		}

		currentPage += 1;
		void hydrateVisibleEventDetails();
	}

	async function pickEvent(nextEventId: number) {
		if (!organization || pendingPickEventId !== null) {
			return;
		}

		const summary = filteredEvents.find((event) => event.id === nextEventId) ?? allEvents.find((event) => event.id === nextEventId);
		if (!summary) {
			return;
		}

		pendingPickEventId = nextEventId;
		selectedEventLoading = true;
		selectedEventError = '';
		resetFormState();

		try {
			const gameId =
				typeof summary.gameId === 'number' && Number.isFinite(summary.gameId)
					? String(summary.gameId)
					: selectedGameId;
			const [eventResponse, defaults] = await Promise.all([
				getApiAdapter().getOrganizationLedgerEvent(organization, nextEventId),
				ensureSettlementDefaultsForGame(gameId),
			]);

			selectedEvent = eventResponse.event;
			selectedEventId = String(nextEventId);
			selectedGameId = String(eventResponse.event.game.id);
			eventDetailsById = {
				...eventDetailsById,
				[selectedEventId]: eventResponse.event,
			};
			seedFormFromEvent(eventResponse.event, defaults);
			syncUrl();
		} catch (error) {
			selectedEventError = getErrorMessage(error, labels.errorCreateTitle);
			devDebugError('settlements.pick', 'Failed to load settlement event detail', {
				organization,
				eventId: nextEventId,
				error,
			});
		} finally {
			pendingPickEventId = null;
			selectedEventLoading = false;
		}
	}

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!organization) {
			nextErrors.organization = labels.validationRequired;
		}

		if (!selectedEvent) {
			nextErrors.eventId = labels.validationRequired;
		}

		if (payerType === 'character' && !payerCharacterId) {
			nextErrors.payerRef = labels.validationRequired;
		}

		if (recipientCharacterIds.length === 0) {
			nextErrors.recipientCharacterIds = labels.validationRequired;
		} else if (!haveSameCharacterSelection(recipientCharacterIds, eventParticipantCharacterIds)) {
			nextErrors.recipientCharacterIds = labels.formRecipientsMismatchError;
		}

		if (!title.trim()) {
			nextErrors.title = labels.validationRequired;
		}

		if (!decidedAt.trim()) {
			nextErrors.decidedAt = labels.validationRequired;
		} else if (!Number.isFinite(new Date(decidedAt).getTime())) {
			nextErrors.decidedAt = labels.validationDate;
		}

		const gross = parsePositiveNumber(grossAmount);
		if (gross === null || Number.isNaN(gross)) {
			nextErrors.grossAmount = labels.validationNumber;
		}

		const net = parsePositiveNumber(netAmount);
		if (net === null || Number.isNaN(net)) {
			nextErrors.netAmount = labels.validationNumber;
		}

		if (feeMode === 'percent') {
			const percent = parsePositiveNumber(feePercent);
			if (percent === null || Number.isNaN(percent)) {
				nextErrors.feePercent = labels.validationNumber;
			}
		}

		if (feeMode === 'fixed' || feeMode === 'rule') {
			const fee = parsePositiveNumber(feeAmount);
			if (fee === null || Number.isNaN(fee)) {
				nextErrors.feeAmount = labels.validationNumber;
			}
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function handleAmountEditorChange(
		event: CustomEvent<{
			grossAmount: string;
			netAmount: string;
			feeMode: FeeMode;
			feePercent: string;
			feeAmount: string;
			feeRuleKey: string;
		}>,
	) {
		grossAmount = event.detail.grossAmount;
		netAmount = event.detail.netAmount;
		feeMode = event.detail.feeMode;
		feePercent = event.detail.feePercent;
		feeAmount = event.detail.feeAmount;
		feeRuleKey = event.detail.feeRuleKey;
	}

	async function submit() {
		if (isSubmitting || !validate() || !organization || !selectedEvent) {
			return;
		}

		const recipientIds = recipientCharacterIds
			.map((characterId) => Number(characterId))
			.filter((characterId) => Number.isFinite(characterId));

		const payload: SettleLedgerEventRequest = {
			title: title.trim(),
			decidedAt: new Date(decidedAt).toISOString(),
			grossAmount: Number(grossAmount),
			netAmount: Number(netAmount),
			feeMode,
			allocationMode,
			payerType,
			settlementType,
			recipientCharacterIds: recipientIds,
			recipients: recipientIds.map((characterId) => ({ characterId })),
		};

		if (notes.trim()) {
			payload.notes = notes.trim();
		}
		if (payerRef.trim()) {
			payload.payerRef = payerRef.trim();
		}
		if (feeMode === 'percent' && hasNonEmptyValue(feePercent)) {
			payload.feePercent = Number(feePercent);
		}
		if ((feeMode === 'fixed' || feeMode === 'rule') && hasNonEmptyValue(feeAmount)) {
			payload.feeAmount = Number(feeAmount);
		}
		if (feeMode === 'rule' && feeRuleKey.trim()) {
			payload.feeRuleKey = feeRuleKey.trim();
		}

		isSubmitting = true;
		openPendingDialog();

		let timedOut = false;
		const timeoutId = window.setTimeout(() => {
			timedOut = true;
			openErrorDialog(labels.errorTimeoutBody);
		}, CREATE_TIMEOUT_MS);

		try {
			devDebugLog('settlements.submit', 'Submitting high-level settle payload', {
				organization,
				eventId: selectedEvent.id,
				payload,
			});
			const response = await getApiAdapter().settleOrganizationLedgerEvent(
				organization,
				selectedEvent.id,
				payload,
			);
			devDebugLog('settlements.submit', 'Received high-level settle response', {
				organization,
				eventId: selectedEvent.id,
				response,
			});
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			if (typeof window !== 'undefined') {
				recordRecentSettlementCreation(window.sessionStorage, organization, {
					title: payload.title,
					decidedAt: payload.decidedAt,
					eventId: selectedEvent.id,
					grossAmount: payload.grossAmount,
					netAmount: payload.netAmount,
					feeMode: payload.feeMode,
					allocationMode: payload.allocationMode,
					payerType: payload.payerType,
					settlementType: payload.settlementType,
					recipientCharacterIds: payload.recipientCharacterIds,
					payerRef: payload.payerRef,
					notes: payload.notes,
					feePercent: payload.feePercent,
					feeAmount: payload.feeAmount,
					feeRuleKey: payload.feeRuleKey,
				});
			}

			allEvents = allEvents.filter((event) => event.id !== selectedEvent.id);
			resetSelectedEventState();
			syncUrl();
			openSuccessDialog();
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			devDebugError('settlements.submit', 'Settlement submission failed', {
				organization,
				selectedEventId: selectedEvent.id,
				payload,
				error,
			});
			const structuredError = parseStructuredApiError(error);
			if (structuredError?.code === 'SETTLEMENT_PARTICIPANT_CONFIRMATION_REQUIRED') {
				openErrorDialog(labels.formRecipientsMismatchError);
			} else {
				openErrorDialog(getErrorMessage(error, labels.errorCreateTitle));
			}
		} finally {
			isSubmitting = false;
		}
	}

	$: selectedOrganizationCard = organization ? findOrganizationByReference(organization) : null;
	$: currentWorkspaceRole = selectedOrganizationCard?.membership.role ?? currentWorkspaceRole;
	$: organizationOptions = organizations.map((entry) => ({
		value: getOrganizationReference(entry),
		label: entry.name,
		metaLabel: entry.vanity ? `@${entry.vanity}` : `${entry.stats.memberCount} members`,
		iconUrl: entry.iconUrl,
	}));
	$: games = organizationSummary?.games.map((game) => ({
		id: game.gameId,
		name: game.displayName ?? game.name,
		iconUrl: game.iconUrl,
		resolvedIconUrl: game.resolvedIconUrl,
		officialSiteUrl: game.officialSiteUrl,
		primary: game.primary,
	})) ?? [];
	$: gameOptions = games.map((game) => ({
		value: String(game.id),
		label: game.name,
		iconUrl: game.iconUrl,
		resolvedIconUrl: game.resolvedIconUrl,
		officialSiteUrl: game.officialSiteUrl,
	}));
	$: filteredEvents = allEvents.filter((event) =>
		selectedGameId ? String(event.gameId ?? '') === selectedGameId : true,
	);
	$: totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
	$: if (currentPage > totalPages) {
		currentPage = totalPages;
	}
	$: visibleEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
	$: eventRows = visibleEvents.map((event) => {
		const detail = eventDetailsById[String(event.id)];
		const holderLabel =
			detail?.holder.character?.name ??
			detail?.holder.ref ??
			(typeof event.holderRef === 'string' ? event.holderRef : event.holderType);
		const assetLabel =
			detail?.asset.name ??
			(typeof event.assetId === 'number' ? `Asset #${event.assetId}` : '—');
		return {
			id: event.id,
			title: event.title,
			occurredAtLabel: formatDateTime(event.occurredAt),
			holderLabel,
			assetLabel,
			isPicked: String(event.id) === selectedEventId,
			isPending: pendingPickEventId === event.id,
		};
	});
	$: selectedPayerCharacter = getCharacterById(payerCharacterId);
	$: selectedRecipientCharacters = recipientCharacterIds
		.map((characterId) => getCharacterById(characterId))
		.filter((character): character is OrganizationManageCharacter => Boolean(character));
	$: payerCharacterOptions = organizationCharacters
		.filter((character) => String(character.gameId ?? '') === selectedGameId)
		.map((character) => ({
			value: String(character.id),
			label: character.name,
			metaLabel: getCharacterMetaLabel(character),
		}));
	$: recipientCharacterOptions = organizationCharacters
		.filter((character) => String(character.gameId ?? '') === selectedGameId)
		.filter((character) => !recipientCharacterIds.includes(String(character.id)))
		.map((character) => ({
			value: String(character.id),
			label: character.name,
			metaLabel: getCharacterMetaLabel(character),
		}));
	$: hasRecipientMismatch = !haveSameCharacterSelection(
		recipientCharacterIds,
		eventParticipantCharacterIds,
	);
	$: isMemberRestrictedPayerSelection = currentWorkspaceRole === 'member';
	$: selectedGameName =
		games.find((game) => String(game.id) === selectedGameId)?.name ??
		selectedEvent?.game.name ??
		'';
	$: selectedAssetName = selectedEvent?.asset.name ?? '';
	$: selectedHolderLabel =
		selectedEvent?.holder.character?.name ??
		selectedEvent?.holder.ref ??
		selectedEvent?.holder.type ??
		'';
	$: if (selectedGameId && !settlementDefaultsByGameId[selectedGameId] && !defaultsLoadingGameId) {
		void ensureSettlementDefaultsForGame(selectedGameId);
	}
	$: if (visibleEvents.length > 0) {
		void hydrateVisibleEventDetails();
	}
	$: if (payerType === 'character' && isMemberRestrictedPayerSelection && selectedEvent) {
		const restrictedCharacterId = getDefaultPayerCharacterId(selectedEvent.game.id, selectedEvent);
		if (restrictedCharacterId && payerCharacterId !== restrictedCharacterId) {
			syncPayerFromCharacterId(restrictedCharacterId);
		}
	}

	onMount(() => {
		organization = resolveOrganizationQuery(organization);
		initialEventIdPending = eventId;
		decidedAt = toLocalDateTimeValue(new Date());
		const defaultRange = getDefaultEventRange();
		eventQueryFromDate = defaultRange.from;
		eventQueryToDate = defaultRange.to;
		void loadOrganizationContext();
	});
</script>

<section class="settlement-shell">
	<div class="settlement-header">
		<p class="settlement-eyebrow">{labels.eyebrow}</p>
		<h1>{labels.title}</h1>
		<p class="settlement-intro">{labels.intro}</p>
	</div>

	{#if !organization && organizations.length === 0}
		<section class="settlement-card">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</section>
	{:else}
		<SettlementEventPickerSection
			lang={lang}
			organization={organization ?? ''}
			organizationName={selectedOrganizationCard?.name ?? ''}
			organizationOptions={organizationOptions}
			gameId={selectedGameId}
			gameOptions={gameOptions}
			rangeStart={eventQueryFromDate}
			rangeEnd={eventQueryToDate}
			eventsLoading={eventsLoading}
			eventsError={eventsError}
			hasAnyEvents={hasAnyEvents}
			eventRows={eventRows}
			page={currentPage}
			pageSize={pageSize}
			hasPreviousPage={currentPage > 1}
			hasNextPage={currentPage < totalPages}
			pendingPickEventId={pendingPickEventId}
			labels={{
				contextTitle: labels.contextTitle,
				contextBody: labels.contextBody,
				contextSelectLabel: labels.contextSelectLabel,
				contextSelectPlaceholder: labels.contextSelectPlaceholder,
				contextSelectEmpty: labels.contextSelectEmpty,
				gameSelectLabel: labels.gameSelectLabel,
				gameSelectPlaceholder: labels.gameSelectPlaceholder,
				gameSelectEmpty: labels.gameSelectEmpty,
				eventSectionTitle: labels.eventSectionTitle,
				eventSectionBody: labels.eventSectionBody,
				eventRefreshLabel: labels.eventRefreshLabel,
				eventFilterFromLabel: labels.eventFilterFromLabel,
				eventFilterToLabel: labels.eventFilterToLabel,
				eventFilterApplyLabel: labels.eventFilterApplyLabel,
				eventLoadingLabel: labels.eventLoadingLabel,
				eventEmptyTitle: labels.eventEmptyTitle,
				eventEmptyBody: labels.eventEmptyBody,
				eventEmptyActionLabel: labels.eventEmptyActionLabel,
				eventEmptyRefreshHint: labels.eventEmptyRefreshHint,
				eventPagePreviousLabel: labels.eventPagePreviousLabel,
				eventPageNextLabel: labels.eventPageNextLabel,
				eventPageSummaryLabel: labels.eventPageSummaryLabel,
				eventPageSizeLabel: labels.eventPageSizeLabel,
				eventTableNameLabel: labels.eventTableNameLabel,
				eventTableOccurredAtLabel: labels.eventTableOccurredAtLabel,
				eventTableHolderLabel: labels.eventTableHolderLabel,
				eventTableAssetLabel: labels.eventTableAssetLabel,
				eventTableActionLabel: labels.eventTableActionLabel,
				eventTablePickLabel: labels.eventTablePickLabel,
				eventTablePickPendingLabel: labels.eventTablePickPendingLabel,
				eventTablePickedLabel: labels.eventTablePickedLabel,
				optionalHint: labels.optionalHint,
			}}
			on:change={handleOrganizationChange}
			on:gamechange={handleGameChange}
			on:rangechange={handleEventRangeChange}
			on:applyfilters={applyEventFilters}
			on:refresh={() => void loadEvents()}
			on:pagesizechange={handlePageSizeChange}
			on:previouspage={loadPreviousEventPage}
			on:nextpage={loadNextEventPage}
			on:pick={(event) => void pickEvent(event.detail.eventId)}
		/>

		{#if selectedEventError}
			<section class="settlement-card">
				<p class="error-text">{selectedEventError}</p>
			</section>
		{/if}

		<SettlementFormSection
			selectedEvent={selectedEvent}
			selectedGameName={selectedGameName}
			selectedAssetName={selectedAssetName}
			selectedHolderLabel={selectedHolderLabel}
			loading={selectedEventLoading || defaultsLoadingGameId === selectedGameId}
			submitting={isSubmitting}
			title={title}
			decidedAt={decidedAt}
			settlementType={settlementType}
			grossAmount={grossAmount}
			netAmount={netAmount}
			feeMode={feeMode}
			feePercent={feePercent}
			feeAmount={feeAmount}
			feeRuleKey={feeRuleKey}
			payerType={payerType}
			payerRef={payerRef}
			payerCharacterId={payerCharacterId}
			selectedPayerCharacter={selectedPayerCharacter}
			payerCharacterOptions={payerCharacterOptions}
			selectedRecipientCharacters={selectedRecipientCharacters}
			recipientCharacterOptions={recipientCharacterOptions}
			hasRecipientMismatch={hasRecipientMismatch}
			allocationMode={allocationMode}
			notes={notes}
			errors={errors}
			isMemberRestrictedPayerSelection={isMemberRestrictedPayerSelection}
			labels={{
				formReadyTitle: labels.formReadyTitle,
				formReadyBody: labels.formReadyBody,
				formLoadingLabel: labels.formLoadingLabel,
				formContextEventLabel: labels.formContextEventLabel,
				formContextGameLabel: labels.formContextGameLabel,
				formContextAssetLabel: labels.formContextAssetLabel,
				formContextHolderLabel: labels.formContextHolderLabel,
				formTitleLabel: labels.formTitleLabel,
				formTitlePlaceholder: labels.formTitlePlaceholder,
				formDecidedAtLabel: labels.formDecidedAtLabel,
				formAmountLabel: labels.formAmountLabel,
				formGrossAmountLabel: labels.formGrossAmountLabel,
				formNetAmountLabel: labels.formNetAmountLabel,
				formFeeRuleSectionLabel: labels.formFeeRuleSectionLabel,
				formFeeRuleToggleLabel: labels.formFeeRuleToggleLabel,
				formFeeRuleHideLabel: labels.formFeeRuleHideLabel,
				formFeePercentLabel: labels.formFeePercentLabel,
				formFeeAmountLabel: labels.formFeeAmountLabel,
				formFeeRuleKeyLabel: labels.formFeeRuleKeyLabel,
				formFeeRuleKeyPlaceholder: labels.formFeeRuleKeyPlaceholder,
				formPayerTypeLabel: labels.formPayerTypeLabel,
				formPayerRefLabel: labels.formPayerRefLabel,
				formPayerRefPlaceholder: labels.formPayerRefPlaceholder,
				formPayerRefEmpty: labels.formPayerRefEmpty,
				formPayerRefHint: labels.formPayerRefHint,
				formPayerRefSelectedLabel: labels.formPayerRefSelectedLabel,
				formPayerRefAddLabel: labels.formPayerRefAddLabel,
				formPayerRefChangeLabel: labels.formPayerRefChangeLabel,
				formRecipientsLabel: labels.formRecipientsLabel,
				formRecipientsPlaceholder: labels.formRecipientsPlaceholder,
				formRecipientsEmpty: labels.formRecipientsEmpty,
				formRecipientsHint: labels.formRecipientsHint,
				formRecipientsSelectedLabel: labels.formRecipientsSelectedLabel,
				formRecipientsAddLabel: labels.formRecipientsAddLabel,
				formRecipientsMismatchWarning: labels.formRecipientsMismatchWarning,
				clearSelectionLabel: labels.clearSelectionLabel,
				formSettlementTypeLabel: labels.formSettlementTypeLabel,
				formAllocationModeLabel: labels.formAllocationModeLabel,
				formNotesLabel: labels.formNotesLabel,
				formNotesPlaceholder: labels.formNotesPlaceholder,
				formAutoNetHint: labels.formAutoNetHint,
				submitLabel: labels.submitLabel,
				requiredHint: labels.requiredHint,
				optionalHint: labels.optionalHint,
				validationRequired: labels.validationRequired,
				settlementTypeSale: labels.settlementTypeSale,
				settlementTypeBonus: labels.settlementTypeBonus,
				settlementTypeSalary: labels.settlementTypeSalary,
				settlementTypeReward: labels.settlementTypeReward,
				settlementTypeSubsidy: labels.settlementTypeSubsidy,
				settlementTypeAdjustment: labels.settlementTypeAdjustment,
				payerTypeCharacter: labels.payerTypeCharacter,
				payerTypeOrgTreasury: labels.payerTypeOrgTreasury,
				payerTypeExternal: labels.payerTypeExternal,
				payerTypeCustom: labels.payerTypeCustom,
				allocationModeEqual: labels.allocationModeEqual,
				allocationModeWeight: labels.allocationModeWeight,
				allocationModeManual: labels.allocationModeManual,
				feeModeNone: labels.feeModeNone,
				feeModePercent: labels.feeModePercent,
				feeModeFixed: labels.feeModeFixed,
				feeModeRule: labels.feeModeRule,
			}}
			on:submit={() => void submit()}
			on:titlechange={(event) => {
				title = event.detail.value;
			}}
			on:decidedatchange={(event) => {
				decidedAt = event.detail.value;
			}}
			on:settlementtypechange={(event) => {
				settlementType = event.detail.value;
			}}
			on:amountchange={handleAmountEditorChange}
			on:payertypechange={(event) => {
				payerType = event.detail.value;
				if (payerType === 'character' && selectedEvent) {
					syncPayerFromCharacterId(getDefaultPayerCharacterId(selectedEvent.game.id, selectedEvent));
				}
			}}
			on:payercharacterchange={(event) => {
				syncPayerFromCharacterId(event.detail.value);
			}}
			on:payerrefchange={(event) => {
				payerRef = event.detail.value;
			}}
			on:recipientadd={(event) => addRecipientCharacterId(event.detail.value)}
			on:recipientremove={(event) => removeRecipientCharacterId(event.detail.value)}
			on:allocationmodechange={(event) => {
				allocationMode = event.detail.value;
			}}
			on:noteschange={(event) => {
				notes = event.detail.value;
			}}
		/>
	{/if}
</section>

<RequestStatusDialog
	open={dialogOpen}
	state={dialogState}
	title={dialogTitle}
	message={dialogMessage}
	primaryAction={dialogPrimaryAction}
	secondaryAction={dialogSecondaryAction}
	on:close={() => {
		dialogOpen = false;
	}}
/>

<style>
	.settlement-shell {
		display: grid;
		gap: 24px;
	}

	.settlement-header {
		display: grid;
		gap: 8px;
	}

	.settlement-header h1,
	.settlement-card h2 {
		margin: 0;
	}

	.settlement-eyebrow,
	.settlement-intro {
		margin: 0;
		color: var(--text-soft);
	}

	.settlement-card {
		padding: 24px;
		border-radius: var(--radius-lg);
		border: 1px solid color-mix(in srgb, var(--line) 88%, white);
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ledger-accent) 10%, transparent), transparent 42%),
			var(--surface);
		box-shadow: var(--shadow);
	}

	.error-text {
		margin: 0;
		color: #b74a4a;
	}
 </style>
