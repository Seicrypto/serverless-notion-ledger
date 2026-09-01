<script lang="ts">
	import { onMount } from 'svelte';

	import GuildOptionPicker from '../../shared/GuildOptionPicker.svelte';
	import SearchSelect from '../../shared/SearchSelect.svelte';
	import SettlementAmountEditor from '../../shared/SettlementAmountEditor.svelte';
	import TimeSelector from '../../shared/TimeSelector.svelte';
	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import { ensureMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import {
		ensureOrganizationManageCache,
		type OrganizationManageCharacter,
	} from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import { getOrganizationReference, resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import { getLatestActiveOrganization, readPreferredOrganization, writePreferredOrganization } from '../../../libs/ledger/workspace-preferences.ts';
	import { readSettlementDefaultsCache, writeSettlementDefaultsCache } from '../../../libs/settlements/settlement-defaults-cache.ts';
	import {
		getLatestSettlementCreationForOrganization,
		loadRecentSettlementCreations,
		recordRecentSettlementCreation,
		type RecentSettlementCreationEntry,
	} from '../../../libs/settlements/recent-settlement-creations.ts';
	import {
		calculateSettlementNetAmount,
		formatAmountDisplay,
		parseAmountValue,
	} from '../../../libs/ledger/settlement-amounts.ts';
	import { devDebugError, devDebugLog } from '../../../libs/runtime/dev-debug.ts';
	import type {
		CreateLedgerSettlementRequest,
		LedgerEvent,
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
		orgRequiredTitle: string;
		orgRequiredBody: string;
		eventSectionTitle: string;
		eventSectionBody: string;
		eventSelectLabel: string;
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
		eventSummaryTitle: string;
		eventSummaryStatusLabel: string;
		eventSummaryOccurredAtLabel: string;
		eventSummaryAssetLabel: string;
		eventSummaryHolderLabel: string;
		eventSummaryGameLabel: string;
		defaultsTitle: string;
		defaultsBody: string;
		defaultsLoadingLabel: string;
		defaultsGameLabel: string;
		defaultsUnitLabel: string;
		defaultsFeeModeLabel: string;
		defaultsAllocationModeLabel: string;
		reusePreviousAmountLabel: string;
		reusePreviousAmountEmpty: string;
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
		formUnitAssetIdLabel: string;
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

	const CREATE_TIMEOUT_MS = 20000;
	const DEFAULT_EVENT_PAGE_LIMIT = 10;
	const DEFAULT_EVENT_LOOKBACK_DAYS = 7;

	const settlementTypeOptions: Array<{ value: SettlementType; labelKey: keyof Labels }> = [
		{ value: 'sale', labelKey: 'settlementTypeSale' },
		{ value: 'bonus', labelKey: 'settlementTypeBonus' },
		{ value: 'salary', labelKey: 'settlementTypeSalary' },
		{ value: 'reward', labelKey: 'settlementTypeReward' },
		{ value: 'subsidy', labelKey: 'settlementTypeSubsidy' },
		{ value: 'adjustment', labelKey: 'settlementTypeAdjustment' },
	];

	const payerTypeOptions: Array<{ value: PayerType; labelKey: keyof Labels }> = [
		{ value: 'character', labelKey: 'payerTypeCharacter' },
		{ value: 'org_treasury', labelKey: 'payerTypeOrgTreasury' },
		{ value: 'external', labelKey: 'payerTypeExternal' },
		{ value: 'custom', labelKey: 'payerTypeCustom' },
	];

	const allocationModeLabels: Record<AllocationMode, keyof Labels> = {
		equal: 'allocationModeEqual',
		weight: 'allocationModeWeight',
		manual: 'allocationModeManual',
	};

	const feeModeLabels: Record<FeeMode, keyof Labels> = {
		none: 'feeModeNone',
		percent: 'feeModePercent',
		fixed: 'feeModeFixed',
		rule: 'feeModeRule',
	};

	export let lang: string;
	export let organization: string | null = null;
	export let eventId: number | null = null;
	export let labels: Labels;

	let organizations: OrganizationCardResponse[] = [];
	let organizationCharacters: OrganizationManageCharacter[] = [];
	let session: AuthSession | null = null;
	let events: LedgerEvent[] = [];
	let eventsLoading = false;
	let eventsError = '';
	let hasAnyEvents = false;
	let eventsHasMore = false;
	let eventQueryOffset = 0;
	let eventQueryLimit = DEFAULT_EVENT_PAGE_LIMIT;
	let eventQueryFromDate = '';
	let eventQueryToDate = '';
	let selectedEventId = '';
	let selectedEvent: LedgerEvent | null = null;

	let defaultsLoading = false;
	let defaultsError = '';
	let defaults: LedgerSettlementDefaultsResponse | null = null;

	let recentSettlements: RecentSettlementCreationEntry[] = [];

	let title = '';
	let decidedAt = '';
	let grossAmount = '';
	let netAmount = '';
	let feeMode: FeeMode = 'none';
	let feePercent = '';
	let feeAmount = '';
	let feeRuleKey = '';
	let unitAssetId = '';
	let payerType: PayerType = 'character';
	let payerRef = '';
	let payerCharacterId = '';
	let recipientPickerValue = '';
	let recipientCharacterIds: string[] = [];
	let eventParticipantCharacterIds: string[] = [];
	let settlementType: SettlementType = 'sale';
	let allocationMode: AllocationMode = 'equal';
	let notes = '';
	let titleWasPrefilled = false;

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

	function resetWorkspaceState() {
		events = [];
		eventsLoading = false;
		eventsError = '';
		hasAnyEvents = false;
		eventsHasMore = false;
		eventQueryOffset = 0;
		selectedEventId = '';
		selectedEvent = null;
		defaultsLoading = false;
		defaultsError = '';
		defaults = null;
		title = '';
		grossAmount = '';
		netAmount = '';
		feePercent = '';
		feeAmount = '';
		feeRuleKey = '';
		unitAssetId = '';
		payerType = 'character';
		payerRef = '';
		payerCharacterId = '';
		recipientPickerValue = '';
		recipientCharacterIds = [];
		eventParticipantCharacterIds = [];
		settlementType = 'sale';
		allocationMode = 'equal';
		notes = '';
		titleWasPrefilled = false;
		errors = {};
	}

	function openLoginDialog() {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.authRequiredTitle;
		dialogMessage = labels.authRequiredBody;
		dialogPrimaryAction = { label: labels.loginLabel, href: `/${lang}/login` };
		dialogSecondaryAction = { label: labels.homeLabel, href: `/${lang}/` };
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
		if (!value) {
			return undefined;
		}

		return new Date(`${value}T00:00:00`).toISOString();
	}

	function toRangeEndIso(value: string) {
		if (!value) {
			return undefined;
		}

		return new Date(`${value}T23:59:59.999`).toISOString();
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

	function mapEventHolderToPayerType(event: LedgerEvent): PayerType {
		switch (event.holderType) {
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

	function setRecipientsFromEventParticipants(characterIds: string[]) {
		eventParticipantCharacterIds = [...characterIds];
		recipientCharacterIds = [...characterIds];
		recipientPickerValue = '';
	}

	function addRecipientCharacterId(characterId: string) {
		if (!characterId || recipientCharacterIds.includes(characterId)) {
			recipientPickerValue = '';
			return;
		}

		recipientCharacterIds = [...recipientCharacterIds, characterId];
		recipientPickerValue = '';
	}

	function removeRecipientCharacterId(characterId: string) {
		recipientCharacterIds = recipientCharacterIds.filter((value) => value !== characterId);
	}

	function findCharacterIdByNameForGame(name: string, gameId?: number | null) {
		const trimmed = name.trim();
		if (!trimmed) {
			return '';
		}

		return String(
			organizationCharacters.find(
				(character) =>
					character.name === trimmed &&
					(typeof gameId !== 'number' || character.gameId === gameId),
			)?.id ?? '',
		);
	}

	function getDefaultPayerCharacterId(gameId?: number | null) {
		if (!isAuthenticatedSession(session) || typeof gameId !== 'number') {
			return '';
		}

		const claimedByCurrentUser = organizationCharacters.find(
			(character) => character.gameId === gameId && character.claimedBy?.userId === session.user.id,
		);
		return claimedByCurrentUser ? String(claimedByCurrentUser.id) : '';
	}

	function haveSameCharacterSelection(left: string[], right: string[]) {
		if (left.length !== right.length) {
			return false;
		}

		const leftSorted = [...left].sort();
		const rightSorted = [...right].sort();
		return leftSorted.every((value, index) => value === rightSorted[index]);
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
				participantValidation?: {
					eventParticipantCharacterIds?: number[];
					recipientCharacterIds?: number[];
				};
			};
		} catch {
			return null;
		}
	}

	function updateSelectedEvent() {
		selectedEvent = events.find((event) => String(event.id) === selectedEventId) ?? null;
		if (!selectedEvent) {
			eventParticipantCharacterIds = [];
			recipientCharacterIds = [];
			recipientPickerValue = '';
			return;
		}

		if (!title || titleWasPrefilled) {
			title = `${selectedEvent.title} settlement`;
			titleWasPrefilled = true;
		}

		payerType = mapEventHolderToPayerType(selectedEvent);
		payerRef = typeof selectedEvent.holderRef === 'string' ? selectedEvent.holderRef : '';
		payerCharacterId =
			payerType === 'character'
				? findCharacterIdByNameForGame(payerRef, selectedEvent.gameId ?? null)
				: '';
		if (payerType === 'character' && isMemberRestrictedPayerSelection && selectedEvent.gameId) {
			syncPayerFromCharacterId(getDefaultPayerCharacterId(selectedEvent.gameId));
		}
		if (selectedEvent.gameId && Number.isFinite(Number(selectedEvent.gameId))) {
			void loadDefaults(Number(selectedEvent.gameId));
		} else {
			defaults = null;
			defaultsError = '';
			defaultsLoading = false;
		}

		void loadSelectedEventDetail(selectedEvent.id);
	}

	async function loadSelectedEventDetail(nextEventId: number) {
		if (!organization) {
			return;
		}

		try {
			const response = await getApiAdapter().getOrganizationLedgerEvent(organization, nextEventId);
			const participantIds = response.event.participants
				.map((participant) =>
					typeof participant.characterId === 'number' && Number.isFinite(participant.characterId)
						? String(participant.characterId)
						: '',
				)
				.filter(Boolean);

			if (selectedEventId === String(nextEventId)) {
				setRecipientsFromEventParticipants(participantIds);
			}
		} catch (error) {
			devDebugError('settlements.event-detail', 'Failed to load event detail for recipients', {
				organization,
				eventId: nextEventId,
				error,
			});
		}
	}

	async function syncOrganizationContext() {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		writePreferredOrganization(window.localStorage, organization);
		resetWorkspaceState();
		const manageSnapshot = await ensureOrganizationManageCache(organization);
		organizationCharacters = manageSnapshot.characters;
		const url = new URL(window.location.href);
		url.searchParams.set('orgVanity', organization);
		window.history.replaceState({}, '', url);
		await loadEvents();
	}

	async function initializeOrganizations() {
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

		organization = nextOrganization;
		await syncOrganizationContext();
	}

	function handleOrganizationChange(event: CustomEvent<{ value: string }>) {
		if (event.detail.value === organization) {
			return;
		}

		organization = event.detail.value;
		void syncOrganizationContext();
	}

	function handlePayerCharacterChange(event: CustomEvent<{ value: string }>) {
		syncPayerFromCharacterId(event.detail.value);
	}

	function handleRecipientCharacterChange(event: CustomEvent<{ value: string }>) {
		addRecipientCharacterId(event.detail.value);
	}

	function applyDefaults(response: LedgerSettlementDefaultsResponse) {
		defaults = response;
		allocationMode = response.defaults.defaultAllocationMode;
		feeMode = response.defaults.defaultFeeMode;
		unitAssetId = String(response.defaults.defaultSettlementUnit.id);
		netAmount = calculateSettlementNetAmount({
			grossAmount,
			feeMode,
			feePercent,
			feeAmount,
		});
	}

	async function loadDefaults(gameId?: number) {
		if (!organization) {
			return;
		}

		defaultsLoading = true;
		defaultsError = '';

		try {
			if (typeof window !== 'undefined') {
				const cached = readSettlementDefaultsCache(window.sessionStorage, organization, gameId);
				if (cached) {
					applyDefaults(cached);
					defaultsLoading = false;
					return;
				}
			}

			const response = await getApiAdapter().getOrganizationLedgerSettlementDefaults(organization, {
				gameId,
			});
			applyDefaults(response);
			if (typeof window !== 'undefined') {
				writeSettlementDefaultsCache(window.sessionStorage, organization, response, gameId);
			}
		} catch (error) {
			defaultsError = getErrorMessage(error, labels.errorCreateTitle);
		} finally {
			defaultsLoading = false;
		}
	}

	async function loadEvents() {
		if (!organization) {
			return;
		}

		eventsLoading = true;
		eventsError = '';

		try {
			const allEventsResponse = await getApiAdapter().listOrganizationLedgerEvents(organization, {
				limit: 1,
				sortBy: 'occurredAt',
				sortOrder: 'desc',
			});
			hasAnyEvents = allEventsResponse.events.length > 0;

			let preferredEvent: LedgerEvent | null = null;
			if (eventId) {
				try {
					const response = await getApiAdapter().getOrganizationLedgerEvent(organization, eventId);
					preferredEvent = response.event;
				} catch {
					// Fall back to the settleable event list if the direct event fetch is unavailable.
				}
			}

			const response = await getApiAdapter().listOrganizationLedgerEvents(organization, {
				statusGroup: 'unsettled',
				fromOccurredAt: toRangeStartIso(eventQueryFromDate),
				toOccurredAt: toRangeEndIso(eventQueryToDate),
				limit: eventQueryLimit,
				offset: eventQueryOffset,
				sortBy: 'occurredAt',
				sortOrder: 'desc',
			});
			eventsHasMore = response.pagination.hasMore;
			events = preferredEvent
				? [preferredEvent, ...response.events.filter((entry) => entry.id !== preferredEvent?.id)]
				: response.events;
			const preferred = preferredEvent ?? (eventId ? response.events.find((entry) => entry.id === eventId) : null);
			selectedEventId = String(preferred?.id ?? response.events[0]?.id ?? '');
			updateSelectedEvent();
		} catch (error) {
			hasAnyEvents = false;
			eventsHasMore = false;
			eventsError = getErrorMessage(error, labels.errorCreateTitle);
		} finally {
			eventsLoading = false;
		}
	}

	function applyEventFilters() {
		eventQueryOffset = 0;
		void loadEvents();
	}

	function loadPreviousEventPage() {
		if (eventsLoading || eventQueryOffset === 0) {
			return;
		}

		eventQueryOffset = Math.max(0, eventQueryOffset - eventQueryLimit);
		void loadEvents();
	}

	function loadNextEventPage() {
		if (eventsLoading || !eventsHasMore) {
			return;
		}

		eventQueryOffset += eventQueryLimit;
		void loadEvents();
	}

	function getEventPageSummary() {
		const page = Math.floor(eventQueryOffset / eventQueryLimit) + 1;
		return labels.eventPageSummaryLabel.replace('{page}', String(page));
	}

	function handleEventRangeChange(event: CustomEvent<{ start: string; end: string }>) {
		eventQueryFromDate = event.detail.start;
		eventQueryToDate = event.detail.end;
	}

	function handleDecidedAtChange(event: CustomEvent<{ value: string }>) {
		decidedAt = event.detail.value;
	}

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!organization) {
			nextErrors.organization = labels.validationRequired;
		}

		if (!selectedEventId) {
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

		if (hasNonEmptyValue(unitAssetId)) {
			const parsed = Number(unitAssetId);
			if (!Number.isInteger(parsed) || parsed <= 0) {
				nextErrors.unitAssetId = labels.validationNumber;
			}
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function getPreviousSettlementButtonLabel() {
		const previous = organization
			? getLatestSettlementCreationForOrganization(recentSettlements, organization)
			: null;
		if (!previous) {
			return labels.reusePreviousAmountEmpty;
		}

		return `${labels.reusePreviousAmountLabel} ${formatAmountDisplay(previous.payload.grossAmount)}`;
	}

	function usePreviousAmount() {
		if (!organization) {
			return;
		}

		const previous = getLatestSettlementCreationForOrganization(recentSettlements, organization);
		if (!previous) {
			return;
		}

		grossAmount = String(previous.payload.grossAmount);
		netAmount = calculateSettlementNetAmount({
			grossAmount,
			feeMode,
			feePercent,
			feeAmount,
		});
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

	async function submit() {
		if (isSubmitting || !validate() || !organization) {
			return;
		}

		const payload: CreateLedgerSettlementRequest = {
			title: title.trim(),
			decidedAt: new Date(decidedAt).toISOString(),
			eventId: Number(selectedEventId),
			grossAmount: Number(grossAmount),
			netAmount: Number(netAmount),
			feeMode,
			allocationMode,
			payerType,
			settlementType,
		};

		if (notes.trim()) {
			payload.notes = notes.trim();
		}
		if (payerRef.trim()) {
			payload.payerRef = payerRef.trim();
		}
		if (recipientCharacterIds.length > 0) {
			payload.recipientCharacterIds = recipientCharacterIds
				.map((characterId) => Number(characterId))
				.filter((characterId) => Number.isFinite(characterId));
		}
		if (hasNonEmptyValue(unitAssetId)) {
			payload.unitAssetId = Number(unitAssetId);
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
			if (selectedEvent?.status === 'open') {
				const settlePayload: SettleLedgerEventRequest = {
					title: payload.title,
					decidedAt: payload.decidedAt,
					grossAmount: payload.grossAmount,
					netAmount: payload.netAmount,
					feeMode: payload.feeMode,
					allocationMode: payload.allocationMode,
					payerType: payload.payerType,
					settlementType: payload.settlementType,
				};

				if (payload.notes) {
					settlePayload.notes = payload.notes;
				}
				if (payload.payerRef) {
					settlePayload.payerRef = payload.payerRef;
				}
				if (payload.recipientCharacterIds) {
					settlePayload.recipientCharacterIds = payload.recipientCharacterIds;
				}
				if (payload.unitAssetId) {
					settlePayload.unitAssetId = payload.unitAssetId;
				}
				if (payload.feePercent !== undefined) {
					settlePayload.feePercent = payload.feePercent;
				}
				if (payload.feeAmount !== undefined) {
					settlePayload.feeAmount = payload.feeAmount;
				}
				if (payload.feeRuleKey) {
					settlePayload.feeRuleKey = payload.feeRuleKey;
				}

				devDebugLog('settlements.submit', 'Submitting settle event payload', {
					organization,
					eventId: Number(selectedEventId),
					sourceEventStatus: selectedEvent.status,
					payload: settlePayload,
				});
				const response = await getApiAdapter().settleOrganizationLedgerEvent(
					organization,
					Number(selectedEventId),
					settlePayload,
				);
				devDebugLog('settlements.submit', 'Received settle event response', {
					organization,
					eventId: Number(selectedEventId),
					response,
				});
			} else {
				devDebugLog('settlements.submit', 'Submitting settlement payload', {
					organization,
					payload,
				});
				const response = await getApiAdapter().createOrganizationLedgerSettlement(organization, payload);
				devDebugLog('settlements.submit', 'Received settlement response', {
					organization,
					response,
				});
			}
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			if (typeof window !== 'undefined') {
				recentSettlements = recordRecentSettlementCreation(window.sessionStorage, organization, payload);
			}
			openSuccessDialog();
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			devDebugError('settlements.submit', 'Settlement submission failed', {
				organization,
				selectedEventId,
				selectedEventStatus: selectedEvent?.status ?? null,
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

	$: if (selectedEventId) {
		updateSelectedEvent();
	}

	$: currentOrganizationRole = selectedOrganizationCard?.membership?.role ?? null;
	$: isMemberRestrictedPayerSelection = currentOrganizationRole === 'member';
	$: selectedPayerCharacter = getCharacterById(payerCharacterId);
	$: selectedRecipientCharacters = recipientCharacterIds
		.map((characterId) => getCharacterById(characterId))
		.filter((character): character is OrganizationManageCharacter => Boolean(character));
	$: payerCharacterOptions = organizationCharacters
		.filter((character) =>
			typeof selectedEvent?.gameId === 'number' ? character.gameId === selectedEvent.gameId : true,
		)
		.filter((character) =>
			isMemberRestrictedPayerSelection && isAuthenticatedSession(session)
				? character.claimedBy?.userId === session.user.id
				: true,
		)
		.map((character) => ({
			value: String(character.id),
			label: character.name,
			metaLabel: getCharacterMetaLabel(character),
		}));
	$: recipientCharacterOptions = organizationCharacters
		.filter((character) =>
			typeof selectedEvent?.gameId === 'number' ? character.gameId === selectedEvent.gameId : true,
		)
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
	$: selectedOrganizationCard = organization ? findOrganizationByReference(organization) : null;
	$: organizationOptions = organizations.map((entry) => ({
		value: getOrganizationReference(entry),
		label: entry.name,
		metaLabel: entry.vanity ? `@${entry.vanity}` : `${entry.stats.memberCount} members`,
		iconUrl: entry.iconUrl,
	}));
	$: if (payerType === 'character' && isMemberRestrictedPayerSelection && selectedEvent?.gameId) {
		const defaultCharacterId = getDefaultPayerCharacterId(selectedEvent.gameId);
		if (defaultCharacterId && payerCharacterId !== defaultCharacterId) {
			syncPayerFromCharacterId(defaultCharacterId);
		}
	}

	onMount(() => {
		decidedAt = toLocalDateTimeValue(new Date());
		const defaultRange = getDefaultEventRange();
		eventQueryFromDate = defaultRange.from;
		eventQueryToDate = defaultRange.to;
		if (typeof window !== 'undefined') {
			recentSettlements = loadRecentSettlementCreations(window.sessionStorage);
		}
		void initializeOrganizations();
	});
</script>

<section class="settlement-shell">
	<div class="settlement-header">
		<p class="settlement-eyebrow">{labels.eyebrow}</p>
		<h1>{labels.title}</h1>
		<p class="settlement-intro">{labels.intro}</p>
	</div>

	<section class="settlement-card settlement-context-card">
		<div class="settlement-card-head settlement-context-head">
			<div>
				<h2>{labels.contextTitle}</h2>
				<p>
					{labels.contextBody}
					{#if selectedOrganizationCard}
						<strong>{selectedOrganizationCard.name}</strong>
					{/if}
				</p>
			</div>
		</div>

		{#if organizations.length}
			<label class="settlement-field">
				<span>{labels.contextSelectLabel}</span>
				<GuildOptionPicker
					value={organization ?? ''}
					ariaLabel={labels.contextSelectLabel}
					placeholder={labels.contextSelectPlaceholder}
					searchPlaceholder={labels.contextSelectPlaceholder}
					emptyLabel={labels.contextSelectEmpty}
					items={organizationOptions}
					on:change={handleOrganizationChange}
				/>
			</label>
		{:else}
			<p>{labels.orgRequiredBody}</p>
		{/if}
	</section>

	{#if !organization}
		<section class="settlement-card">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</section>
	{:else}
		<section class="settlement-card">
			<div class="settlement-card-head">
				<div>
					<h2>{labels.eventSectionTitle}</h2>
					<p>{labels.eventSectionBody}</p>
				</div>
				<button type="button" class="secondary-button" on:click={() => void loadEvents()} disabled={eventsLoading}>
					{labels.eventRefreshLabel}
				</button>
			</div>

			<div class="settlement-form-grid">
				<label class="settlement-field settlement-field-wide">
					<span>{labels.eventFilterFromLabel} / {labels.eventFilterToLabel}</span>
					<TimeSelector
						mode="range"
						inputType="date"
						start={eventQueryFromDate}
						end={eventQueryToDate}
						startAriaLabel={labels.eventFilterFromLabel}
						endAriaLabel={labels.eventFilterToLabel}
						on:change={handleEventRangeChange}
					/>
					<small>{labels.optionalHint}</small>
				</label>

				<div class="settlement-field settlement-field-actions">
					<button type="button" class="secondary-button" on:click={applyEventFilters} disabled={eventsLoading}>
						{labels.eventFilterApplyLabel}
					</button>
				</div>
			</div>

			<label class="settlement-field">
				<span>{labels.eventSelectLabel}</span>
				<select bind:value={selectedEventId} disabled={eventsLoading || events.length === 0}>
					<option value="">{eventsLoading ? labels.eventLoadingLabel : labels.eventSelectLabel}</option>
					{#each events as event}
						<option value={String(event.id)}>
							{event.title} #{event.id}
						</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
				{#if errors.eventId}<em>{errors.eventId}</em>{/if}
				{#if eventsError}<em>{eventsError}</em>{/if}
			</label>

			<div class="settlement-actions">
				<button type="button" class="secondary-button" on:click={loadPreviousEventPage} disabled={eventsLoading || eventQueryOffset === 0}>
					{labels.eventPagePreviousLabel}
				</button>
				<p class="muted-text">{getEventPageSummary()}</p>
				<button type="button" class="secondary-button" on:click={loadNextEventPage} disabled={eventsLoading || !eventsHasMore}>
					{labels.eventPageNextLabel}
				</button>
			</div>

			{#if !eventsLoading && events.length === 0}
				<div class="settlement-empty">
					<h3>{labels.eventEmptyTitle}</h3>
					<p>{labels.eventEmptyBody}</p>
					{#if hasAnyEvents}
						<p class="settlement-empty-note">{labels.eventEmptyRefreshHint}</p>
					{:else}
						<a
							class="primary-button workflow-action settlement-empty-action"
							href={`/${lang}/guilds/events/new?orgVanity=${encodeURIComponent(organization)}`}
						>
							{labels.eventEmptyActionLabel}
						</a>
					{/if}
				</div>
			{/if}
		</section>

		{#if selectedEvent}
			<section class="settlement-grid">
				<article class="settlement-card">
					<h2>{labels.eventSummaryTitle}</h2>
					<dl class="summary-grid">
						<div>
							<dt>{labels.eventSummaryStatusLabel}</dt>
							<dd>{selectedEvent.status}</dd>
						</div>
						<div>
							<dt>{labels.eventSummaryOccurredAtLabel}</dt>
							<dd>{new Date(selectedEvent.occurredAt).toLocaleString()}</dd>
						</div>
						<div>
							<dt>{labels.eventSummaryAssetLabel}</dt>
							<dd>{selectedEvent.assetId ?? '—'}</dd>
						</div>
						<div>
							<dt>{labels.eventSummaryHolderLabel}</dt>
							<dd>{selectedEvent.holderRef ?? selectedEvent.holderType}</dd>
						</div>
						<div>
							<dt>{labels.eventSummaryGameLabel}</dt>
							<dd>{selectedEvent.gameId ?? '—'}</dd>
						</div>
					</dl>
				</article>

				<article class="settlement-card">
					<h2>{labels.defaultsTitle}</h2>
					<p>{labels.defaultsBody}</p>
					{#if defaultsLoading}
						<p class="muted-text">{labels.defaultsLoadingLabel}</p>
					{:else if defaults}
						<dl class="summary-grid">
							<div>
								<dt>{labels.defaultsGameLabel}</dt>
								<dd>{defaults.game.name}</dd>
							</div>
							<div>
								<dt>{labels.defaultsUnitLabel}</dt>
								<dd>{defaults.defaults.defaultSettlementUnit.name}</dd>
							</div>
							<div>
								<dt>{labels.defaultsFeeModeLabel}</dt>
								<dd>{labels[feeModeLabels[defaults.defaults.defaultFeeMode]]}</dd>
							</div>
							<div>
								<dt>{labels.defaultsAllocationModeLabel}</dt>
								<dd>{labels[allocationModeLabels[defaults.defaults.defaultAllocationMode]]}</dd>
							</div>
						</dl>
					{:else if defaultsError}
						<p class="error-text">{defaultsError}</p>
					{/if}
				</article>
			</section>

			<form
				class="settlement-card settlement-form"
				on:submit|preventDefault={() => {
					void submit();
				}}
			>
				<div class="settlement-form-grid">
					<label class="settlement-field settlement-field-wide">
						<span>{labels.formTitleLabel}</span>
						<input bind:value={title} type="text" maxlength="200" placeholder={labels.formTitlePlaceholder} on:input={() => (titleWasPrefilled = false)} />
						<small>{labels.requiredHint}</small>
						{#if errors.title}<em>{errors.title}</em>{/if}
					</label>

					<label class="settlement-field">
						<span>{labels.formDecidedAtLabel}</span>
						<TimeSelector
							mode="single"
							inputType="datetime-local"
							value={decidedAt}
							ariaLabel={labels.formDecidedAtLabel}
							error={Boolean(errors.decidedAt)}
							on:change={handleDecidedAtChange}
						/>
						<small>{labels.requiredHint}</small>
						{#if errors.decidedAt}<em>{errors.decidedAt}</em>{/if}
					</label>

					<label class="settlement-field">
						<span>{labels.formSettlementTypeLabel}</span>
						<select bind:value={settlementType}>
							{#each settlementTypeOptions as option}
								<option value={option.value}>{labels[option.labelKey]}</option>
							{/each}
						</select>
						<small>{labels.requiredHint}</small>
					</label>

					<div class="settlement-field settlement-field-wide">
						<SettlementAmountEditor
							grossAmount={grossAmount}
							netAmount={netAmount}
							feeMode={feeMode}
							feePercent={feePercent}
							feeAmount={feeAmount}
							feeRuleKey={feeRuleKey}
							labels={{
								amountLabel: labels.formAmountLabel,
								grossAmountLabel: labels.formGrossAmountLabel,
								netAmountLabel: labels.formNetAmountLabel,
								ruleSectionLabel: labels.formFeeRuleSectionLabel,
								ruleToggleLabel: labels.formFeeRuleToggleLabel,
								ruleHideLabel: labels.formFeeRuleHideLabel,
								feeModeNone: labels.feeModeNone,
								feeModePercent: labels.feeModePercent,
								feeModeFixed: labels.feeModeFixed,
								feeModeRule: labels.feeModeRule,
								feePercentLabel: labels.formFeePercentLabel,
								feeAmountLabel: labels.formFeeAmountLabel,
								feeRuleKeyLabel: labels.formFeeRuleKeyLabel,
								feeRuleKeyPlaceholder: labels.formFeeRuleKeyPlaceholder,
								autoNetHint: labels.formAutoNetHint,
								requiredHint: labels.requiredHint,
								optionalHint: labels.optionalHint,
							}}
							errors={{
								grossAmount: errors.grossAmount,
								netAmount: errors.netAmount,
								feePercent: errors.feePercent,
								feeAmount: errors.feeAmount,
								feeRuleKey: errors.feeRuleKey,
							}}
							on:change={handleAmountEditorChange}
						/>
					</div>

					<label class="settlement-field">
						<span>{labels.formAllocationModeLabel}</span>
						<select bind:value={allocationMode}>
							<option value="equal">{labels.allocationModeEqual}</option>
							<option value="weight">{labels.allocationModeWeight}</option>
							<option value="manual">{labels.allocationModeManual}</option>
						</select>
						<small>{labels.requiredHint}</small>
					</label>

					<label class="settlement-field">
						<span>{labels.formPayerTypeLabel}</span>
						<select bind:value={payerType}>
							{#each payerTypeOptions as option}
								<option value={option.value}>{labels[option.labelKey]}</option>
							{/each}
						</select>
						<small>{labels.requiredHint}</small>
					</label>

					<label class="settlement-field">
						<span>{labels.formPayerRefLabel}</span>
						{#if payerType === 'character'}
							{#if selectedPayerCharacter}
								<div class="settlement-selected-character">
									<span>{labels.formPayerRefSelectedLabel}</span>
									<button
										type="button"
										class="settlement-selected-character-chip"
										disabled={isMemberRestrictedPayerSelection}
										on:click={() => {
											if (isMemberRestrictedPayerSelection) {
												return;
											}
											payerCharacterId = '';
											payerRef = '';
										}}
									>
										<strong>{selectedPayerCharacter.name}</strong>
										<small>{getCharacterMetaLabel(selectedPayerCharacter)}</small>
										<b aria-hidden="true">×</b>
									</button>
								</div>
							{/if}
							{#if !isMemberRestrictedPayerSelection}
								<SearchSelect
									value={payerCharacterId}
									ariaLabel={labels.formPayerRefLabel}
									placeholder={labels.formPayerRefPlaceholder}
									searchPlaceholder={labels.formPayerRefPlaceholder}
									emptyLabel={labels.formPayerRefEmpty}
									disabled={!organization || eventsLoading || !selectedEvent?.gameId}
									error={Boolean(errors.payerRef)}
									triggerMode="button"
									buttonIdleLabel={labels.formPayerRefAddLabel}
									buttonActiveLabel={labels.formPayerRefChangeLabel}
									items={payerCharacterOptions}
									on:change={handlePayerCharacterChange}
								/>
							{/if}
							<small>{labels.formPayerRefHint}</small>
						{:else}
							<input bind:value={payerRef} type="text" maxlength="120" placeholder={labels.formPayerRefPlaceholder} />
							<small>{labels.optionalHint}</small>
						{/if}
						{#if errors.payerRef}<em>{errors.payerRef}</em>{/if}
					</label>

					<label class="settlement-field settlement-field-wide">
						<span>{labels.formRecipientsLabel}</span>
						{#if selectedRecipientCharacters.length > 0}
							<div class="settlement-selected-character">
								<span>{labels.formRecipientsSelectedLabel}</span>
								<div class="settlement-selected-character-list">
									{#each selectedRecipientCharacters as character}
										<button
											type="button"
											class="settlement-selected-character-chip"
											on:click={() => removeRecipientCharacterId(String(character.id))}
										>
											<strong>{character.name}</strong>
											<small>{getCharacterMetaLabel(character)}</small>
											<b aria-hidden="true">×</b>
											<span class="sr-only">{labels.clearSelectionLabel}</span>
										</button>
									{/each}
								</div>
							</div>
						{/if}
						<SearchSelect
							value={recipientPickerValue}
							ariaLabel={labels.formRecipientsLabel}
							placeholder={labels.formRecipientsPlaceholder}
							searchPlaceholder={labels.formRecipientsPlaceholder}
							emptyLabel={labels.formRecipientsEmpty}
							disabled={!organization || eventsLoading || !selectedEvent?.gameId}
							error={Boolean(errors.recipientCharacterIds)}
							triggerMode="button"
							buttonIdleLabel={labels.formRecipientsAddLabel}
							buttonActiveLabel={labels.formRecipientsAddLabel}
							items={recipientCharacterOptions}
							on:change={handleRecipientCharacterChange}
						/>
						{#if hasRecipientMismatch}
							<small class="warning-text">{labels.formRecipientsMismatchWarning}</small>
						{:else}
							<small>{labels.formRecipientsHint}</small>
						{/if}
						{#if errors.recipientCharacterIds}<em>{errors.recipientCharacterIds}</em>{/if}
					</label>

					<label class="settlement-field settlement-field-wide">
						<span>{labels.formNotesLabel}</span>
						<textarea bind:value={notes} rows="4" maxlength="1000" placeholder={labels.formNotesPlaceholder}></textarea>
						<small>{labels.optionalHint}</small>
					</label>
				</div>

				<div class="settlement-actions">
					<button class="primary-button" type="submit" disabled={isSubmitting}>
						{labels.submitLabel}
					</button>
				</div>
			</form>
		{/if}
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
	.settlement-shell {
		width: min(1080px, 100%);
		margin: 24px auto 0;
		display: grid;
		gap: 24px;
	}

	.settlement-header h1,
	.settlement-header p,
	.settlement-card h2,
	.settlement-card p,
	.settlement-empty h3,
	.settlement-empty p {
		margin: 0;
	}

	.settlement-eyebrow {
		margin: 0 0 10px;
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.settlement-header h1 {
		font-size: clamp(2rem, 4vw, 3.1rem);
		line-height: 1.05;
		letter-spacing: -0.05em;
	}

	.settlement-intro {
		margin-top: 14px;
		max-width: 64ch;
		color: var(--text-soft);
		line-height: 1.8;
	}

	.settlement-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
		display: grid;
		gap: 18px;
	}

	.settlement-context-card {
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ledger-accent) 12%, transparent), transparent 38%),
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, white), var(--surface));
	}

	.settlement-card-head,
	.settlement-actions,
	.settlement-field-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.settlement-context-head {
		align-items: end;
	}

	.settlement-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
		margin: 0;
	}

	.summary-grid div {
		padding: 14px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
	}

	.summary-grid dt {
		font-size: 0.8rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.summary-grid dd {
		margin: 8px 0 0;
		font-weight: 700;
		color: var(--text-main);
	}

	.settlement-form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.settlement-field {
		display: grid;
		gap: 8px;
	}

	.settlement-field-wide {
		grid-column: 1 / -1;
	}

	.settlement-field span {
		font-size: 0.94rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.settlement-field input,
	.settlement-field textarea,
	.settlement-field select {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.settlement-field textarea {
		min-height: 120px;
		padding: 14px 16px;
		resize: vertical;
	}

	.settlement-field small,
	.muted-text {
		color: var(--text-soft);
		line-height: 1.6;
	}

	.settlement-field em,
	.error-text {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.settlement-selected-character {
		display: grid;
		gap: 10px;
	}

	.settlement-selected-character-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.settlement-selected-character > span {
		font-size: 0.84rem;
		font-weight: 700;
		color: var(--text-soft);
	}

	.settlement-selected-character-chip {
		width: 100%;
		padding: 12px 14px;
		border-radius: 18px;
		border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		text-align: left;
		cursor: pointer;
	}

	.settlement-selected-character-chip strong,
	.settlement-selected-character-chip small,
	.settlement-selected-character-chip b {
		display: block;
	}

	.settlement-selected-character-chip strong {
		color: var(--text-main);
	}

	.settlement-selected-character-chip small {
		color: var(--text-soft);
	}

	.settlement-selected-character-chip b {
		font-size: 1rem;
		color: var(--text-soft);
	}

	.settlement-selected-character-list .settlement-selected-character-chip {
		width: auto;
		min-width: min(260px, 100%);
		flex: 1 1 240px;
	}

	.warning-text {
		color: #b85b14;
		font-weight: 600;
	}

	.primary-button,
	.secondary-button {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease,
			opacity 0.18s ease;
	}

	.primary-button {
		border: 1px solid transparent;
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.primary-button.workflow-action {
		border-color: color-mix(in srgb, var(--ledger-accent) 45%, var(--line));
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--ledger-accent) 88%, white),
			color-mix(in srgb, var(--ledger-accent) 56%, white)
		);
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	.secondary-button {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
	}

	.primary-button:hover,
	.secondary-button:hover {
		transform: translateY(-1px);
	}

	.primary-button:disabled,
	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.settlement-empty {
		padding: 18px;
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		border: 1px dashed color-mix(in srgb, var(--accent) 14%, var(--line));
		display: grid;
		gap: 10px;
	}

	.settlement-empty-note {
		margin: 0;
		color: var(--text-soft);
	}

	.settlement-empty-action {
		justify-self: start;
		margin-top: 4px;
	}

	@media (max-width: 820px) {
		.settlement-grid,
		.summary-grid,
		.settlement-form-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.settlement-card {
			padding: 22px;
			border-radius: 22px;
		}

		.settlement-card-head,
		.settlement-actions,
		.settlement-field-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-button,
		.secondary-button {
			width: 100%;
		}
	}
</style>
