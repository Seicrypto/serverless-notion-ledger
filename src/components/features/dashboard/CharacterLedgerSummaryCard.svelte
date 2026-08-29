<script lang="ts">
	import type { CharacterLedgerDashboardSummaryItem } from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		receivableLabel: string;
		payableLabel: string;
		pendingClaimCountLabel: string;
		lastActivityLabel: string;
		openDetailLabel: string;
		noBreakdownLabel: string;
	}

	export let summary: CharacterLedgerDashboardSummaryItem;
	export let labels: Labels;
	export let onOpenDetail: (() => void) | null = null;

	function formatAmount(value: number) {
		return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
	}

	function totalAmount(items: Array<{ amountTotal: number }>) {
		return items.reduce((total, item) => total + item.amountTotal, 0);
	}

	function formatDateTime(value: unknown) {
		if (typeof value !== 'string' || !value) {
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
</script>

<article class="character-card">
	<div class="character-head">
		<div>
			<h3>{summary.characterName}</h3>
			<p>{labels.lastActivityLabel}: {formatDateTime(summary.lastActivityAt)}</p>
		</div>
		<button type="button" class="detail-button" on:click={onOpenDetail}>{labels.openDetailLabel}</button>
	</div>

	<div class="character-grid">
		<section class="character-tile">
			<span>{labels.receivableLabel}</span>
			<strong>{formatAmount(totalAmount(summary.receivableUnitBreakdown))}</strong>
			{#if summary.receivableUnitBreakdown.length}
				<ul>
					{#each summary.receivableUnitBreakdown as unit}
						<li>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`} · {formatAmount(unit.amountTotal)}</li>
					{/each}
				</ul>
			{:else}
				<small>{labels.noBreakdownLabel}</small>
			{/if}
		</section>

		<section class="character-tile">
			<span>{labels.payableLabel}</span>
			<strong>{formatAmount(totalAmount(summary.payableUnitBreakdown))}</strong>
			{#if summary.payableUnitBreakdown.length}
				<ul>
					{#each summary.payableUnitBreakdown as unit}
						<li>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`} · {formatAmount(unit.amountTotal)}</li>
					{/each}
				</ul>
			{:else}
				<small>{labels.noBreakdownLabel}</small>
			{/if}
		</section>
	</div>

	<div class="character-foot">
		<p>{labels.pendingClaimCountLabel}: {summary.pendingClaimCount}</p>
	</div>
</article>

<style>
	.character-card {
		padding: 20px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 24px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 16px;
	}

	.character-head {
		display: flex;
		justify-content: space-between;
		gap: 14px;
		align-items: start;
	}

	.character-head h3,
	.character-head p,
	.character-foot p,
	.character-tile span,
	.character-tile small {
		margin: 0;
	}

	.character-head p,
	.character-foot p,
	.character-tile span,
	.character-tile small,
	.character-tile li {
		color: var(--text-soft);
	}

	.detail-button {
		min-height: 42px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--ledger-accent) 35%, var(--line));
		background: color-mix(in srgb, var(--ledger-accent-soft) 82%, white);
		color: color-mix(in srgb, var(--ledger-accent-deep) 82%, var(--text-main));
		font: inherit;
		font-weight: 700;
	}

	.character-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}

	.character-tile {
		padding: 14px;
		border: 1px solid var(--line);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		display: grid;
		gap: 8px;
	}

	.character-tile strong {
		font-size: 1.05rem;
	}

	.character-tile ul {
		margin: 0;
		padding-left: 18px;
		display: grid;
		gap: 6px;
	}

	@media (max-width: 720px) {
		.character-grid {
			grid-template-columns: 1fr;
		}

		.character-head {
			flex-direction: column;
		}
	}
</style>
