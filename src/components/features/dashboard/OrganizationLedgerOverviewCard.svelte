<script lang="ts">
	import type { OrganizationLedgerDashboardSummaryResponse } from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		title: string;
		revenueLabel: string;
		settlementCountLabel: string;
		unsettledEventCountLabel: string;
		disbursementStatusLabel: string;
		disbursementInProgressLabel: string;
		disbursementNotStartedLabel: string;
		lastUpdatedLabel: string;
	}

	export let summary: OrganizationLedgerDashboardSummaryResponse | null = null;
	export let labels: Labels;

	function formatAmount(value: number) {
		return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
	}

	function formatDateTime(value: string) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}
</script>

<article class="overview-card">
	<div class="overview-head">
		<div>
			<p class="overview-kicker">{labels.title}</p>
			<h2>{summary?.organization.name ?? '—'}</h2>
		</div>
		{#if summary}
			<p class="overview-updated">{labels.lastUpdatedLabel}: {formatDateTime(summary.generatedAt)}</p>
		{/if}
	</div>

	<div class="overview-grid">
		<section class="overview-tile overview-tile-wide">
			<span>{labels.revenueLabel}</span>
			{#if summary}
				<ul>
					{#each summary.summary.revenueUnitBreakdown as unit}
						<li>
							<strong>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`}</strong>
							<small>{formatAmount(unit.netAmountTotal)} / {unit.settlementCount}</small>
						</li>
					{/each}
				</ul>
			{:else}
				<strong>—</strong>
			{/if}
		</section>

		<section class="overview-tile">
			<span>{labels.settlementCountLabel}</span>
			<strong>{summary?.summary.settlementCount ?? 0}</strong>
		</section>

		<section class="overview-tile">
			<span>{labels.unsettledEventCountLabel}</span>
			<strong>{summary?.summary.unsettledEventCount ?? 0}</strong>
		</section>

		<section class="overview-tile">
			<span>{labels.disbursementStatusLabel}</span>
			<strong>
				{labels.disbursementInProgressLabel}: {summary?.summary.disbursementInProgressCount ?? 0}
				|
				{labels.disbursementNotStartedLabel}: {summary?.summary.disbursementNotStartedCount ?? 0}
			</strong>
		</section>
	</div>
</article>

<style>
	.overview-card {
		padding: 24px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: var(--radius-lg);
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ledger-accent) 18%, transparent), transparent 44%),
			var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 18px;
	}

	.overview-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: start;
	}

	.overview-kicker,
	.overview-updated,
	.overview-tile span,
	.overview-tile small {
		margin: 0;
		color: var(--text-soft);
	}

	.overview-head h2 {
		margin: 10px 0 0;
		letter-spacing: -0.03em;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
	}

	.overview-tile {
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		display: grid;
		gap: 10px;
	}

	.overview-tile-wide {
		grid-column: span 2;
	}

	.overview-tile strong {
		font-size: 1.1rem;
	}

	.overview-tile ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.overview-tile li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
	}

	@media (max-width: 980px) {
		.overview-grid {
			grid-template-columns: 1fr 1fr;
		}

		.overview-tile-wide {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 720px) {
		.overview-card {
			padding: 20px;
		}

		.overview-head,
		.overview-grid,
		.overview-tile li {
			grid-template-columns: 1fr;
			flex-direction: column;
		}
	}
</style>
