<script lang="ts">
	import { onMount } from 'svelte';

	import OrganizationCard from './OrganizationCard.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { mapApiOrganizationCardToOrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';

	interface GameOption {
		label: string;
		value: string;
	}

	interface Labels {
		searchLabel: string;
		searchPlaceholder: string;
		gameLabel: string;
		submitLabel: string;
		clearLabel: string;
		loadingLabel: string;
		emptyTitle: string;
		emptyBody: string;
		errorTitle: string;
		prevLabel: string;
		nextLabel: string;
		pageLabel: string;
		resultCountLabel: string;
		memberCountLabel: string;
		characterCountLabel: string;
		supportedOrgLabel: string;
		openOrgLabel: string;
	}

	export let lang: string;
	export let labels: Labels;
	export let gameOptions: GameOption[] = [];
	export let initialQuery = '';
	export let initialGameSlug = '';
	export let initialOffset = 0;
	export let pageSize = 10;

	let query = initialQuery;
	let selectedGameSlug = initialGameSlug;
	let submittedQuery = initialQuery.trim();
	let offset = initialOffset;
	let organizations = [] as ReturnType<typeof mapApiOrganizationCardToOrganizationCardResponse>[];
	let hasMore = false;
	let loading = false;
	let hasLoadedOnce = false;
	let errorMessage = '';

	const getCurrentPage = () => Math.floor(offset / pageSize) + 1;

	const syncUrl = () => {
		if (typeof window === 'undefined') {
			return;
		}

		const url = new URL(window.location.href);
		if (submittedQuery) {
			url.searchParams.set('q', submittedQuery);
		} else {
			url.searchParams.delete('q');
		}

		if (selectedGameSlug) {
			url.searchParams.set('game', selectedGameSlug);
		} else {
			url.searchParams.delete('game');
		}

		if (offset > 0) {
			url.searchParams.set('offset', String(offset));
		} else {
			url.searchParams.delete('offset');
		}

		window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
	};

	const loadOrganizations = async (nextOffset = 0) => {
		loading = true;
		errorMessage = '';

		try {
			const response = await getApiAdapter().listOrganizations({
				limit: pageSize,
				offset: nextOffset,
				q: submittedQuery || undefined,
				gameSlug: selectedGameSlug || undefined,
			});

			organizations = response.organizations.map(mapApiOrganizationCardToOrganizationCardResponse);
			offset = response.pagination.offset;
			hasMore = response.pagination.hasMore;
			hasLoadedOnce = true;
			syncUrl();
		} catch (error) {
			hasLoadedOnce = true;
			errorMessage = error instanceof Error && error.message.trim() ? error.message : labels.errorTitle;
		} finally {
			loading = false;
		}
	};

	const submitSearch = async () => {
		submittedQuery = query.trim();
		await loadOrganizations(0);
	};

	const clearSearch = async () => {
		query = '';
		submittedQuery = '';
		selectedGameSlug = initialGameSlug || gameOptions[0]?.value || '';
		await loadOrganizations(0);
	};

	const goToPreviousPage = async () => {
		if (loading || offset <= 0) {
			return;
		}

		await loadOrganizations(Math.max(0, offset - pageSize));
	};

	const goToNextPage = async () => {
		if (loading || !hasMore) {
			return;
		}

		await loadOrganizations(offset + pageSize);
	};

	onMount(async () => {
		if (!selectedGameSlug && gameOptions[0]) {
			selectedGameSlug = gameOptions[0].value;
		}

		await loadOrganizations(offset);
	});
</script>

