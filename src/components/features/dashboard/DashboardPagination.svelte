<script lang="ts">
	interface Labels {
		pageLabel: string;
		prevLabel: string;
		nextLabel: string;
	}

	export let labels: Labels;
	export let page = 1;
	export let totalPages = 1;
	export let onPrevious: (() => void) | null = null;
	export let onNext: (() => void) | null = null;

	$: showControls = totalPages > 1;
</script>

<div class="pagination-bar" class:pagination-bar-single={!showControls}>
	{#if showControls}
		<button type="button" class="pagination-button" on:click={onPrevious} disabled={page === 1}>
			{labels.prevLabel}
		</button>
	{/if}

	<p class="pagination-label">{labels.pageLabel}: {page} / {totalPages}</p>

	{#if showControls}
		<button type="button" class="pagination-button" on:click={onNext} disabled={page === totalPages}>
			{labels.nextLabel}
		</button>
	{/if}
</div>

<style>
	.pagination-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.pagination-bar-single {
		justify-content: center;
	}

	.pagination-label {
		margin: 0;
		color: var(--text-soft);
		font-weight: 600;
	}

	.pagination-button {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font: inherit;
	}

	@media (max-width: 720px) {
		.pagination-bar {
			flex-direction: column;
			align-items: stretch;
		}

		.pagination-label {
			text-align: center;
		}
	}
</style>
