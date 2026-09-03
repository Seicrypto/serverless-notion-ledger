<script lang="ts">
	import { onMount } from 'svelte';

	import CharacterLedgerDetailDialog from './CharacterLedgerDetailDialog.svelte';
	import DashboardPagination from './DashboardPagination.svelte';
	import CharacterLedgerSummaryCard from './CharacterLedgerSummaryCard.svelte';
	import OrganizationLedgerOverviewCard from './OrganizationLedgerOverviewCard.svelte';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		readAuthSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		clearDashboardOrganizationCache,
		readDashboardCharacterDetailCache,
		readDashboardCharactersCache,
		readDashboardCharacterSummariesCache,
		readDashboardRefreshLock,
		readDashboardSummaryCache,
		writeDashboardCharactersCache,
		writeDashboardCharacterDetailCache,
		writeDashboardCharacterSummariesCache,
		writeDashboardRefreshLock,
		writeDashboardSummaryCache,
	} from '../../../libs/dashboard/dashboard-cache.ts';
	import { writePreferredOrganization } from '../../../libs/ledger/workspace-preferences.ts';
	import { resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import type {
		CharacterLedgerDashboardDetailResponse,
		CharacterLedgerDashboardSummaryItem,
		OrganizationCharacter,
		OrganizationLedgerDashboardSummaryResponse,
	} from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		orgRequiredTitle: string;
		orgRequiredBody: string;
		searchLabel: string;
		searchPlaceholder: string;
		refreshLabel: string;
		refreshPendingLabel: string;
		searchHint: string;
		charactersTitle: string;
		charactersEmptyTitle: string;
		charactersEmptyBody: string;
		loadingLabel: string;
		errorTitle: string;
		pageLabel: string;
		prevLabel: string;
		nextLabel: string;
		overviewTitle: string;
		dashboardSuffix: string;
		pageTitleProductName: string;
		revenueLabel: string;
		revenueEmptyLabel: string;
		revenueHelperLabel: string;
		settlementCountLabel: string;
		settlementCountHelperLabel: string;
		unsettledEventCountLabel: string;
		unsettledEventCountHelperLabel: string;
		disbursementStatusLabel: string;
		disbursementInProgressLabel: string;
		disbursementNotStartedLabel: string;
		disbursementStatusHelperLabel: string;
		lastUpdatedLabel: string;
		viewInfoLabel: string;
		receivableLabel: string;
		payableLabel: string;
		pendingClaimCountLabel: string;
		lastActivityLabel: string;
		openDetailLabel: string;
		noBreakdownLabel: string;
		detailTitlePrefix: string;
		detailCloseLabel: string;
		detailReceivableLabel: string;
		detailPayableLabel: string;
		detailTotalLabel: string;
		detailSettlementCountLabel: string;
		detailNoDataLabel: string;
		detailSettlementLabel: string;
		detailEventLabel: string;
		detailClaimStatusLabel: string;
		detailDecidedAtLabel: string;
	}

	const PAGE_SIZE = 10;

	export let lang: string;
	export let organization: string | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let authResolved = false;
	let summary: OrganizationLedgerDashboardSummaryResponse | null = null;
	let characters: OrganizationCharacter[] = [];
	let summaries: CharacterLedgerDashboardSummaryItem[] = [];
	let detail: CharacterLedgerDashboardDetailResponse | null = null;
	let detailOpen = false;

	let query = '';
	let page = 1;
	let loading = true;
	let pageLoading = false;
	let errorMessage = '';
	let organizationIconUrl: string | null = null;
	let refreshLockedUntil = 0;
	let refreshClock = Date.now();
	let summaryRequestKey = '';
	let previousNormalizedQuery = '';
	let summariesLoading = false;

	function isActiveMember() {
		return isAuthenticatedSession(session);
	}

	function normalizeSearch(value: string) {
		return value.trim().toLocaleLowerCase();
	}

	function findCharacterSummary(characterId: number) {
		return summaries.find((summaryItem) => summaryItem.characterId === characterId) ?? null;
	}

	function getOrganizationDisplayName() {
		return summary?.organization.name ?? organization ?? labels.overviewTitle;
	}

	function updateDocumentTitle() {
		if (typeof document === 'undefined') {
			return;
		}

		document.title = `${getOrganizationDisplayName()} ${labels.dashboardSuffix} | ${labels.pageTitleProductName}`;
	}

	$: normalizedQuery = normalizeSearch(query);
	$: filteredCharacters = normalizedQuery
		? characters.filter((character) => character.name.toLocaleLowerCase().includes(normalizedQuery))
		: characters;
	$: totalPages = Math.max(1, Math.ceil(filteredCharacters.length / PAGE_SIZE));
	$: visiblePage = Math.min(page, totalPages);
	$: pagedCharacters = filteredCharacters.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);
	$: pagedCharacterCards = pagedCharacters.map((character) => ({
		character,
		summary: findCharacterSummary(character.id),
	}));
	$: currentSummaryKey = organization
		? `${organization}:${pagedCharacters.map((character) => character.id).join(',')}`
		: '';

	function syncUrlOrganization() {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		writePreferredOrganization(window.localStorage, organization);
		const url = new URL(window.location.href);
		url.searchParams.set('orgVanity', organization);
		window.history.replaceState({}, '', url);
	}

	function hydrateDashboardFromCache() {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		const cachedSummary = readDashboardSummaryCache(window.sessionStorage, organization);
		if (cachedSummary) {
			summary = cachedSummary.data;
		}

		const cachedCharacters = readDashboardCharactersCache(window.sessionStorage, organization);
		if (cachedCharacters) {
			characters = cachedCharacters.data;
		}

		const characterIds = pagedCharacters.map((character) => character.id);
		if (characterIds.length > 0) {
			const cachedSummaries = readDashboardCharacterSummariesCache(
				window.sessionStorage,
				organization,
				characterIds,
			);
			if (cachedSummaries) {
				summaries = cachedSummaries.data;
				summaryRequestKey = currentSummaryKey;
			}
		}

		if (cachedSummary || cachedCharacters) {
			loading = false;
		}
	}

	async function loadSummary(force = false) {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		if (!force) {
			const cached = readDashboardSummaryCache(window.sessionStorage, organization);
			if (cached) {
				summary = cached.data;
				return;
			}
		}

		const response = await getApiAdapter().getOrganizationLedgerDashboardSummary(organization);
		summary = response;
		writeDashboardSummaryCache(window.sessionStorage, organization, response);
	}

	async function loadCharacters(force = false) {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		if (!force) {
			const cached = readDashboardCharactersCache(window.sessionStorage, organization);
			if (cached) {
				characters = cached.data;
				return;
			}
		}

		const response = await getApiAdapter().listOrganizationCharacters(organization);
		characters = response.characters.filter((character) => character.isActive);
		writeDashboardCharactersCache(window.sessionStorage, organization, characters);
	}

	async function loadOrganizationMeta() {
		if (!organization) {
			organizationIconUrl = null;
			return;
		}

		try {
			const response = await getApiAdapter().getOrganization(organization);
			organizationIconUrl =
				typeof response.organization.iconUrl === 'string' && response.organization.iconUrl.trim()
					? response.organization.iconUrl
					: null;
		} catch {
			organizationIconUrl = null;
		}
	}

	async function loadSummaries(force = false) {
		if (!organization || typeof window === 'undefined') {
			summaries = [];
			return;
		}

		const characterIds = pagedCharacters.map((character) => character.id);
		if (characterIds.length === 0) {
			summaries = [];
			return;
		}

		if (!force) {
			const cached = readDashboardCharacterSummariesCache(window.sessionStorage, organization, characterIds);
			if (cached) {
				summaries = cached.data;
				summaryRequestKey = currentSummaryKey;
				return;
			}
		}

		summariesLoading = true;
		try {
			const response = await getApiAdapter().queryOrganizationCharacterLedgerDashboardSummaries(organization, {
				characterIds,
			});
			summaries = response.summaries;
			summaryRequestKey = currentSummaryKey;
			writeDashboardCharacterSummariesCache(window.sessionStorage, organization, characterIds, response.summaries);
		} finally {
			summariesLoading = false;
		}
	}

	async function loadDashboard(force = false) {
		if (!organization) {
			loading = false;
			return;
		}

		loading = !summary && !characters.length;
		pageLoading = true;
		errorMessage = '';

		const [summaryResult, charactersResult] = await Promise.allSettled([
			loadSummary(force),
			loadCharacters(force),
			loadOrganizationMeta(),
		]);

		if (summaryResult.status === 'rejected' && charactersResult.status === 'rejected') {
			errorMessage = getErrorMessage(
				charactersResult.reason instanceof Error ? charactersResult.reason : summaryResult.reason,
				labels.errorTitle,
			);
		}

		syncUrlOrganization();
		loading = false;
		pageLoading = false;

		if (charactersResult.status === 'fulfilled' && pagedCharacters.length > 0) {
			void loadSummaries(force).catch(() => {
				summariesLoading = false;
			});
		}
	}

	async function openCharacterDetail(characterId: number) {
		if (!organization || typeof window === 'undefined') {
			return;
		}

		try {
			const cached = readDashboardCharacterDetailCache(window.sessionStorage, organization, characterId);
			if (cached) {
				detail = cached.data;
				detailOpen = true;
				return;
			}

			const response = await getApiAdapter().getOrganizationCharacterLedgerDashboardDetail(
				organization,
				characterId,
			);
			detail = response;
			detailOpen = true;
			writeDashboardCharacterDetailCache(window.sessionStorage, organization, characterId, response);
		} catch (error) {
			errorMessage = getErrorMessage(error, labels.errorTitle);
		}
	}

	function closeDetail() {
		detailOpen = false;
	}

	function previousPage() {
		page = Math.max(1, visiblePage - 1);
	}

	function nextPage() {
		page = Math.min(totalPages, visiblePage + 1);
	}

	function handleSearchInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		query = target.value;
		if (normalizeSearch(target.value) !== previousNormalizedQuery) {
			page = 1;
			previousNormalizedQuery = normalizeSearch(target.value);
		}
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			page = 1;
		}
	}

	async function refreshNow() {
		if (!organization || typeof window === 'undefined' || !isActiveMember()) {
			return;
		}

		const existingLock = readDashboardRefreshLock(window.sessionStorage, organization);
		if (existingLock) {
			refreshLockedUntil = existingLock;
			return;
		}

		refreshLockedUntil = Date.parse(writeDashboardRefreshLock(window.sessionStorage, organization));
		clearDashboardOrganizationCache(window.sessionStorage, organization);
		await loadDashboard(true);
	}

	$: if (!loading && !summariesLoading && organization && currentSummaryKey && currentSummaryKey !== summaryRequestKey) {
		void loadSummaries(false);
	}

	$: if (organization) {
		updateDocumentTitle();
	}

	onMount(() => {
		organization = resolveOrganizationQuery(organization);
		session = readAuthSession();
		authResolved = Boolean(session);
		hydrateDashboardFromCache();
		updateDocumentTitle();
		const intervalId = window.setInterval(() => {
			refreshClock = Date.now();
		}, 1000);

		void ensureAuthSession().then(async (nextSession) => {
			session = nextSession;
			authResolved = true;
			if (organization && typeof window !== 'undefined') {
				refreshLockedUntil = readDashboardRefreshLock(window.sessionStorage, organization) ?? 0;
			}
			await loadDashboard(false);
		});

		return () => {
			window.clearInterval(intervalId);
		};
	});