<section class="org-directory">
	<form
		class="org-search-panel"
		on:submit|preventDefault={() => {
			void submitSearch();
		}}
	>
		<div class="org-search-field">
			<label for="org-game-filter">{labels.gameLabel}</label>
			<select id="org-game-filter" bind:value={selectedGameSlug}>
				{#each gameOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div class="org-search-field org-search-field-query">
			<label for="org-query-input">{labels.searchLabel}</label>
			<input
				id="org-query-input"
				type="search"
				bind:value={query}
				placeholder={labels.searchPlaceholder}
				autocomplete="off"
			/>
		</div>

		<div class="org-search-actions">
			<button type="submit" class="org-search-submit" disabled={loading}>
				{labels.submitLabel}
			</button>
			<button
				type="button"
				class="org-search-clear"
				disabled={loading}
				on:click={() => {
					void clearSearch();
				}}
			>
				{labels.clearLabel}
			</button>
		</div>
	</form>

	<div class="org-results-head">
		<p>{labels.resultCountLabel}: {organizations.length}</p>
		<p>{labels.pageLabel}: {getCurrentPage()}</p>
	</div>

	{#if loading}
		<section class="org-results-state">
			<h2>{labels.loadingLabel}</h2>
		</section>
	{:else if errorMessage}
		<section class="org-results-state">
			<h2>{labels.errorTitle}</h2>
			<p>{errorMessage}</p>
		</section>
	{:else if hasLoadedOnce && organizations.length === 0}
		<section class="org-results-state">
			<h2>{labels.emptyTitle}</h2>
			<p>{labels.emptyBody}</p>
		</section>
	{:else}
		<div class="org-card-grid">
			{#each organizations as organization}
				<OrganizationCard
					organization={organization}
					href={`/${lang}/members?org=${organization.slug}`}
					actionLabel={labels.openOrgLabel}
					labels={{
						members: labels.memberCountLabel,
						characters: labels.characterCountLabel,
						supportedOrg: labels.supportedOrgLabel,
					}}
				/>
			{/each}
		</div>
	{/if}

	<div class="org-pagination">
		<button type="button" class="org-page-button" on:click={() => void goToPreviousPage()} disabled={loading || offset <= 0}>
			{labels.prevLabel}
		</button>
		<button type="button" class="org-page-button" on:click={() => void goToNextPage()} disabled={loading || !hasMore}>
			{labels.nextLabel}
		</button>
	</div>
</section>

<style>
	.org-directory {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.org-search-panel,
	.org-results-state,
	.org-results-head {
		padding: 22px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 24px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.org-search-panel {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr) auto;
		gap: 16px;
		align-items: end;
	}

	.org-search-field {
		display: grid;
		gap: 8px;
	}

	.org-search-field label {
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.org-search-field p,
	.org-results-head p,
	.org-results-state p {
		margin: 0;
		line-height: 1.6;
		color: var(--text-soft);
	}

	.org-search-field select,
	.org-search-field input {
		min-height: 48px;
		padding: 0 16px;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		color: var(--text-main);
		font: inherit;
	}

	.org-search-field input::placeholder {
		color: color-mix(in srgb, var(--text-soft) 80%, white);
	}

	.org-search-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.org-search-submit,
	.org-search-clear,
	.org-page-button {
		min-height: 48px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1px solid var(--line);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease,
			opacity 0.18s ease;
	}

	.org-search-submit {
		background: var(--text-main);
		color: var(--surface-strong);
		border-color: transparent;
	}

	.org-search-clear,
	.org-page-button {
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		color: var(--text-main);
	}

	.org-search-submit:hover,
	.org-search-clear:hover,
	.org-page-button:hover {
		transform: translateY(-1px);
	}

	.org-search-submit:disabled,
	.org-search-clear:disabled,
	.org-page-button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		transform: none;
	}

	.org-results-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.org-results-state h2 {
		margin: 0 0 10px;
		font-size: 1.2rem;
	}

	.org-pagination {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	@media (max-width: 920px) {
		.org-search-panel {
			grid-template-columns: 1fr;
		}

		.org-results-head {
			flex-direction: column;
			align-items: flex-start;
		}
	}

	@media (max-width: 720px) {
		.org-search-panel,
		.org-results-state,
		.org-results-head {
			padding: 18px;
			border-radius: 20px;
		}

		.org-search-actions,
		.org-pagination {
			flex-direction: column;
		}
	}
</style>
