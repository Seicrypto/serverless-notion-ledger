<script lang="ts">
	import type { OrganizationLedgerDashboardSummaryResponse } from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		title: string;
		dashboardSuffix: string;
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
	}

	export let summary: OrganizationLedgerDashboardSummaryResponse | null = null;
	export let organizationName: string | null = null;
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

	$: headingName = summary?.organization.name ?? organizationName ?? labels.title;
	$: revenueItems = summary?.summary.revenueUnitBreakdown ?? [];
</script>

<article class="overview-card">
	<div class="overview-head">
		<div>
			<p class="overview-kicker">{labels.title}</p>
			<h1>{headingName} {labels.dashboardSuffix}</h1>
		</div>
		{#if summary}
			<p class="overview-updated">{labels.lastUpdatedLabel}: {formatDateTime(summary.generatedAt)}</p>
		{/if}
	</div>

	<div class="overview-grid">
		<section class="overview-tile overview-tile-wide">
			<div class="overview-tile-head">
				<span>{labels.revenueLabel}</span>
				<small>{labels.revenueHelperLabel}</small>
			</div>
			{#if revenueItems.length > 0}
				<ul>
					{#each revenueItems as unit}
						<li>
							<div class="overview-metric-copy">
								<strong>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`}</strong>
								<small>{unit.settlementCount} settlements</small>
							</div>
							<strong class="overview-metric-value">{formatAmount(unit.netAmountTotal)}</strong>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="overview-empty">{labels.revenueEmptyLabel}</p>
			{/if}
		</section>

		<section class="overview-tile">
			<div class="overview-tile-head">
				<span>{labels.settlementCountLabel}</span>
				<small>{labels.settlementCountHelperLabel}</small>
			</div>
			<strong class="overview-stat-value">{summary?.summary.settlementCount ?? 0}</strong>
		</section>

		<section class="overview-tile">
			<div class="overview-tile-head">
				<span>{labels.unsettledEventCountLabel}</span>
				<small>{labels.unsettledEventCountHelperLabel}</small>
			</div>
			<strong class="overview-stat-value">{summary?.summary.unsettledEventCount ?? 0}</strong>
		</section>

		<section class="overview-tile">
			<div class="overview-tile-head">
				<span>{labels.disbursementStatusLabel}</span>
				<small>{labels.disbursementStatusHelperLabel}</small>
			</div>
			<div class="status-stack">
				<div class="status-pill">
					<span>{labels.disbursementInProgressLabel}</span>
					<strong>{summary?.summary.disbursementInProgressCount ?? 0}</strong>
				</div>
				<div class="status-pill">
					<span>{labels.disbursementNotStartedLabel}</span>
					<strong>{summary?.summary.disbursementNotStartedCount ?? 0}</strong>
				</div>
			</div>
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

	.overview-head h1 {
		margin: 10px 0 0;
		letter-spacing: -0.03em;
		font-size: clamp(1.9rem, 3vw, 2.8rem);
		line-height: 1.05;
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

	.overview-tile-head {
		display: grid;
		gap: 6px;
	}

	.overview-tile-wide {
		grid-column: span 2;
	}

	.overview-stat-value {
		font-size: clamp(1.8rem, 3vw, 2.4rem);
		line-height: 1;
	}

	.overview-empty {
		margin: 0;
		color: var(--text-soft);
		padding: 18px;
		border-radius: 16px;
		background: color-mix(in srgb, var(--ledger-accent-soft) 38%, white);
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
		align-items: start;
		padding: 12px 0;
		border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
	}

	.overview-tile li:first-child {
		padding-top: 0;
		border-top: 0;
	}

	.overview-metric-copy {
		display: grid;
		gap: 4px;
	}

	.overview-metric-value {
		font-size: 1.15rem;
	}

	.status-stack {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.status-pill {
		padding: 12px 14px;
		border-radius: 16px;
		background: color-mix(in srgb, var(--ledger-accent-soft) 32%, white);
		border: 1px solid color-mix(in srgb, var(--ledger-accent) 20%, var(--line));
		display: grid;
		gap: 6px;
	}

	.status-pill strong {
		font-size: 1.4rem;
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

		.status-stack {
			grid-template-columns: 1fr;
		}
	}
</style>