</script>

{#if !authResolved && loading}
	<section class="app-section">
		<article class="state-card">
			<h2>{labels.loadingLabel}</h2>
		</article>
	</section>
{:else if !organization}
	<section class="app-section">
		<article class="state-card">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</article>
	</section>
{:else}
	<section class="app-section">
		{#if errorMessage}
			<article class="state-card">
				<h2>{labels.errorTitle}</h2>
				<p>{errorMessage}</p>
			</article>
		{:else}
			<OrganizationLedgerOverviewCard
				summary={summary}
				organizationName={getOrganizationDisplayName()}
				organizationIconUrl={organizationIconUrl}
				organizationReference={organization}
				lang={lang}
				labels={{
					title: labels.overviewTitle,
					dashboardSuffix: labels.dashboardSuffix,
					revenueLabel: labels.revenueLabel,
					revenueEmptyLabel: labels.revenueEmptyLabel,
					settlementCountLabel: labels.settlementCountLabel,
					unsettledEventCountLabel: labels.unsettledEventCountLabel,
					disbursementStatusLabel: labels.disbursementStatusLabel,
					disbursementInProgressLabel: labels.disbursementInProgressLabel,
					disbursementNotStartedLabel: labels.disbursementNotStartedLabel,
					lastUpdatedLabel: labels.lastUpdatedLabel,
					viewInfoLabel: labels.viewInfoLabel,
				}}
			/>
		{/if}
	</section>

	<section class="app-section dashboard-toolbar">
		<label class="toolbar-search">
			<span>{labels.searchLabel}</span>
			<input
				type="search"
				bind:value={query}
				placeholder={labels.searchPlaceholder}
				on:input={handleSearchInput}
				on:keydown={handleSearchKeydown}
			/>
			<small>{labels.searchHint}</small>
		</label>

		<button
			type="button"
			class="toolbar-refresh"
			disabled={!isActiveMember() || refreshClock < refreshLockedUntil || pageLoading}
			on:click={() => void refreshNow()}
		>
			{refreshClock < refreshLockedUntil || pageLoading ? labels.refreshPendingLabel : labels.refreshLabel}
		</button>
	</section>

	<section class="app-section">
		<article class="characters-panel">
			<div class="section-head">
				<h2>{labels.charactersTitle}</h2>
				<DashboardPagination
					page={visiblePage}
					totalPages={totalPages}
					onPrevious={previousPage}
					onNext={nextPage}
					labels={{
						pageLabel: labels.pageLabel,
						prevLabel: labels.prevLabel,
						nextLabel: labels.nextLabel,
					}}
				/>
			</div>

			{#if filteredCharacters.length === 0}
				<article class="state-card">
					<h2>{labels.charactersEmptyTitle}</h2>
					<p>{labels.charactersEmptyBody}</p>
				</article>
			{:else}
				<div class="character-card-grid">
					{#each pagedCharacterCards as entry}
						{#if entry.summary}
							<CharacterLedgerSummaryCard
								summary={entry.summary}
								lang={lang}
								labels={{
									receivableLabel: labels.receivableLabel,
									payableLabel: labels.payableLabel,
									pendingClaimCountLabel: labels.pendingClaimCountLabel,
									lastActivityLabel: labels.lastActivityLabel,
									openDetailLabel: labels.openDetailLabel,
									noBreakdownLabel: labels.noBreakdownLabel,
								}}
								onOpenDetail={() => void openCharacterDetail(entry.character.id)}
							/>
						{:else}
							<article class="state-card compact">
								<h2>{entry.character.name}</h2>
								<p>{labels.loadingLabel}</p>
							</article>
						{/if}
					{/each}
				</div>

				<DashboardPagination
					page={visiblePage}
					totalPages={totalPages}
					onPrevious={previousPage}
					onNext={nextPage}
					labels={{
						pageLabel: labels.pageLabel,
						prevLabel: labels.prevLabel,
						nextLabel: labels.nextLabel,
					}}
				/>
			{/if}
		</article>
	</section>
{/if}

<CharacterLedgerDetailDialog
	open={detailOpen}
	detail={detail}
	onClose={closeDetail}
	labels={{
		titlePrefix: labels.detailTitlePrefix,
		closeLabel: labels.detailCloseLabel,
		receivableLabel: labels.detailReceivableLabel,
		payableLabel: labels.detailPayableLabel,
		totalLabel: labels.detailTotalLabel,
		settlementCountLabel: labels.detailSettlementCountLabel,
		noDataLabel: labels.detailNoDataLabel,
		settlementLabel: labels.detailSettlementLabel,
		eventLabel: labels.detailEventLabel,
		claimStatusLabel: labels.detailClaimStatusLabel,
		decidedAtLabel: labels.detailDecidedAtLabel,
	}}
/>

<style>
	.state-card {
		padding: 24px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 12px;
	}

	.state-card h2,
	.state-card p,
	.section-head h2,
	.section-head p {
		margin: 0;
	}

	.state-card p,
	.section-head p,
	.toolbar-search small {
		color: var(--text-soft);
	}

	.state-action,
	.toolbar-refresh {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font: inherit;
	}

	.state-action,
	.toolbar-refresh {
		border: 1px solid color-mix(in srgb, var(--ledger-accent) 35%, var(--line));
		background: color-mix(in srgb, var(--ledger-accent-soft) 82%, white);
		color: color-mix(in srgb, var(--ledger-accent-deep) 82%, var(--text-main));
	}

	.dashboard-toolbar,
	.section-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: end;
	}

	.characters-panel {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 24px;
	}

	.toolbar-search {
		flex: 1;
		display: grid;
		gap: 8px;
	}

	.toolbar-search span {
		font-weight: 700;
	}

	.toolbar-search input {
		width: 100%;
		padding: 12px 14px;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
		font: inherit;
	}

	.character-card-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.compact {
		min-height: 160px;
	}

	@media (max-width: 980px) {
		.character-card-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.dashboard-toolbar,
		.section-head {
			flex-direction: column;
			align-items: stretch;
		}

		.characters-panel {
			padding: 20px;
		}
	}
</style>
