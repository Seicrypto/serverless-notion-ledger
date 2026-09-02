<script lang="ts">
	import { onMount } from 'svelte';

	import ClaimLoadingState from './ClaimLoadingState.svelte';
	import GamePicker from '../../shared/GamePicker.svelte';
	import GuildOptionPicker from '../../shared/GuildOptionPicker.svelte';
	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import { ensureMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import {
		ensureOrganizationManageCache,
		type OrganizationManageSummary,
	} from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import { recordRecentClaimCreation } from '../../../libs/claims/recent-claim-creations.ts';
	import { getLatestActiveOrganization, readPreferredOrganization, writePreferredOrganization } from '../../../libs/ledger/workspace-preferences.ts';
	import { getOrganizationReference, resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import { devDebugError, devDebugLog } from '../../../libs/runtime/dev-debug.ts';
	import type {
		CreateLedgerBatchClaimsRequest,
		LedgerClaimableRecipientDisbursementRequest,
		LedgerClaimableRecipientSummaryPagedResponse,
		LedgerClaimableRecipientWorkspaceResponse,
		LedgerClaimableUnitBreakdown,
		LedgerDisburseableEventSummaryResponse,
		LedgerSettlementClaimsRequest,
		LedgerSettlementDisbursementWorkspaceResponse,
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
		modeLabel: string;
		modeRecipientLabel: string;
		modeRecipientBody: string;
		modeEventLabel: string;
		modeEventBody: string;
		orgRequiredTitle: string;
		orgRequiredBody: string;
		recipientsTitle: string;
		recipientsBody: string;
		recipientsLoadingLabel: string;
		recipientsRefreshLabel: string;
		recipientsEmptyTitle: string;
		recipientsEmptyBody: string;
		recipientsEmptyNoEventsTitle: string;
		recipientsEmptyNoEventsBody: string;
		recipientsEmptyNoSettlementsTitle: string;
		recipientsEmptyNoSettlementsBody: string;
		recipientsEmptyNewEventLabel: string;
		recipientsEmptyNewSettlementLabel: string;
		recipientsEmptyRefreshHint: string;
		eventsTitle: string;
		eventsBody: string;
		eventsLoadingLabel: string;
		eventsRefreshLabel: string;
		eventsEmptyTitle: string;
		eventsEmptyBody: string;
		detailTitle: string;
		detailBody: string;
		detailLoadingLabel: string;
		eventDetailTitle: string;
		eventDetailBody: string;
		eventDetailLoadingLabel: string;
		detailReadyTitle: string;
		detailReadyRecipientBody: string;
		detailReadyEventBody: string;
		siblingPromptLabel: string;
		siblingPromptHint: string;
		totalAmountLabel: string;
		totalAllocationsLabel: string;
		totalRecipientsLabel: string;
		unitBreakdownLabel: string;
		memberLabel: string;
		noMemberLabel: string;
		allocationsTitle: string;
		eventRecipientsTitle: string;
		eventPendingRecipientsLabel: string;
		selectAllLabel: string;
		clearAllLabel: string;
		allocationAmountLabel: string;
		allocationSettlementLabel: string;
		allocationEventLabel: string;
		allocationRecipientLabel: string;
		allocationOccurredAtLabel: string;
		allocationUnitLabel: string;
		formClaimedAtLabel: string;
		formMethodLabel: string;
		formNotesLabel: string;
		formNotesPlaceholder: string;
		formSubmitLabel: string;
		methodManual: string;
		methodInGameMail: string;
		methodTrade: string;
		methodBank: string;
		methodOther: string;
		requiredHint: string;
		optionalHint: string;
		validationSelection: string;
		validationAmount: string;
		validationDate: string;
		loadingSubmitTitle: string;
		loadingSubmitBody: string;
		errorSubmitTitle: string;
		errorSubmitTimeoutBody: string;
		errorRetryLabel: string;
		successSubmitTitle: string;
		successSubmitBody: string;
		successCloseLabel: string;
		pagePreviousLabel: string;
		pageNextLabel: string;
		pageSummaryLabel: string;
		summaryCharacterLabel: string;
		summaryMemberLabel: string;
		summaryPendingItemsLabel: string;
		summaryEventLabel: string;
		summaryHolderLabel: string;
		summaryDecidedAtLabel: string;
		summaryActionLabel: string;
		summaryShowAllLabel: string;
		summaryFocusSelectedLabel: string;
		pickLabel: string;
		pickPendingLabel: string;
		pickedLabel: string;
		yesterdayPrefix: string;
	}

	type ClaimMethod = NonNullable<CreateLedgerBatchClaimsRequest['method']>;
	type ClaimMode = 'recipient' | 'event';
	type RecipientSummaryItem = LedgerClaimableRecipientSummaryPagedResponse['recipients'][number];
	type RecipientWorkspace = LedgerClaimableRecipientWorkspaceResponse;
	type RecipientAllocation = RecipientWorkspace['allocations'][number];
	type EventSummaryItem = LedgerDisburseableEventSummaryResponse['items'][number];
	type EventWorkspace = LedgerSettlementDisbursementWorkspaceResponse;
	type EventRecipient = EventWorkspace['recipients'][number];

	interface GameOption {
		value: string;
		label: string;
		iconUrl?: string | null;
		resolvedIconUrl?: string | null;
		officialSiteUrl?: string | null;
	}

	const SUBMIT_TIMEOUT_MS = 20000;
	const SUMMARY_PAGE_LIMIT = 10;

	const methodOptions: Array<{ value: ClaimMethod; labelKey: keyof Labels }> = [
		{ value: 'manual', labelKey: 'methodManual' },
		{ value: 'in_game_mail', labelKey: 'methodInGameMail' },
		{ value: 'trade', labelKey: 'methodTrade' },
		{ value: 'bank', labelKey: 'methodBank' },
		{ value: 'other', labelKey: 'methodOther' },
	];

	export let lang: string;
	export let organization: string | null = null;
	export let labels: Labels;

	let organizations: OrganizationCardResponse[] = [];
	let session: AuthSession | null = null;
	let organizationSummary: OrganizationManageSummary | null = null;
	let selectedGameId = '';
	let activeMode: ClaimMode = 'recipient';

	let recipientSummaries: RecipientSummaryItem[] = [];
	let recipientSummariesLoading = false;
	let recipientSummariesError = '';
	let recipientSummaryOffset = 0;
	let recipientSummaryHasMore = false;
	let selectedRecipientId = '';
	let includeSiblingCharacters = false;
	let recipientWorkspace: RecipientWorkspace | null = null;
	let siblingRecipientWorkspaces: RecipientWorkspace[] = [];
	let recipientWorkspaceLoading = false;
	let recipientWorkspaceError = '';
	let recipientWorkspaceCache = new Map<number, RecipientWorkspace>();
	let selectedRecipientAllocationIds = new Set<number>();
	let recipientClaimAmounts: Record<number, string> = {};
	let recipientClaimedAt = '';
	let recipientMethod: ClaimMethod = 'trade';
	let recipientNotes = '';

	let eventSummaries: EventSummaryItem[] = [];
	let eventSummariesLoading = false;
	let eventSummariesError = '';
	let eventSummaryOffset = 0;
	let eventSummaryHasMore = false;
	let selectedSettlementId = '';
	let eventWorkspace: EventWorkspace | null = null;
	let eventWorkspaceLoading = false;
	let eventWorkspaceError = '';
	let eventWorkspaceCache = new Map<number, EventWorkspace>();
	let selectedEventAllocationIds = new Set<number>();
	let eventClaimAmounts: Record<number, string> = {};
	let eventClaimedAt = '';
	let eventMethod: ClaimMethod = 'trade';
	let eventNotes = '';
	let showAllRecipientSummaries = true;
	let showAllEventSummaries = true;

	let emptyStateMode: 'default' | 'no-events' | 'no-settlements' = 'default';
	let errors: Record<string, string> = {};
	let isSubmitting = false;
	let pendingPickKey = '';

	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; href?: string; onClick?: () => void } | null = null;
	let dialogSecondaryAction: { label: string; href?: string; onClick?: () => void } | null = null;

	function findOrganizationByReference(reference: string) {
		return organizations.find((entry) => getOrganizationReference(entry) === reference) ?? null;
	}

	function getPrimaryGameId(summary: OrganizationManageSummary | null) {
		const primaryGame = summary?.games.find((game) => game.primary) ?? summary?.games[0];
		return primaryGame ? String(primaryGame.gameId) : '';
	}

	function toLocalDateTimeValue(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		const hours = `${date.getHours()}`.padStart(2, '0');
		const minutes = `${date.getMinutes()}`.padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function parseIsoToLocalDateTimeValue(value: string | null | undefined) {
		if (!value) {
			return '';
		}

		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '' : toLocalDateTimeValue(date);
	}

	function parseAmount(value: string) {
		const parsed = Number(value.trim());
		return Number.isFinite(parsed) ? parsed : Number.NaN;
	}

	function formatAmount(value: number) {
		return new Intl.NumberFormat(undefined, {
			maximumFractionDigits: 2,
		}).format(value);
	}

	function formatDateTime(value: string | null | undefined) {
		if (!value) {
			return '—';
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(date);
	}

	function describeRecentTime(value: string | null | undefined) {
		if (!value) {
			return '—';
		}

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return value;
		}

		const now = new Date();
		const isYesterday =
			date.getDate() !== now.getDate() &&
			now.getTime() - date.getTime() < 24 * 60 * 60 * 1000 &&
			now.getTime() - date.getTime() > 0;
		const time = new Intl.DateTimeFormat(undefined, {
			hour: 'numeric',
			minute: '2-digit',
		}).format(date);
		return isYesterday ? `${labels.yesterdayPrefix} ${time}` : time;
	}

	function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
			promise
				.then((value) => {
					clearTimeout(timer);
					resolve(value);
				})
				.catch((error: unknown) => {
					clearTimeout(timer);
					reject(error);
				});
		});
	}

	function pageSummary(offset: number) {
		return labels.pageSummaryLabel.replace('{page}', String(Math.floor(offset / SUMMARY_PAGE_LIMIT) + 1));
	}

	function closeDialog() {
		dialogOpen = false;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
	}

	function openLoginDialog() {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.authRequiredTitle;
		dialogMessage = labels.authRequiredBody;
		dialogPrimaryAction = { label: labels.loginLabel, href: `/${lang}/login` };
		dialogSecondaryAction = { label: labels.homeLabel, href: `/${lang}/` };
	}

	function resetRecipientSelectionState() {
		selectedRecipientId = '';
		showAllRecipientSummaries = true;
		includeSiblingCharacters = false;
		recipientWorkspace = null;
		siblingRecipientWorkspaces = [];
		recipientWorkspaceLoading = false;
		recipientWorkspaceError = '';
		selectedRecipientAllocationIds = new Set<number>();
		recipientClaimAmounts = {};
	}

	function resetEventSelectionState() {
		selectedSettlementId = '';
		showAllEventSummaries = true;
		eventWorkspace = null;
		eventWorkspaceLoading = false;
		eventWorkspaceError = '';
		selectedEventAllocationIds = new Set<number>();
		eventClaimAmounts = {};
	}

	function resetRecipientSummaryState() {
		recipientSummaries = [];
		recipientSummariesLoading = false;
		recipientSummariesError = '';
		recipientSummaryOffset = 0;
		recipientSummaryHasMore = false;
		resetRecipientSelectionState();
	}

	function resetEventSummaryState() {
		eventSummaries = [];
		eventSummariesLoading = false;
		eventSummariesError = '';
		eventSummaryOffset = 0;
		eventSummaryHasMore = false;
		resetEventSelectionState();
	}

	function resetWorkspaceState() {
		organizationSummary = null;
		selectedGameId = '';
		recipientWorkspaceCache = new Map();
		eventWorkspaceCache = new Map();
		resetRecipientSummaryState();
		resetEventSummaryState();
		errors = {};
	}

	function applyClaimDefaults(defaultClaimedAt: string | null | undefined, defaultMethod: ClaimMethod, mode: ClaimMode) {
		const nextClaimedAt = parseIsoToLocalDateTimeValue(defaultClaimedAt) || toLocalDateTimeValue(new Date());
		if (mode === 'recipient') {
			recipientClaimedAt = nextClaimedAt;
			recipientMethod = defaultMethod;
			return;
		}

		eventClaimedAt = nextClaimedAt;
		eventMethod = defaultMethod;
	}

	function aggregateUnitBreakdowns(groups: Array<LedgerClaimableUnitBreakdown[]>) {
		const breakdownMap = new Map<string, LedgerClaimableUnitBreakdown>();

		for (const group of groups) {
			for (const unit of group) {
				const key = `${unit.unitAssetId ?? 'null'}:${unit.unitAssetName ?? ''}`;
				const existing = breakdownMap.get(key);
				if (existing) {
					existing.amountTotal += unit.amountTotal;
					existing.allocationCount += unit.allocationCount;
					continue;
				}

				breakdownMap.set(key, { ...unit });
			}
		}

		return Array.from(breakdownMap.values());
	}

	function buildRecipientActiveAllocations(
		primary: RecipientWorkspace | null,
		siblings: RecipientWorkspace[],
		includeSiblings: boolean,
	) {
		return [
			...(primary?.allocations ?? []),
			...(includeSiblings ? siblings.flatMap((workspace) => workspace.allocations) : []),
		];
	}

	function syncRecipientAllocationSelection(allocations: RecipientAllocation[]) {
		const nextSelected = new Set<number>();
		const nextAmounts: Record<number, string> = {};

		for (const allocation of allocations) {
			nextSelected.add(allocation.allocationId);
			nextAmounts[allocation.allocationId] =
				recipientClaimAmounts[allocation.allocationId] ?? String(allocation.amount);
		}

		selectedRecipientAllocationIds = nextSelected;
		recipientClaimAmounts = nextAmounts;
	}

	function syncEventRecipientInputs(workspace: EventWorkspace) {
		const nextAmounts: Record<number, string> = {};
		for (const recipient of workspace.recipients) {
			nextAmounts[recipient.allocationId] =
				eventClaimAmounts[recipient.allocationId] ?? String(recipient.claimableAmount);
		}

		selectedEventAllocationIds = new Set<number>();
		eventClaimAmounts = nextAmounts;
	}

	async function hydrateEmptyStateMode() {
		if (!organization) {
			emptyStateMode = 'default';
			return;
		}

		try {
			const eventsResponse = await getApiAdapter().listOrganizationLedgerEvents(organization, {
				limit: 1,
				sortBy: 'occurredAt',
				sortOrder: 'desc',
			});
			emptyStateMode = eventsResponse.events.length > 0 ? 'no-settlements' : 'no-events';
		} catch {
			emptyStateMode = 'default';
		}
	}

	function getRecipientEmptyStateCopy() {
		if (emptyStateMode === 'no-events') {
			return {
				title: labels.recipientsEmptyNoEventsTitle,
				body: labels.recipientsEmptyNoEventsBody,
			};
		}

		if (emptyStateMode === 'no-settlements') {
			return {
				title: labels.recipientsEmptyNoSettlementsTitle,
				body: labels.recipientsEmptyNoSettlementsBody,
			};
		}

		return {
			title: labels.recipientsEmptyTitle,
			body: labels.recipientsEmptyBody,
		};
	}

	async function loadRecipientSummaries(trigger: 'initial' | 'organization-change' | 'game-change' | 'refresh' | 'submit' | 'mode-change') {
		if (!organization) {
			return;
		}

		recipientSummariesLoading = true;
		recipientSummariesError = '';

		try {
			const query = {
				gameId: selectedGameId ? Number(selectedGameId) : undefined,
				limit: SUMMARY_PAGE_LIMIT,
				offset: recipientSummaryOffset,
				sortBy: 'pendingAmount' as const,
				sortOrder: 'desc' as const,
			};
			devDebugLog('claims.recipient.summary', 'Loading recipient summary workspace', {
				trigger,
				organization,
				selectedGameId,
				query,
			});
			const response = await getApiAdapter().listOrganizationClaimableRecipientSummaries(organization, query);
			devDebugLog('claims.recipient.summary', 'Received recipient summary workspace', {
				trigger,
				organization,
				selectedGameId,
				count: response.recipients.length,
				pagination: response.pagination,
			});
			recipientSummaries = response.recipients;
			recipientSummaryHasMore = response.pagination.hasMore;
			if (!response.recipients.length) {
				await hydrateEmptyStateMode();
				resetRecipientSelectionState();
			} else {
				emptyStateMode = 'default';
				if (
					selectedRecipientId &&
					!response.recipients.some((recipient) => String(recipient.characterId) === selectedRecipientId)
				) {
					resetRecipientSelectionState();
				}
			}
		} catch (error) {
			recipientSummariesError = getErrorMessage(error, labels.recipientsEmptyBody);
			devDebugError('claims.recipient.summary', 'Failed to load recipient summary workspace', {
				trigger,
				organization,
				selectedGameId,
				error,
			});
		} finally {
			recipientSummariesLoading = false;
		}
	}

	async function loadEventSummaries(trigger: 'initial' | 'organization-change' | 'game-change' | 'refresh' | 'submit' | 'mode-change') {
		if (!organization) {
			return;
		}

		eventSummariesLoading = true;
		eventSummariesError = '';

		try {
			const query = {
				gameId: selectedGameId ? Number(selectedGameId) : undefined,
				limit: SUMMARY_PAGE_LIMIT,
				offset: eventSummaryOffset,
			};
			devDebugLog('claims.event.summary', 'Loading event disbursement summary workspace', {
				trigger,
				organization,
				selectedGameId,
				query,
			});
			const response = await getApiAdapter().listOrganizationDisburseableEventSummaries(organization, query);
			devDebugLog('claims.event.summary', 'Received event disbursement summary workspace', {
				trigger,
				organization,
				selectedGameId,
				count: response.items.length,
				pagination: response.pagination,
			});
			eventSummaries = response.items;
			eventSummaryHasMore = response.pagination.hasMore;
			if (!response.items.length) {
				await hydrateEmptyStateMode();
				resetEventSelectionState();
			} else {
				emptyStateMode = 'default';
				if (
					selectedSettlementId &&
					!response.items.some((item) => String(item.settlementId) === selectedSettlementId)
				) {
					resetEventSelectionState();
				}
			}
		} catch (error) {
			eventSummariesError = getErrorMessage(error, labels.eventsEmptyBody);
			devDebugError('claims.event.summary', 'Failed to load event disbursement summary workspace', {
				trigger,
				organization,
				selectedGameId,
				error,
			});
		} finally {
			eventSummariesLoading = false;
		}
	}

	async function loadActiveSummary(trigger: 'initial' | 'organization-change' | 'game-change' | 'refresh' | 'submit' | 'mode-change') {
		if (activeMode === 'recipient') {
			await loadRecipientSummaries(trigger);
			return;
		}

		await loadEventSummaries(trigger);
	}

	async function ensureSiblingRecipientWorkspaces() {
		if (!organization || !recipientWorkspace?.siblingCharacters.length) {
			siblingRecipientWorkspaces = [];
			if (recipientWorkspace) {
				syncRecipientAllocationSelection(recipientWorkspace.allocations);
			}
			return;
		}

		recipientWorkspaceLoading = true;
		recipientWorkspaceError = '';

		try {
			const workspaces = await Promise.all(
				recipientWorkspace.siblingCharacters.map(async (sibling) => {
					const cached = recipientWorkspaceCache.get(sibling.characterId);
					if (cached) {
						return cached;
					}

					const response = await getApiAdapter().getOrganizationClaimableRecipientWorkspace(
						organization,
						sibling.characterId,
					);
					recipientWorkspaceCache = new Map(recipientWorkspaceCache).set(sibling.characterId, response);
					return response;
				}),
			);
			siblingRecipientWorkspaces = workspaces;
			syncRecipientAllocationSelection(
				buildRecipientActiveAllocations(recipientWorkspace, workspaces, true),
			);
		} catch (error) {
			includeSiblingCharacters = false;
			siblingRecipientWorkspaces = [];
			recipientWorkspaceError = getErrorMessage(error, labels.detailBody);
			devDebugError('claims.recipient.pick', 'Failed to load sibling recipient workspace', {
				organization,
				selectedRecipientId,
				error,
			});
		} finally {
			recipientWorkspaceLoading = false;
		}
	}

	async function pickRecipient(characterId: number, options: { force?: boolean } = {}) {
		if (!organization || pendingPickKey) {
			return;
		}

		pendingPickKey = `recipient:${characterId}`;
		selectedRecipientId = String(characterId);
		recipientWorkspaceLoading = true;
		recipientWorkspaceError = '';
		includeSiblingCharacters = false;
		siblingRecipientWorkspaces = [];
		errors = {};

		try {
			let workspace = !options.force ? recipientWorkspaceCache.get(characterId) ?? null : null;
			if (!workspace) {
				workspace = await getApiAdapter().getOrganizationClaimableRecipientWorkspace(organization, characterId);
				recipientWorkspaceCache = new Map(recipientWorkspaceCache).set(characterId, workspace);
			}

			recipientWorkspace = workspace;
			showAllRecipientSummaries = false;
			applyClaimDefaults(workspace.defaults.defaultClaimedAt, workspace.defaults.defaultMethod, 'recipient');
			syncRecipientAllocationSelection(workspace.allocations);
			recipientNotes = '';
		} catch (error) {
			recipientWorkspace = null;
			selectedRecipientAllocationIds = new Set<number>();
			recipientClaimAmounts = {};
			recipientWorkspaceError = getErrorMessage(error, labels.detailBody);
			devDebugError('claims.recipient.pick', 'Failed to load recipient detail workspace', {
				organization,
				characterId,
				error,
			});
		} finally {
			pendingPickKey = '';
			recipientWorkspaceLoading = false;
		}
	}

	async function pickEventWorkspace(settlementId: number, options: { force?: boolean } = {}) {
		if (!organization || pendingPickKey) {
			return;
		}

		pendingPickKey = `event:${settlementId}`;
		selectedSettlementId = String(settlementId);
		eventWorkspaceLoading = true;
		eventWorkspaceError = '';
		errors = {};

		try {
			let workspace = !options.force ? eventWorkspaceCache.get(settlementId) ?? null : null;
			if (!workspace) {
				workspace = await getApiAdapter().getOrganizationLedgerSettlementDisbursementWorkspace(
					organization,
					settlementId,
				);
				eventWorkspaceCache = new Map(eventWorkspaceCache).set(settlementId, workspace);
			}

			eventWorkspace = workspace;
			showAllEventSummaries = false;
			applyClaimDefaults(workspace.defaults.defaultClaimedAt, workspace.defaults.defaultMethod, 'event');
			syncEventRecipientInputs(workspace);
			eventNotes = '';
		} catch (error) {
			eventWorkspace = null;
			selectedEventAllocationIds = new Set<number>();
			eventClaimAmounts = {};
			eventWorkspaceError = getErrorMessage(error, labels.eventDetailBody);
			devDebugError('claims.event.pick', 'Failed to load event disbursement detail workspace', {
				organization,
				settlementId,
				error,
			});
		} finally {
			pendingPickKey = '';
			eventWorkspaceLoading = false;
		}
	}

	async function syncOrganizationContext() {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		writePreferredOrganization(window.localStorage, organization);
		resetWorkspaceState();
		const manageSnapshot = await ensureOrganizationManageCache(organization);
		organizationSummary = manageSnapshot.organization;
		selectedGameId = getPrimaryGameId(manageSnapshot.organization);
		const url = new URL(window.location.href);
		url.searchParams.set('orgVanity', organization);
		window.history.replaceState({}, '', url);
		await loadActiveSummary('organization-change');
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

	function handleGameChange(event: CustomEvent<{ value: string }>) {
		if (event.detail.value === selectedGameId) {
			return;
		}

		selectedGameId = event.detail.value;
		resetRecipientSummaryState();
		resetEventSummaryState();
		void loadActiveSummary('game-change');
	}

	function handleModeChange(nextMode: ClaimMode) {
		if (nextMode === activeMode) {
			return;
		}

		activeMode = nextMode;
		errors = {};
		if (activeMode === 'recipient' && recipientSummaries.length === 0 && !recipientSummariesLoading) {
			void loadRecipientSummaries('mode-change');
			return;
		}

		if (activeMode === 'event' && eventSummaries.length === 0 && !eventSummariesLoading) {
			void loadEventSummaries('mode-change');
		}
	}

	function toggleRecipientSummaryScope() {
		showAllRecipientSummaries = !showAllRecipientSummaries;
	}

	function toggleEventSummaryScope() {
		showAllEventSummaries = !showAllEventSummaries;
	}

	function toggleRecipientAllocationSelection(allocationId: number) {
		const next = new Set(selectedRecipientAllocationIds);
		if (next.has(allocationId)) {
			next.delete(allocationId);
		} else {
			next.add(allocationId);
		}
		selectedRecipientAllocationIds = next;
	}

	function toggleEventRecipientSelection(allocationId: number) {
		const next = new Set(selectedEventAllocationIds);
		if (next.has(allocationId)) {
			next.delete(allocationId);
		} else {
			next.add(allocationId);
		}
		selectedEventAllocationIds = next;
	}

	function selectAllVisibleItems() {
		if (activeMode === 'recipient') {
			syncRecipientAllocationSelection(recipientActiveAllocations);
			return;
		}

		selectedEventAllocationIds = new Set(
			(eventWorkspace?.recipients ?? []).map((recipient) => recipient.allocationId),
		);
	}

	function clearVisibleItems() {
		if (activeMode === 'recipient') {
			selectedRecipientAllocationIds = new Set<number>();
			return;
		}

		selectedEventAllocationIds = new Set<number>();
	}

	function validate() {
		const nextErrors: Record<string, string> = {};
		const activeClaimedAt = activeMode === 'recipient' ? recipientClaimedAt : eventClaimedAt;
		if (!activeClaimedAt || Number.isNaN(new Date(activeClaimedAt).getTime())) {
			nextErrors.claimedAt = labels.validationDate;
		}

		if (activeMode === 'recipient') {
			if (!recipientSelectedItems.length) {
				nextErrors.selection = labels.validationSelection;
			}

			for (const item of recipientSelectedItems) {
				if (Number.isNaN(item.amount) || item.amount <= 0 || item.amount > item.allocation.amount) {
					nextErrors[`allocation-${item.allocation.allocationId}`] = labels.validationAmount;
				}
			}
		} else {
			if (!eventSelectedItems.length) {
				nextErrors.selection = labels.validationSelection;
			}

			for (const item of eventSelectedItems) {
				if (
					Number.isNaN(item.amount) ||
					item.amount <= 0 ||
					item.amount > item.recipient.claimableAmount
				) {
					nextErrors[`allocation-${item.recipient.allocationId}`] = labels.validationAmount;
				}
			}
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	async function submitClaims() {
		if (!organization || isSubmitting || !validate()) {
			return;
		}

		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.loadingSubmitTitle;
		dialogMessage = labels.loadingSubmitBody;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
		isSubmitting = true;

		try {
			let response: unknown;

			if (activeMode === 'recipient') {
				if (!recipientWorkspace) {
					return;
				}

				const payload: LedgerClaimableRecipientDisbursementRequest = {
					claimedAt: new Date(recipientClaimedAt).toISOString(),
					includeSiblingCharacters,
					items: recipientSelectedItems.map(({ allocation, amount }) => ({
						allocationId: allocation.allocationId,
						amount,
					})),
					method: recipientMethod,
					notes: recipientNotes.trim() || undefined,
				};
				devDebugLog('claims.recipient.submit', 'Submitting recipient disbursement payload', {
					organization,
					characterId: recipientWorkspace.recipient.characterId,
					payload,
				});
				response = await withTimeout(
					getApiAdapter().disburseOrganizationClaimableRecipient(
						organization,
						recipientWorkspace.recipient.characterId,
						payload,
					),
					SUBMIT_TIMEOUT_MS,
				);
				devDebugLog('claims.recipient.submit', 'Received recipient disbursement response', {
					organization,
					characterId: recipientWorkspace.recipient.characterId,
					response,
				});
			} else {
				if (!eventWorkspace) {
					return;
				}

				const payload: LedgerSettlementClaimsRequest = {
					claimedAt: new Date(eventClaimedAt).toISOString(),
					items: eventSelectedItems.map(({ recipient, amount }) => ({
						allocationId: recipient.allocationId,
						characterId: recipient.characterId,
						amount,
					})),
					method: eventMethod,
					notes: eventNotes.trim() || undefined,
				};
				devDebugLog('claims.event.submit', 'Submitting settlement claim payload', {
					organization,
					settlementId: eventWorkspace.settlement.id,
					payload,
				});
				response = await withTimeout(
					getApiAdapter().createOrganizationLedgerSettlementClaims(
						organization,
						eventWorkspace.settlement.id,
						payload,
					),
					SUBMIT_TIMEOUT_MS,
				);
				devDebugLog('claims.event.submit', 'Received settlement claim response', {
					organization,
					settlementId: eventWorkspace.settlement.id,
					response,
				});
			}

			dialogState = 'success';
			dialogTitle = labels.successSubmitTitle;
			dialogMessage = labels.successSubmitBody;
			dialogPrimaryAction = {
				label: labels.successCloseLabel,
				onClick: () => closeDialog(),
			};

			if (typeof window !== 'undefined') {
				recordRecentClaimCreation(window.localStorage, organization);
			}

			recipientWorkspaceCache = new Map();
			eventWorkspaceCache = new Map();
			if (activeMode === 'recipient') {
				const previousRecipientId = Number(selectedRecipientId);
				await loadRecipientSummaries('submit');
				if (
					previousRecipientId &&
					recipientSummaries.some((recipient) => recipient.characterId === previousRecipientId)
				) {
					await pickRecipient(previousRecipientId, { force: true });
				}
			} else {
				const previousSettlementId = Number(selectedSettlementId);
				await loadEventSummaries('submit');
				if (
					previousSettlementId &&
					eventSummaries.some((item) => item.settlementId === previousSettlementId)
				) {
					await pickEventWorkspace(previousSettlementId, { force: true });
				}
			}
		} catch (error) {
			devDebugError(
				activeMode === 'recipient' ? 'claims.recipient.submit' : 'claims.event.submit',
				'Claim submission failed',
				{
					organization,
					activeMode,
					error,
				},
			);
			dialogState = 'error';
			dialogTitle = labels.errorSubmitTitle;
			dialogMessage =
				error instanceof Error && error.message === 'timeout'
					? labels.errorSubmitTimeoutBody
					: getErrorMessage(error, labels.errorSubmitTitle);
			dialogPrimaryAction = {
				label: labels.errorRetryLabel,
				onClick: () => {
					closeDialog();
					void submitClaims();
				},
			};
			dialogSecondaryAction = {
				label: labels.successCloseLabel,
				onClick: () => closeDialog(),
			};
		} finally {
			isSubmitting = false;
		}
	}

	$: newEventHref = organization ? `/${lang}/guilds/events/new?orgVanity=${encodeURIComponent(organization)}` : `/${lang}/guilds/events/new`;
	$: newSettlementHref = organization
		? `/${lang}/guilds/settlements/new?orgVanity=${encodeURIComponent(organization)}`
		: `/${lang}/guilds/settlements/new`;
	$: selectedOrganizationCard = organization ? findOrganizationByReference(organization) : null;
	$: organizationOptions = organizations.map((entry) => ({
		value: getOrganizationReference(entry),
		label: entry.name,
		metaLabel: entry.vanity ? `@${entry.vanity}` : `${entry.stats.memberCount} members`,
		iconUrl: entry.iconUrl,
	}));
	$: gameOptions = organizationSummary?.games.map((game) => ({
		value: String(game.gameId),
		label: game.displayName ?? game.name,
		iconUrl: game.iconUrl,
		resolvedIconUrl: game.resolvedIconUrl,
		officialSiteUrl: game.officialSiteUrl,
	})) ?? [] as GameOption[];
	$: recipientActiveAllocations = buildRecipientActiveAllocations(
		recipientWorkspace,
		siblingRecipientWorkspaces,
		includeSiblingCharacters,
	);
	$: recipientUnitBreakdown = aggregateUnitBreakdowns(
		recipientWorkspace
			? [
					recipientWorkspace.unitBreakdown,
					...(includeSiblingCharacters
						? siblingRecipientWorkspaces.map((workspace) => workspace.unitBreakdown)
						: []),
				]
			: [],
	);
	$: recipientSelectedItems = recipientActiveAllocations
		.filter((allocation) => selectedRecipientAllocationIds.has(allocation.allocationId))
		.map((allocation) => ({
			allocation,
			amount: parseAmount(
				recipientClaimAmounts[allocation.allocationId] ?? String(allocation.amount),
			),
		}));
	$: eventSelectedItems = (eventWorkspace?.recipients ?? [])
		.filter((recipient) => selectedEventAllocationIds.has(recipient.allocationId))
		.map((recipient) => ({
			recipient,
			amount: parseAmount(
				eventClaimAmounts[recipient.allocationId] ?? String(recipient.claimableAmount),
			),
		}));
	$: selectedAmountTotal = (activeMode === 'recipient' ? recipientSelectedItems : eventSelectedItems).reduce(
		(total, item) => (Number.isNaN(item.amount) ? total : total + item.amount),
		0,
	);
	$: selectedCount = activeMode === 'recipient' ? recipientSelectedItems.length : eventSelectedItems.length;
	$: selectedCountLabel =
		activeMode === 'recipient' ? labels.totalAllocationsLabel : labels.totalRecipientsLabel;
	$: recipientEmptyStateCopy = getRecipientEmptyStateCopy();
	$: visibleRecipientSummaries =
		showAllRecipientSummaries || !selectedRecipientId
			? recipientSummaries
			: recipientSummaries.filter((recipient) => String(recipient.characterId) === selectedRecipientId);
	$: visibleEventSummaries =
		showAllEventSummaries || !selectedSettlementId
			? eventSummaries
			: eventSummaries.filter((item) => String(item.settlementId) === selectedSettlementId);

	onMount(() => {
		const now = toLocalDateTimeValue(new Date());
		recipientClaimedAt = now;
		eventClaimedAt = now;
		void initializeOrganizations();
	});
</script>

<section class="app-hero">
	<div class="app-hero-copy">
		<p class="app-eyebrow">{labels.eyebrow}</p>
		<h1>{labels.title}</h1>
		<p class="app-intro">{labels.intro}</p>
	</div>

	<aside class="app-status-card">
		<p class="app-status-label">{labels.totalAmountLabel}</p>
		<p class="app-status-value">{formatAmount(selectedAmountTotal)}</p>
		<p class="app-intro">{selectedCountLabel}: {selectedCount}</p>
	</aside>
</section>

<section class="app-section">
	<article class="workspace-card workspace-context-card">
		<div class="workspace-head">
			<div>
				<p class="app-card-label">{labels.contextTitle}</p>
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
			<div class="context-grid">
				<label class="context-field">
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

				<label class="context-field">
					<span>{labels.gameSelectLabel}</span>
					<GamePicker
						value={selectedGameId}
						ariaLabel={labels.gameSelectLabel}
						placeholder={labels.gameSelectPlaceholder}
						items={gameOptions}
						disabled={gameOptions.length === 0}
						on:change={handleGameChange}
					/>
				</label>
			</div>

			<div class="mode-section">
				<p class="mode-label">{labels.modeLabel}</p>
				<div class="mode-switch" role="tablist" aria-label={labels.modeLabel}>
					<button
						type="button"
						class="mode-button"
						class:active={activeMode === 'recipient'}
						on:click={() => handleModeChange('recipient')}
					>
						<strong>{labels.modeRecipientLabel}</strong>
						<small>{labels.modeRecipientBody}</small>
					</button>
					<button
						type="button"
						class="mode-button"
						class:active={activeMode === 'event'}
						on:click={() => handleModeChange('event')}
					>
						<strong>{labels.modeEventLabel}</strong>
						<small>{labels.modeEventBody}</small>
					</button>
				</div>
			</div>
		{:else}
			<p class="workspace-meta">{labels.orgRequiredBody}</p>
		{/if}
	</article>
</section>

{#if !organization}
	<section class="app-section">
		<article class="workspace-card workspace-empty">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</article>
	</section>
{:else}
	<section class="app-section workspace-stack">
		<article class="workspace-card">
			<div class="workspace-head">
				<div>
					<p class="app-card-label">
						{activeMode === 'recipient' ? labels.recipientsTitle : labels.eventsTitle}
					</p>
					<h2>{activeMode === 'recipient' ? labels.recipientsTitle : labels.eventsTitle}</h2>
					<p>{activeMode === 'recipient' ? labels.recipientsBody : labels.eventsBody}</p>
				</div>
				<button
					type="button"
					class="ledger-quiet-button"
					on:click={() =>
						activeMode === 'recipient'
							? loadRecipientSummaries('refresh')
							: loadEventSummaries('refresh')}
				>
					{activeMode === 'recipient' ? labels.recipientsRefreshLabel : labels.eventsRefreshLabel}
				</button>
			</div>

			{#if activeMode === 'recipient' && selectedRecipientId}
				<div class="summary-scope-bar">
					<button type="button" class="ledger-quiet-button" on:click={toggleRecipientSummaryScope}>
						{showAllRecipientSummaries ? labels.summaryFocusSelectedLabel : labels.summaryShowAllLabel}
					</button>
				</div>
			{:else if activeMode === 'event' && selectedSettlementId}
				<div class="summary-scope-bar">
					<button type="button" class="ledger-quiet-button" on:click={toggleEventSummaryScope}>
						{showAllEventSummaries ? labels.summaryFocusSelectedLabel : labels.summaryShowAllLabel}
					</button>
				</div>
			{/if}

			{#if activeMode === 'recipient'}
				{#if recipientSummariesLoading}
					<ClaimLoadingState label={labels.recipientsLoadingLabel} />
				{:else if recipientSummariesError}
					<p class="workspace-error">{recipientSummariesError}</p>
				{:else if !recipientSummaries.length}
					<div class="workspace-empty">
						<h3>{recipientEmptyStateCopy.title}</h3>
						<p>{recipientEmptyStateCopy.body}</p>
						<p class="workspace-empty-note">{labels.recipientsEmptyRefreshHint}</p>
						<div class="workspace-empty-actions">
							{#if emptyStateMode === 'no-events'}
								<a class="ledger-primary-action-button" href={newEventHref}>{labels.recipientsEmptyNewEventLabel}</a>
							{:else if emptyStateMode === 'no-settlements'}
								<a class="ledger-primary-action-button" href={newSettlementHref}>{labels.recipientsEmptyNewSettlementLabel}</a>
							{/if}
						</div>
					</div>
				{:else}
					{#key `recipient:${showAllRecipientSummaries}:${selectedRecipientId}:${visibleRecipientSummaries.length}`}
						<div class="summary-table-frame">
							<div class="summary-table-scroll">
								<table class="summary-table">
									<thead>
										<tr>
											<th>{labels.summaryCharacterLabel}</th>
											<th>{labels.summaryMemberLabel}</th>
											<th>{labels.summaryPendingItemsLabel}</th>
											<th>{labels.summaryActionLabel}</th>
										</tr>
									</thead>
									<tbody>
										{#each visibleRecipientSummaries as recipient}
											<tr class:selected-row={String(recipient.characterId) === selectedRecipientId}>
												<td>
													<div class="table-primary-cell">
														<strong>{recipient.characterName}</strong>
													</div>
												</td>
												<td>{recipient.memberDisplayName ?? labels.noMemberLabel}</td>
												<td>
													<ul class="table-breakdown-list">
														{#each recipient.pendingUnitBreakdown as unit}
															<li>
																<strong>{formatAmount(unit.amountTotal)}</strong>
																<span>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`}</span>
															</li>
														{/each}
													</ul>
													<p class="table-subcopy">
														{labels.totalAllocationsLabel}: {recipient.pendingAllocationCount}
													</p>
												</td>
												<td class="summary-table-action">
													<button
														type="button"
														class="ledger-quiet-button"
														disabled={Boolean(pendingPickKey)}
														on:click={() => void pickRecipient(recipient.characterId)}
													>
														{#if pendingPickKey === `recipient:${recipient.characterId}`}
															{labels.pickPendingLabel}
														{:else if String(recipient.characterId) === selectedRecipientId}
															{labels.pickedLabel}
														{:else}
															{labels.pickLabel}
														{/if}
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/key}

					<div class="summary-footer">
						<button
							type="button"
							class="ledger-quiet-button"
							disabled={recipientSummaryOffset === 0 || recipientSummariesLoading}
							on:click={() => {
								recipientSummaryOffset = Math.max(0, recipientSummaryOffset - SUMMARY_PAGE_LIMIT);
								void loadRecipientSummaries('refresh');
							}}
						>
							{labels.pagePreviousLabel}
						</button>
						<p class="workspace-meta">{pageSummary(recipientSummaryOffset)}</p>
						<button
							type="button"
							class="ledger-quiet-button"
							disabled={!recipientSummaryHasMore || recipientSummariesLoading}
							on:click={() => {
								recipientSummaryOffset += SUMMARY_PAGE_LIMIT;
								void loadRecipientSummaries('refresh');
							}}
						>
							{labels.pageNextLabel}
						</button>
					</div>
				{/if}
			{:else}
				{#if eventSummariesLoading}
					<ClaimLoadingState label={labels.eventsLoadingLabel} />
				{:else if eventSummariesError}
					<p class="workspace-error">{eventSummariesError}</p>
				{:else if !eventSummaries.length}
					<div class="workspace-empty">
						<h3>{labels.eventsEmptyTitle}</h3>
						<p>{labels.eventsEmptyBody}</p>
						<p class="workspace-empty-note">{labels.recipientsEmptyRefreshHint}</p>
						<div class="workspace-empty-actions">
							{#if emptyStateMode === 'no-events'}
								<a class="ledger-primary-action-button" href={newEventHref}>{labels.recipientsEmptyNewEventLabel}</a>
							{:else if emptyStateMode === 'no-settlements'}
								<a class="ledger-primary-action-button" href={newSettlementHref}>{labels.recipientsEmptyNewSettlementLabel}</a>
							{/if}
						</div>
					</div>
				{:else}
					{#key `event:${showAllEventSummaries}:${selectedSettlementId}:${visibleEventSummaries.length}`}
						<div class="summary-table-frame">
							<div class="summary-table-scroll">
								<table class="summary-table">
									<thead>
										<tr>
											<th>{labels.summaryEventLabel}</th>
											<th>{labels.summaryHolderLabel}</th>
											<th>{labels.summaryPendingItemsLabel}</th>
											<th>{labels.summaryDecidedAtLabel}</th>
											<th>{labels.summaryActionLabel}</th>
										</tr>
									</thead>
									<tbody>
										{#each visibleEventSummaries as item}
											<tr class:selected-row={String(item.settlementId) === selectedSettlementId}>
												<td>
													<div class="table-primary-cell">
														<strong>{item.eventTitle ?? `#${item.eventId ?? '—'}`}</strong>
														<small>{item.settlementTitle}</small>
													</div>
												</td>
												<td>{item.holderLabel ?? '—'}</td>
												<td>
													<ul class="table-breakdown-list">
														<li>
															<strong>{formatAmount(item.totalAmount)}</strong>
															<span>{item.unitAssetName ?? `Asset #${item.unitAssetId ?? '—'}`}</span>
														</li>
													</ul>
													<p class="table-subcopy">
														{labels.totalRecipientsLabel}: {item.pendingRecipientCount}
													</p>
												</td>
												<td>{formatDateTime(item.decidedAt)}</td>
												<td class="summary-table-action">
													<button
														type="button"
														class="ledger-quiet-button"
														disabled={Boolean(pendingPickKey)}
														on:click={() => void pickEventWorkspace(item.settlementId)}
													>
														{#if pendingPickKey === `event:${item.settlementId}`}
															{labels.pickPendingLabel}
														{:else if String(item.settlementId) === selectedSettlementId}
															{labels.pickedLabel}
														{:else}
															{labels.pickLabel}
														{/if}
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/key}

					<div class="summary-footer">
						<button
							type="button"
							class="ledger-quiet-button"
							disabled={eventSummaryOffset === 0 || eventSummariesLoading}
							on:click={() => {
								eventSummaryOffset = Math.max(0, eventSummaryOffset - SUMMARY_PAGE_LIMIT);
								void loadEventSummaries('refresh');
							}}
						>
							{labels.pagePreviousLabel}
						</button>
						<p class="workspace-meta">{pageSummary(eventSummaryOffset)}</p>
						<button
							type="button"
							class="ledger-quiet-button"
							disabled={!eventSummaryHasMore || eventSummariesLoading}
							on:click={() => {
								eventSummaryOffset += SUMMARY_PAGE_LIMIT;
								void loadEventSummaries('refresh');
							}}
						>
							{labels.pageNextLabel}
						</button>
					</div>
				{/if}
			{/if}
		</article>

		<article class="workspace-card workspace-main">
			<div class="workspace-head">
				<div>
					<p class="app-card-label">
						{activeMode === 'recipient' ? labels.detailTitle : labels.eventDetailTitle}
					</p>
					<h2>{activeMode === 'recipient' ? labels.detailTitle : labels.eventDetailTitle}</h2>
					<p>{activeMode === 'recipient' ? labels.detailBody : labels.eventDetailBody}</p>
				</div>
			</div>

			{#if activeMode === 'recipient'}
				{#if recipientWorkspaceLoading}
					<ClaimLoadingState label={labels.detailLoadingLabel} />
				{:else if recipientWorkspaceError}
					<p class="workspace-error">{recipientWorkspaceError}</p>
				{:else if !recipientWorkspace}
					<div class="workspace-empty">
						<h3>{labels.detailReadyTitle}</h3>
						<p>{labels.detailReadyRecipientBody}</p>
					</div>
				{:else}
					<div class="summary-grid">
						<div class="summary-tile">
							<span>{labels.memberLabel}</span>
							<strong>{recipientWorkspace.recipient.memberDisplayName ?? labels.noMemberLabel}</strong>
						</div>
						<div class="summary-tile">
							<span>{labels.totalAmountLabel}</span>
							<strong>{formatAmount(selectedAmountTotal)}</strong>
						</div>
						<div class="summary-tile">
							<span>{labels.totalAllocationsLabel}</span>
							<strong>{selectedRecipientAllocationIds.size}</strong>
						</div>
					</div>

					{#if recipientWorkspace.siblingCharacters.length}
						<label class="sibling-toggle">
							<input
								type="checkbox"
								bind:checked={includeSiblingCharacters}
								on:change={() => {
									if (includeSiblingCharacters) {
										void ensureSiblingRecipientWorkspaces();
										return;
									}

									siblingRecipientWorkspaces = [];
									syncRecipientAllocationSelection(recipientWorkspace.allocations);
								}}
							/>
							<span>
								<strong>{labels.siblingPromptLabel}</strong>
								<small>
									{labels.siblingPromptHint}
									{#each recipientWorkspace.siblingCharacters as sibling, index}
										{sibling.characterName}{index < recipientWorkspace.siblingCharacters.length - 1 ? ' / ' : ''}
									{/each}
								</small>
							</span>
						</label>
					{/if}

					<div class="breakdown-card">
						<p class="app-card-label">{labels.unitBreakdownLabel}</p>
						<ul>
							{#each recipientUnitBreakdown as unit}
								<li>
									<strong>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`}</strong>
									<span>{formatAmount(unit.amountTotal)} · {unit.allocationCount}</span>
								</li>
							{/each}
						</ul>
					</div>

					<div class="allocations-head">
						<div>
							<p class="app-card-label">{labels.allocationsTitle}</p>
							<h3>{labels.allocationsTitle}</h3>
						</div>
						<div class="allocations-actions">
							<button type="button" class="ledger-quiet-button" on:click={selectAllVisibleItems}>
								{labels.selectAllLabel}
							</button>
							<button type="button" class="ledger-quiet-button" on:click={clearVisibleItems}>
								{labels.clearAllLabel}
							</button>
						</div>
					</div>

					<div class="allocation-list">
						{#each recipientActiveAllocations as allocation}
							<label class="allocation-card">
								<div class="allocation-check">
									<input
										type="checkbox"
										checked={selectedRecipientAllocationIds.has(allocation.allocationId)}
										on:change={() => toggleRecipientAllocationSelection(allocation.allocationId)}
									/>
								</div>
								<div class="allocation-main">
									<div class="allocation-row">
										<strong>{allocation.settlementTitle}</strong>
										<span>{labels.allocationRecipientLabel}: {allocation.ownerCharacterName}</span>
									</div>
									<div class="allocation-meta">
										<span>{labels.allocationSettlementLabel}: #{allocation.settlementId}</span>
										<span>{labels.allocationEventLabel}: {allocation.eventTitle ?? `#${allocation.eventId ?? '—'}`}</span>
										<span>{labels.allocationOccurredAtLabel}: {formatDateTime(allocation.eventOccurredAt)}</span>
										<span>{labels.allocationUnitLabel}: {allocation.unitAssetName ?? `Asset #${allocation.unitAssetId ?? '—'}`}</span>
									</div>
								</div>
								<div class="allocation-side">
									<label>
										<span>{labels.allocationAmountLabel}</span>
										<input
											type="number"
											min="0"
											step="0.01"
											bind:value={recipientClaimAmounts[allocation.allocationId]}
										/>
									</label>
									<small>{describeRecentTime(allocation.settlementDecidedAt)}</small>
									{#if errors[`allocation-${allocation.allocationId}`]}
										<p class="field-error">{errors[`allocation-${allocation.allocationId}`]}</p>
									{/if}
								</div>
							</label>
						{/each}
					</div>

					<form class="claim-form" on:submit|preventDefault={submitClaims}>
						<div class="field-grid">
							<label>
								<span>{labels.formClaimedAtLabel} · {labels.requiredHint}</span>
								<input type="datetime-local" bind:value={recipientClaimedAt} />
								{#if errors.claimedAt}
									<p class="field-error">{errors.claimedAt}</p>
								{/if}
							</label>

							<label>
								<span>{labels.formMethodLabel} · {labels.optionalHint}</span>
								<select bind:value={recipientMethod}>
									{#each methodOptions as option}
										<option value={option.value}>{labels[option.labelKey]}</option>
									{/each}
								</select>
							</label>
						</div>

						<label>
							<span>{labels.formNotesLabel} · {labels.optionalHint}</span>
							<textarea rows="3" bind:value={recipientNotes} placeholder={labels.formNotesPlaceholder}></textarea>
						</label>

						{#if errors.selection}
							<p class="field-error">{errors.selection}</p>
						{/if}

						<div class="form-actions">
							<button type="submit" class="ledger-primary-action-button" disabled={isSubmitting}>
								{labels.formSubmitLabel}
							</button>
						</div>
					</form>
				{/if}
			{:else}
				{#if eventWorkspaceLoading}
					<ClaimLoadingState label={labels.eventDetailLoadingLabel} />
				{:else if eventWorkspaceError}
					<p class="workspace-error">{eventWorkspaceError}</p>
				{:else if !eventWorkspace}
					<div class="workspace-empty">
						<h3>{labels.detailReadyTitle}</h3>
						<p>{labels.detailReadyEventBody}</p>
					</div>
				{:else}
					<div class="summary-grid">
						<div class="summary-tile">
							<span>{labels.allocationSettlementLabel}</span>
							<strong>{eventWorkspace.settlement.title}</strong>
						</div>
						<div class="summary-tile">
							<span>{labels.allocationEventLabel}</span>
							<strong>{eventWorkspace.settlement.eventTitle ?? `#${eventWorkspace.settlement.eventId ?? '—'}`}</strong>
						</div>
						<div class="summary-tile">
							<span>{labels.totalAmountLabel}</span>
							<strong>{formatAmount(selectedAmountTotal)}</strong>
						</div>
						<div class="summary-tile">
							<span>{labels.eventPendingRecipientsLabel}</span>
							<strong>{selectedEventAllocationIds.size}</strong>
						</div>
					</div>

					<div class="breakdown-card">
						<p class="app-card-label">{labels.allocationUnitLabel}</p>
						<ul>
							<li>
								<strong>{eventWorkspace.settlement.unitAssetName ?? `Asset #${eventWorkspace.settlement.unitAssetId ?? '—'}`}</strong>
								<span>{formatAmount(eventWorkspace.settlement.totalAmount)} · {eventWorkspace.recipients.length}</span>
							</li>
						</ul>
					</div>

					<div class="allocations-head">
						<div>
							<p class="app-card-label">{labels.eventRecipientsTitle}</p>
							<h3>{labels.eventRecipientsTitle}</h3>
						</div>
						<div class="allocations-actions">
							<button type="button" class="ledger-quiet-button" on:click={selectAllVisibleItems}>
								{labels.selectAllLabel}
							</button>
							<button type="button" class="ledger-quiet-button" on:click={clearVisibleItems}>
								{labels.clearAllLabel}
							</button>
						</div>
					</div>

					<div class="allocation-list">
						{#each eventWorkspace.recipients as recipient}
							<label class="allocation-card">
								<div class="allocation-check">
									<input
										type="checkbox"
										checked={selectedEventAllocationIds.has(recipient.allocationId)}
										on:change={() => toggleEventRecipientSelection(recipient.allocationId)}
									/>
								</div>
								<div class="allocation-main">
									<div class="allocation-row">
										<strong>{recipient.characterName}</strong>
										<span>{recipient.memberDisplayName ?? labels.noMemberLabel}</span>
									</div>
									<div class="allocation-meta">
										<span>{labels.allocationAmountLabel}: {formatAmount(recipient.claimableAmount)}</span>
										<span>{labels.allocationRecipientLabel}: #{recipient.characterId}</span>
										<span>Status: {recipient.claimStatus}</span>
									</div>
								</div>
								<div class="allocation-side">
									<label>
										<span>{labels.allocationAmountLabel}</span>
										<input
											type="number"
											min="0"
											step="0.01"
											bind:value={eventClaimAmounts[recipient.allocationId]}
										/>
									</label>
									<small>{formatDateTime(eventWorkspace.settlement.decidedAt)}</small>
									{#if errors[`allocation-${recipient.allocationId}`]}
										<p class="field-error">{errors[`allocation-${recipient.allocationId}`]}</p>
									{/if}
								</div>
							</label>
						{/each}
					</div>

					<form class="claim-form" on:submit|preventDefault={submitClaims}>
						<div class="field-grid">
							<label>
								<span>{labels.formClaimedAtLabel} · {labels.requiredHint}</span>
								<input type="datetime-local" bind:value={eventClaimedAt} />
								{#if errors.claimedAt}
									<p class="field-error">{errors.claimedAt}</p>
								{/if}
							</label>

							<label>
								<span>{labels.formMethodLabel} · {labels.optionalHint}</span>
								<select bind:value={eventMethod}>
									{#each methodOptions as option}
										<option value={option.value}>{labels[option.labelKey]}</option>
									{/each}
								</select>
							</label>
						</div>

						<label>
							<span>{labels.formNotesLabel} · {labels.optionalHint}</span>
							<textarea rows="3" bind:value={eventNotes} placeholder={labels.formNotesPlaceholder}></textarea>
						</label>

						{#if errors.selection}
							<p class="field-error">{errors.selection}</p>
						{/if}

						<div class="form-actions">
							<button type="submit" class="ledger-primary-action-button" disabled={isSubmitting}>
								{labels.formSubmitLabel}
							</button>
						</div>
					</form>
				{/if}
			{/if}
		</article>
	</section>
{/if}

<RequestStatusDialog
	open={dialogOpen}
	state={dialogState}
	title={dialogTitle}
	message={dialogMessage}
	primaryAction={dialogPrimaryAction}
	secondaryAction={dialogSecondaryAction}
	onClose={closeDialog}
/>

<style>
	.workspace-stack {
		display: grid;
		gap: 20px;
	}

	.workspace-card {
		padding: 24px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: var(--radius-md);
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 18px;
	}

	.workspace-context-card {
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ledger-accent) 12%, transparent), transparent 38%),
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, white), var(--surface));
	}

	.workspace-main {
		min-width: 0;
	}

	.workspace-head,
	.allocations-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: start;
	}

	.context-grid,
	.field-grid,
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.summary-grid {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.context-field,
	.claim-form > label,
	.field-grid label,
	.allocation-side label {
		display: grid;
		gap: 8px;
	}

	.context-field span,
	.claim-form > label span,
	.field-grid span,
	.allocation-side span,
	.mode-label {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.mode-section {
		display: grid;
		gap: 10px;
	}

	.mode-label,
	.workspace-head p,
	.workspace-empty p,
	.workspace-empty-note,
	.workspace-meta {
		margin: 0;
		color: var(--text-soft);
	}

	.mode-switch {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.mode-button {
		padding: 16px 18px;
		border-radius: 20px;
		border: 1px solid var(--ui-control-border);
		background: var(--ui-control-bg);
		color: var(--text-main);
		text-align: left;
		display: grid;
		gap: 6px;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.mode-button.active {
		border-color: var(--ui-selection-border);
		background: var(--ui-selection-bg);
		color: var(--ui-selection-color);
	}

	.mode-button:hover {
		transform: translateY(-1px);
	}

	.mode-button strong,
	.mode-button small {
		display: block;
	}

	.mode-button small {
		color: inherit;
		line-height: 1.55;
		opacity: 0.9;
	}

	.workspace-head h2,
	.workspace-empty h2,
	.workspace-empty h3,
	.allocations-head h3 {
		margin: 10px 0 0;
		letter-spacing: -0.03em;
	}

	.workspace-empty-actions,
	.allocations-actions,
	.form-actions,
	.summary-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.workspace-error,
	.field-error {
		margin: 0;
		color: #c43c3c;
	}

	.summary-scope-bar {
		display: flex;
		justify-content: flex-end;
	}

	.summary-table-frame {
		animation: summary-surface-in 0.24s ease;
	}

	.summary-table-scroll {
		overflow-x: auto;
		border: 1px solid var(--ui-control-border);
		border-radius: 20px;
		background: var(--ui-control-bg-strong);
	}

	.summary-table {
		width: 100%;
		min-width: 760px;
		border-collapse: collapse;
	}

	.summary-table th,
	.summary-table td {
		padding: 14px 16px;
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid color-mix(in srgb, var(--ui-control-border) 82%, transparent);
	}

	.summary-table tbody tr:last-child td {
		border-bottom: none;
	}

	.summary-table th {
		font-size: 0.83rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--text-soft);
		background: color-mix(in srgb, var(--ui-control-bg) 92%, white);
	}

	.selected-row td {
		background: var(--ui-selected-row-bg);
	}

	.summary-table-action {
		width: 132px;
	}

	.table-primary-cell {
		display: grid;
		gap: 4px;
	}

	.table-primary-cell small,
	.table-subcopy,
	.summary-tile span,
	.breakdown-card span,
	.sibling-toggle small,
	.allocation-meta,
	.allocation-side small {
		color: var(--text-soft);
	}

	.table-subcopy {
		margin: 8px 0 0;
	}

	.table-breakdown-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 6px;
	}

	.table-breakdown-list li {
		display: grid;
		gap: 2px;
	}

	.summary-tile,
	.breakdown-card,
	.sibling-toggle,
	.allocation-card {
		padding: 16px;
		border: 1px solid var(--ui-control-border);
		border-radius: 18px;
		background: var(--ui-control-bg-strong);
	}

	.summary-tile span,
	.summary-tile strong {
		display: block;
	}

	.summary-tile strong {
		margin-top: 8px;
		font-size: 1.1rem;
	}

	.sibling-toggle {
		display: flex;
		gap: 12px;
		align-items: start;
	}

	.sibling-toggle span {
		display: grid;
		gap: 4px;
	}

	.breakdown-card ul {
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.breakdown-card li,
	.allocation-row,
	.allocation-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
		justify-content: space-between;
	}

	.allocation-list {
		display: grid;
		gap: 14px;
	}

	.allocation-card {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) 190px;
		gap: 16px;
		align-items: start;
	}

	.allocation-main,
	.allocation-side {
		display: grid;
		gap: 10px;
	}

	input,
	select,
	textarea {
		width: 100%;
		padding: 12px 14px;
		border: 1px solid var(--ui-control-border);
		border-radius: 16px;
		background: var(--ui-control-bg);
		color: var(--text-main);
		font: inherit;
	}

	textarea {
		min-height: 110px;
		resize: vertical;
	}

	.claim-form {
		display: grid;
		gap: 16px;
	}

	@keyframes summary-surface-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 980px) {
		.context-grid,
		.mode-switch,
		.field-grid,
		.summary-grid {
			grid-template-columns: 1fr;
		}

		.allocation-card {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.allocation-side {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 720px) {
		.workspace-card {
			padding: 20px;
		}

		.workspace-head,
		.allocations-head,
		.breakdown-card li {
			grid-template-columns: 1fr;
		}

		.summary-table {
			min-width: 620px;
		}
	}
</style>
