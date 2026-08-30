<script lang="ts">
	import type { OrganizationLedgerDashboardSummaryResponse } from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		title: string;
		dashboardSuffix: string;
		revenueLabel: string;
		revenueEmptyLabel: string;
		settlementCountLabel: string;
		unsettledEventCountLabel: string;
		disbursementStatusLabel: string;
		disbursementInProgressLabel: string;
		disbursementNotStartedLabel: string;
		lastUpdatedLabel: string;
	}

	export let summary: OrganizationLedgerDashboardSummaryResponse | null = null;
	export let organizationName: string | null = null;
	export let labels: Labels;
	export let lang = 'en';

	const localeByLang: Record<string, string> = {
		en: 'en-US',
		ja: 'ja-JP',
		'zh-tw': 'zh-TW',
	};

	function getLocale() {
		return localeByLang[lang] ?? lang;
	}

	function formatAmount(value: number) {
		return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value);
	}

	function formatCompactAmount(value: number) {
		return new Intl.NumberFormat(getLocale(), {
			notation: 'compact',
			compactDisplay: 'short',
			maximumFractionDigits: 1,
		}).format(value);
	}

	function formatCount(value: number) {
		return new Intl.NumberFormat(getLocale()).format(value);
	}

	function formatDateTime(value: string) {
		return new Intl.DateTimeFormat(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	$: headingName = summary?.organization.name ?? organizationName ?? labels.title;
	$: revenueItems = summary?.summary.revenueUnitBreakdown ?? [];
</script>

<article class="overview-card">
	<div class="overview-head">
		<div class="overview-title-block">
			<p class="overview-kicker">📊 {labels.title}</p>
			<h1>{headingName} {labels.dashboardSuffix}</h1>
		</div>
		{#if summary}
			<p class="overview-updated">{labels.lastUpdatedLabel}: {formatDateTime(summary.generatedAt)}</p>
		{/if}
	</div>

	<ul class="overview-list">
		<li class="overview-row overview-row-revenue">
			<div class="overview-row-copy">
				<p class="overview-label">💰 {labels.revenueLabel}</p>
				{#if revenueItems.length > 0}
					<div class="revenue-stack">
						{#each revenueItems as unit}
							<p
								class="revenue-item"
								title={`${unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`}: ${formatAmount(unit.netAmountTotal)}`}
							>
								<span>{unit.unitAssetName ?? `Asset #${unit.unitAssetId ?? '—'}`}</span>
								<strong>{formatCompactAmount(unit.netAmountTotal)}</strong>
							</p>
						{/each}
					</div>
				{:else}
					<p class="overview-empty">{labels.revenueEmptyLabel}</p>
				{/if}
			</div>
		</li>

		<li class="overview-row">
			<p class="overview-label">📦 {labels.settlementCountLabel}</p>
			<strong class="overview-value">{formatCount(summary?.summary.settlementCount ?? 0)}</strong>
		</li>

		<li class="overview-row">
			<p class="overview-label">⏳ {labels.unsettledEventCountLabel}</p>
			<strong class="overview-value">{formatCount(summary?.summary.unsettledEventCount ?? 0)}</strong>
		</li>

		<li class="overview-row">
			<p class="overview-label">{labels.disbursementStatusLabel}</p>
			<div class="status-inline">
				<span>🟡 {labels.disbursementInProgressLabel}: {formatCount(summary?.summary.disbursementInProgressCount ?? 0)}</span>
				<span>🔴 {labels.disbursementNotStartedLabel}: {formatCount(summary?.summary.disbursementNotStartedCount ?? 0)}</span>
			</div>
		</li>
	</ul>
</article>

<style>
	.overview-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 90%, white);
		border-radius: var(--radius-lg);
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ledger-accent) 14%, transparent), transparent 42%),
			var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 22px;
	}

	.overview-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: start;
	}

	.overview-title-block,
	.overview-row-copy {
		display: grid;
		gap: 8px;
	}

	.overview-kicker,
	.overview-updated,
	.overview-label,
	.overview-empty,
	.revenue-item span,
	.status-inline span {
		margin: 0;
		color: var(--text-soft);
	}

	.overview-head h1 {
		margin: 0;
		letter-spacing: -0.03em;
		font-size: clamp(1.9rem, 3vw, 2.8rem);
		line-height: 1.05;
	}

	.overview-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 14px;
	}

	.overview-row {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: 16px;
		padding: 6px 0;
	}

	.overview-row-revenue {
		padding-top: 0;
	}

	.overview-label {
		font-size: 1rem;
		font-weight: 600;
	}

	.overview-value {
		font-size: clamp(1.25rem, 2vw, 1.6rem);
		line-height: 1.1;
		text-align: right;
	}

	.revenue-stack {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
	}

	.revenue-item {
		margin: 0;
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		padding: 0;
	}

	.revenue-item strong {
		font-size: 1.05rem;
		color: var(--text-main);
	}

	.status-inline {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 10px 14px;
		text-align: right;
	}

	@media (max-width: 720px) {
		.overview-card {
			padding: 20px;
		}

		.overview-head,
		.overview-row {
			flex-direction: column;
		}

		.overview-value,
		.status-inline {
			text-align: left;
			justify-content: flex-start;
		}
	}
</style>
