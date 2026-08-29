<script lang="ts">
	import { onMount } from 'svelte';

	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { getErrorMessage } from '../../../libs/api/auth/session.ts';
	import { recordRecentClaimCreation } from '../../../libs/claims/recent-claim-creations.ts';
	import { resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import type {
		CreateLedgerBatchClaimsRequest,
		LedgerClaimableRecipientAllocation,
		LedgerClaimableRecipientDetailResponse,
		LedgerClaimableRecipientSummary,
		LedgerClaimableUnitBreakdown,
	} from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
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
		detailTitle: string;
		detailBody: string;
		detailLoadingLabel: string;
		siblingPromptLabel: string;
		siblingPromptHint: string;
		totalAmountLabel: string;
		totalAllocationsLabel: string;
		unitBreakdownLabel: string;
		memberLabel: string;
		noMemberLabel: string;
		allocationsTitle: string;
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
		yesterdayPrefix: string;
	}

	type ClaimMethod = NonNullable<CreateLedgerBatchClaimsRequest['method']>;

	interface EnrichedAllocation extends LedgerClaimableRecipientAllocation {
		ownerCharacterId: number;
		ownerCharacterName: string;
	}

	const SUBMIT_TIMEOUT_MS = 20000;

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

	let recipients: LedgerClaimableRecipientSummary[] = [];
	let recipientsLoading = false;
	let recipientsError = '';
	let emptyStateMode: 'default' | 'no-events' | 'no-settlements' = 'default';

	let selectedCharacterId = '';
	let includeSiblingCharacters = false;
	let detailLoading = false;
	let detailError = '';
	let currentDetail: LedgerClaimableRecipientDetailResponse | null = null;
	let siblingDetails: LedgerClaimableRecipientDetailResponse[] = [];
	let detailCache = new Map<number, LedgerClaimableRecipientDetailResponse>();

	let selectedAllocationIds = new Set<number>();
	let claimAmounts: Record<number, string> = {};
	let claimedAt = '';
	let method: ClaimMethod = 'trade';
	let notes = '';
	let errors: Record<string, string> = {};
	let isSubmitting = false;

	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; onClick?: () => void } | null = null;
	let dialogSecondaryAction: { label: string; onClick?: () => void } | null = null;

	function toLocalDateTimeValue(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		const hours = `${date.getHours()}`.padStart(2, '0');
		const minutes = `${date.getMinutes()}`.padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
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

	function formatUnknownDateTime(value: unknown) {
		return typeof value === 'string' || value == null ? formatDateTime(value) : '—';
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

	function describeUnknownRecentTime(value: unknown) {
		return typeof value === 'string' || value == null ? describeRecentTime(value) : '—';
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

	function getDetailCache(characterId: number) {
		return detailCache.get(characterId) ?? null;
	}

	function toEnrichedAllocations(
		detail: LedgerClaimableRecipientDetailResponse,
		recipient: LedgerClaimableRecipientSummary,
	): EnrichedAllocation[] {
		return detail.allocations.map((allocation) => ({
			...allocation,
			ownerCharacterId: recipient.characterId,
			ownerCharacterName: recipient.characterName,
		}));
	}

	$: activeAllocations = currentDetail
		? buildActiveAllocations(currentDetail, siblingDetails, includeSiblingCharacters)
		: [];

	$: activeUnitBreakdown = aggregateUnitBreakdowns(
		currentDetail
			? [
					currentDetail.unitBreakdown,
					...(includeSiblingCharacters ? siblingDetails.map((detail) => detail.unitBreakdown) : []),
				]
			: [],
	);

	$: selectedItems = activeAllocations
		.filter((allocation) => selectedAllocationIds.has(allocation.allocationId))
		.map((allocation) => ({
			allocation,
			amount: parseAmount(claimAmounts[allocation.allocationId] ?? String(allocation.amount)),
		}));

	$: selectedAmountTotal = selectedItems.reduce((total, item) => {
		if (Number.isNaN(item.amount)) {
			return total;
		}

		return total + item.amount;
	}, 0);

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

	function buildActiveAllocations(
		detail: LedgerClaimableRecipientDetailResponse,
		siblings: LedgerClaimableRecipientDetailResponse[],
		includeSiblings: boolean,
	) {
		return [
			...toEnrichedAllocations(detail, detail.recipient),
			...(includeSiblings
				? siblings.flatMap((siblingDetail) =>
						toEnrichedAllocations(siblingDetail, siblingDetail.recipient),
					)
				: []),
		];
	}

	function syncAllocationSelection(allocations: EnrichedAllocation[]) {
		const nextSelected = new Set<number>();
		const nextAmounts: Record<number, string> = {};

		for (const allocation of allocations) {
			nextSelected.add(allocation.allocationId);
			nextAmounts[allocation.allocationId] =
				claimAmounts[allocation.allocationId] ?? String(allocation.amount);
		}

		selectedAllocationIds = nextSelected;
		claimAmounts = nextAmounts;
	}

	async function loadRecipients({ keepSelection = true } = {}) {
		if (!organization) {
			return;
		}

		recipientsLoading = true;
		recipientsError = '';

		try {
			const response = await getApiAdapter().listOrganizationClaimableRecipients(organization);
			recipients = response.recipients;
			if (!response.recipients.length) {
				await hydrateEmptyStateMode();
			} else {
				emptyStateMode = 'default';
			}

			if (!keepSelection || !recipients.some((recipient) => String(recipient.characterId) === selectedCharacterId)) {
				selectedCharacterId = recipients[0] ? String(recipients[0].characterId) : '';
			}

			if (selectedCharacterId) {
				await loadRecipientDetail(Number(selectedCharacterId), { force: !keepSelection });
			} else {
				currentDetail = null;
				siblingDetails = [];
				selectedAllocationIds = new Set<number>();
				claimAmounts = {};
			}
		} catch (error) {
			recipientsError = getErrorMessage(error, labels.recipientsEmptyBody);
		} finally {
			recipientsLoading = false;
		}
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

	function getEmptyStateCopy() {
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

	$: emptyStateCopy = getEmptyStateCopy();
	$: newEventHref = organization ? `/${lang}/guilds/events/new?orgVanity=${encodeURIComponent(organization)}` : `/${lang}/guilds/events/new`;
	$: newSettlementHref = organization
		? `/${lang}/guilds/settlements/new?orgVanity=${encodeURIComponent(organization)}`
		: `/${lang}/guilds/settlements/new`;

	async function loadRecipientDetail(characterId: number, options: { force?: boolean } = {}) {
		if (!organization) {
			return;
		}

		detailLoading = true;
		detailError = '';
		includeSiblingCharacters = false;
		siblingDetails = [];

		try {
			let detail = !options.force ? getDetailCache(characterId) : null;
			if (!detail) {
				detail = await getApiAdapter().getOrganizationClaimableRecipientDetail(organization, characterId, {
					includeSiblingCharacters: true,
				});
				detailCache = new Map(detailCache).set(characterId, detail);
			}

			currentDetail = detail;
			syncAllocationSelection(buildActiveAllocations(detail, [], false));
		} catch (error) {
			currentDetail = null;
			siblingDetails = [];
			selectedAllocationIds = new Set<number>();
			claimAmounts = {};
			detailError = getErrorMessage(error, labels.detailBody);
		} finally {
			detailLoading = false;
		}
	}

	async function ensureSiblingDetails() {
		if (!organization || !currentDetail?.siblingCharacters.length) {
			siblingDetails = [];
			if (currentDetail) {
				syncAllocationSelection(buildActiveAllocations(currentDetail, [], false));
			}
			return;
		}

		detailLoading = true;
		detailError = '';

		try {
			const details = await Promise.all(
				currentDetail.siblingCharacters.map(async (recipient) => {
					const cached = getDetailCache(recipient.characterId);
					if (cached) {
						return cached;
					}

					const response = await getApiAdapter().getOrganizationClaimableRecipientDetail(
						organization,
						recipient.characterId,
						{ includeSiblingCharacters: false },
					);
					detailCache = new Map(detailCache).set(recipient.characterId, response);
					return response;
				}),
			);

			siblingDetails = details;
			syncAllocationSelection(buildActiveAllocations(currentDetail, details, true));
		} catch (error) {
			includeSiblingCharacters = false;
			siblingDetails = [];
			detailError = getErrorMessage(error, labels.detailBody);
		} finally {
			detailLoading = false;
		}
	}

	function handleRecipientChange(event: Event) {
		const target = event.currentTarget as HTMLSelectElement;
		selectedCharacterId = target.value;
		if (!selectedCharacterId) {
			currentDetail = null;
			return;
		}

		void loadRecipientDetail(Number(selectedCharacterId), { force: false });
	}

	function toggleAllocationSelection(allocationId: number) {
		const next = new Set(selectedAllocationIds);
		if (next.has(allocationId)) {
			next.delete(allocationId);
		} else {
			next.add(allocationId);
		}

		selectedAllocationIds = next;
	}

	function selectAllVisibleAllocations() {
		selectedAllocationIds = new Set(activeAllocations.map((allocation) => allocation.allocationId));
	}

	function clearVisibleAllocations() {
		selectedAllocationIds = new Set<number>();
	}

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!claimedAt) {
			nextErrors.claimedAt = labels.validationDate;
		}

		if (!selectedItems.length) {
			nextErrors.selection = labels.validationSelection;
		}

		for (const item of selectedItems) {
			if (Number.isNaN(item.amount) || item.amount <= 0 || item.amount > item.allocation.amount) {
				nextErrors[`allocation-${item.allocation.allocationId}`] = labels.validationAmount;
			}
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function closeDialog() {
		dialogOpen = false;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
	}

	async function submitClaims() {
		if (!organization || !currentDetail || isSubmitting || !validate()) {
			return;
		}

		isSubmitting = true;
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.loadingSubmitTitle;
		dialogMessage = labels.loadingSubmitBody;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;

		try {
			await withTimeout(
				getApiAdapter().createOrganizationLedgerBatchClaims(organization, {
					claimedAt: new Date(claimedAt).toISOString(),
					items: selectedItems.map(({ allocation, amount }) => ({
						settlementAllocationId: allocation.allocationId,
						amount,
						claimedByCharacterId: allocation.ownerCharacterId,
					})),
					method,
					notes: notes.trim() || undefined,
				}),
				SUBMIT_TIMEOUT_MS,
			);

			dialogState = 'success';
			dialogTitle = labels.successSubmitTitle;
			dialogMessage = labels.successSubmitBody;
			dialogPrimaryAction = {
				label: labels.successCloseLabel,
				onClick: () => {
					closeDialog();
				},
			};

			if (typeof window !== 'undefined') {
				recordRecentClaimCreation(window.localStorage, organization);
			}

			detailCache = new Map();
			await loadRecipients({ keepSelection: true });
		} catch (error) {
			dialogState = 'error';
			dialogTitle = labels.errorSubmitTitle;
			dialogMessage = error instanceof Error && error.message === 'timeout'
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

	onMount(() => {
		organization = resolveOrganizationQuery(organization);
		claimedAt = toLocalDateTimeValue(new Date());
		if (organization) {
			void loadRecipients({ keepSelection: false });
		}
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
		<p class="app-intro">{labels.totalAllocationsLabel}: {selectedItems.length}</p>
	</aside>
</section>

{#if !organization}
	<section class="app-section">
		<article class="workspace-card workspace-empty">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</article>
	</section>
{:else}
	<section class="app-section workspace-grid">
		<article class="workspace-card">
			<div class="workspace-head">
				<div>
					<p class="app-card-label">{labels.recipientsTitle}</p>
					<h2>{labels.recipientsTitle}</h2>
					<p>{labels.recipientsBody}</p>
				</div>
				<button type="button" class="ghost-button" on:click={() => loadRecipients({ keepSelection: true })}>
					{labels.recipientsRefreshLabel}
				</button>
			</div>

			{#if recipientsLoading}
				<p class="workspace-meta">{labels.recipientsLoadingLabel}</p>
			{:else if recipientsError}
				<p class="workspace-error">{recipientsError}</p>
			{:else if !recipients.length}
				<div class="workspace-empty">
					<h3>{emptyStateCopy.title}</h3>
					<p>{emptyStateCopy.body}</p>
					<p class="workspace-empty-note">{labels.recipientsEmptyRefreshHint}</p>
					<div class="workspace-empty-actions">
						{#if emptyStateMode === 'no-events'}
							<a class="primary-button workflow-action" href={newEventHref}>{labels.recipientsEmptyNewEventLabel}</a>
						{:else if emptyStateMode === 'no-settlements'}
							<a class="primary-button workflow-action" href={newSettlementHref}>{labels.recipientsEmptyNewSettlementLabel}</a>
						{/if}
					</div>
				</div>
			{:else}
				<div class="recipient-selector">
					<label>
						<span>{labels.recipientsTitle}</span>
						<select bind:value={selectedCharacterId} on:change={handleRecipientChange}>
							{#each recipients as recipient}
								<option value={recipient.characterId}>
									{recipient.characterName} · {formatAmount(recipient.pendingClaimAmountTotal)}
								</option>
							{/each}
						</select>
					</label>
				</div>

				<ul class="recipient-list">
					{#each recipients as recipient}
						<li class:selected={String(recipient.characterId) === selectedCharacterId}>
							<button type="button" on:click={() => {
								selectedCharacterId = String(recipient.characterId);
								void loadRecipientDetail(recipient.characterId, { force: false });
							}}>
								<strong>{recipient.characterName}</strong>
								<span>{formatAmount(recipient.pendingClaimAmountTotal)}</span>
								<small>
									{recipient.pendingAllocationCount} · {recipient.memberDisplayName ?? labels.noMemberLabel}
								</small>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</article>

		<article class="workspace-card workspace-main">
			<div class="workspace-head">
				<div>
					<p class="app-card-label">{labels.detailTitle}</p>
					<h2>{labels.detailTitle}</h2>
					<p>{labels.detailBody}</p>
				</div>
			</div>

			{#if detailLoading}
				<p class="workspace-meta">{labels.detailLoadingLabel}</p>
			{:else if detailError}
				<p class="workspace-error">{detailError}</p>
			{:else if !currentDetail}
				<div class="workspace-empty">
					<h3>{emptyStateCopy.title}</h3>
					<p>{emptyStateCopy.body}</p>
				</div>
			{:else}
				<div class="summary-grid">
					<div class="summary-tile">
						<span>{labels.memberLabel}</span>
						<strong>{currentDetail.recipient.memberDisplayName ?? labels.noMemberLabel}</strong>
					</div>
					<div class="summary-tile">
						<span>{labels.totalAmountLabel}</span>
						<strong>{formatAmount(selectedAmountTotal)}</strong>
					</div>
					<div class="summary-tile">
						<span>{labels.totalAllocationsLabel}</span>
						<strong>{selectedItems.length}</strong>
					</div>
				</div>

				{#if currentDetail.siblingCharacters.length}
					<label class="sibling-toggle">
						<input
							type="checkbox"
							bind:checked={includeSiblingCharacters}
							on:change={() => {
								if (includeSiblingCharacters) {
									void ensureSiblingDetails();
									return;
								}

								siblingDetails = [];
								if (currentDetail) {
									syncAllocationSelection(buildActiveAllocations(currentDetail, [], false));
								}
							}}
						/>
						<span>
							<strong>{labels.siblingPromptLabel}</strong>
							<small>
								{labels.siblingPromptHint}
								{#each currentDetail.siblingCharacters as sibling, index}
									{sibling.characterName}{index < currentDetail.siblingCharacters.length - 1 ? ' / ' : ''}
								{/each}
							</small>
						</span>
					</label>
				{/if}

				<div class="breakdown-card">
					<p class="app-card-label">{labels.unitBreakdownLabel}</p>
					<ul>
						{#each activeUnitBreakdown as unit}
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
						<button type="button" class="ghost-button" on:click={selectAllVisibleAllocations}>
							{labels.selectAllLabel}
						</button>
						<button type="button" class="ghost-button" on:click={clearVisibleAllocations}>
							{labels.clearAllLabel}
						</button>
					</div>
				</div>

				<div class="allocation-list">
					{#each activeAllocations as allocation}
						<label class="allocation-card">
							<div class="allocation-check">
								<input
									type="checkbox"
									checked={selectedAllocationIds.has(allocation.allocationId)}
									on:change={() => toggleAllocationSelection(allocation.allocationId)}
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
									<span>{labels.allocationOccurredAtLabel}: {formatUnknownDateTime(allocation.eventOccurredAt)}</span>
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
										bind:value={claimAmounts[allocation.allocationId]}
									/>
								</label>
								<small>{describeUnknownRecentTime(allocation.settlementDecidedAt)}</small>
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
							<input type="datetime-local" bind:value={claimedAt} />
							{#if errors.claimedAt}
								<p class="field-error">{errors.claimedAt}</p>
							{/if}
						</label>

						<label>
							<span>{labels.formMethodLabel} · {labels.optionalHint}</span>
							<select bind:value={method}>
								{#each methodOptions as option}
									<option value={option.value}>{labels[option.labelKey]}</option>
								{/each}
							</select>
						</label>
					</div>

					<label>
						<span>{labels.formNotesLabel} · {labels.optionalHint}</span>
						<textarea rows="3" bind:value={notes} placeholder={labels.formNotesPlaceholder}></textarea>
					</label>

					{#if errors.selection}
						<p class="field-error">{errors.selection}</p>
					{/if}

					<div class="form-actions">
						<button type="submit" class="primary-button" disabled={isSubmitting}>
							{labels.formSubmitLabel}
						</button>
					</div>
				</form>
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
	.workspace-grid {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
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

	.workspace-head h2,
	.workspace-empty h2,
	.workspace-empty h3,
	.allocations-head h3 {
		margin: 10px 0 0;
		letter-spacing: -0.03em;
	}

	.workspace-head p,
	.workspace-empty p,
	.workspace-empty-note {
		margin: 10px 0 0;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.workspace-empty-actions {
		margin-top: 12px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.workspace-meta,
	.workspace-error,
	.field-error {
		margin: 0;
		font-size: 0.94rem;
	}

	.workspace-error,
	.field-error {
		color: #c43c3c;
	}

	.ghost-button,
	.primary-button,
	.recipient-list button {
		min-height: 42px;
		border-radius: 16px;
		font: inherit;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.ghost-button,
	.recipient-list button {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		color: var(--text-main);
	}

	.primary-button {
		border: 1px solid transparent;
		background: var(--accent);
		color: white;
		padding: 0 18px;
		font-weight: 700;
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

	.ghost-button:hover,
	.primary-button:hover,
	.recipient-list button:hover {
		transform: translateY(-1px);
	}

	.recipient-selector label,
	.field-grid label,
	.claim-form > label {
		display: grid;
		gap: 8px;
	}

	.recipient-selector span,
	.field-grid span,
	.claim-form > label span,
	.allocation-side span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	select,
	input,
	textarea {
		width: 100%;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
		font: inherit;
	}

	.recipient-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.recipient-list li.selected button {
		border-color: color-mix(in srgb, var(--accent) 44%, var(--line));
		background: color-mix(in srgb, var(--accent) 10%, white);
	}

	.recipient-list button {
		width: 100%;
		padding: 14px;
		display: grid;
		text-align: left;
		gap: 4px;
	}

	.recipient-list strong,
	.recipient-list span,
	.recipient-list small {
		display: block;
	}

	.recipient-list span {
		font-weight: 700;
	}

	.recipient-list small {
		color: var(--text-soft);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
	}

	.summary-tile,
	.breakdown-card {
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
	}

	.summary-tile span,
	.summary-tile strong {
		display: block;
	}

	.summary-tile span {
		font-size: 0.88rem;
		color: var(--text-soft);
	}

	.summary-tile strong {
		margin-top: 8px;
		font-size: 1.15rem;
	}

	.sibling-toggle {
		display: flex;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		align-items: start;
	}

	.sibling-toggle span {
		display: grid;
		gap: 4px;
	}

	.sibling-toggle small {
		color: var(--text-soft);
		line-height: 1.6;
	}

	.breakdown-card ul {
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.breakdown-card li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}

	.breakdown-card span {
		color: var(--text-soft);
	}

	.allocations-actions,
	.form-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.allocation-list {
		display: grid;
		gap: 14px;
	}

	.allocation-card {
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) 180px;
		gap: 16px;
		align-items: start;
	}

	.allocation-main,
	.allocation-side {
		display: grid;
		gap: 10px;
	}

	.allocation-row,
	.allocation-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
	}

	.allocation-meta {
		color: var(--text-soft);
		font-size: 0.92rem;
	}

	.allocation-side small {
		color: var(--text-soft);
	}

	.claim-form {
		display: grid;
		gap: 16px;
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	@media (max-width: 980px) {
		.workspace-grid {
			grid-template-columns: 1fr;
		}

		.summary-grid,
		.field-grid {
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
			flex-direction: column;
		}
	}
</style>
