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
		viewInfoLabel: string;
	}

	export let summary: OrganizationLedgerDashboardSummaryResponse | null = null;
	export let organizationName: string | null = null;
	export let organizationReference: string | null = null;
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
			<p class="overview-kicker">
				<svg viewBox="0 0 24 24" aria-hidden="true" class="overview-heading-icon overview-heading-icon-chart">
					<path d="M4 19h16"></path>
					<path d="M7 16V10"></path>
					<path d="M12 16V6"></path>
					<path d="M17 16v-4"></path>
				</svg>
				{labels.title}
			</p>
			<h1>{headingName} {labels.dashboardSuffix}</h1>
		</div>
		{#if summary}
			<div class="overview-meta">
				<p class="overview-updated">{labels.lastUpdatedLabel}: {formatDateTime(summary.generatedAt)}</p>
				{#if organizationReference}
					<a
						class="overview-info-link"
						href={`/${lang}/guilds/info?orgVanity=${encodeURIComponent(organizationReference)}`}
					>
						{labels.viewInfoLabel}
					</a>
				{/if}
			</div>
		{/if}
	</div>

	<ul class="overview-list">
		<li class="overview-row overview-row-revenue">
			<div class="overview-row-copy">
				<p class="overview-label">
					<svg viewBox="0 0 24 24" aria-hidden="true" class="overview-inline-icon overview-inline-icon-gold">
						<path d="M7 8h10l1 10H6L7 8Z"></path>
						<path d="M9 8V6a3 3 0 0 1 6 0v2"></path>
					</svg>
					{labels.revenueLabel}
				</p>
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
			<p class="overview-label">
				<svg viewBox="0 0 24 24" aria-hidden="true" class="overview-inline-icon overview-inline-icon-blue">
					<path d="M8 12l3 3 5-6"></path>
					<path d="M5 5h14v14H5z"></path>
				</svg>
				{labels.settlementCountLabel}
			</p>
			<strong class="overview-value">{formatCount(summary?.summary.settlementCount ?? 0)}</strong>
		</li>

		<li class="overview-row">
			<p class="overview-label">
				<svg viewBox="0 0 24 24" aria-hidden="true" class="overview-inline-icon overview-inline-icon-amber">
					<path d="M8 4h8"></path>
					<path d="M8 20h8"></path>
					<path d="M8 4c0 4 4 4 4 8s-4 4-4 8"></path>
					<path d="M16 4c0 4-4 4-4 8s4 4 4 8"></path>
				</svg>
				{labels.unsettledEventCountLabel}
			</p>
			<strong class="overview-value">{formatCount(summary?.summary.unsettledEventCount ?? 0)}</strong>
		</li>

		<li class="overview-row">
			<p class="overview-label">
				<svg viewBox="0 0 24 24" aria-hidden="true" class="overview-inline-icon overview-inline-icon-rose">
					<path d="M5 12h14"></path>
					<path d="M12 5v14"></path>
					<path d="M7.5 7.5l9 9"></path>
					<path d="M16.5 7.5l-9 9"></path>
				</svg>
				{labels.disbursementStatusLabel}
			</p>
			<div class="status-inline">
				<span class="status-chip status-chip-warn">
					{labels.disbursementInProgressLabel}: {formatCount(summary?.summary.disbursementInProgressCount ?? 0)}
				</span>
				<span class="status-chip status-chip-danger">
					{labels.disbursementNotStartedLabel}: {formatCount(summary?.summary.disbursementNotStartedCount ?? 0)}
				</span>
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

	.overview-meta {
		display: grid;
		gap: 10px;
		justify-items: end;
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

	.overview-kicker,
	.overview-label {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	.overview-head h1 {
		margin: 0;
		letter-spacing: -0.03em;
		font-size: clamp(1.9rem, 3vw, 2.8rem);
		line-height: 1.05;
	}

	.overview-info-link {
		min-height: 38px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1px solid transparent;
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 700;
		box-shadow: 0 16px 30px -22px rgba(37, 99, 235, 0.95);
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			box-shadow 0.18s ease;
	}

	.overview-info-link:hover {
		transform: translateY(-1px);
		background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
		box-shadow: 0 20px 32px -22px rgba(29, 78, 216, 1);
	}

	.overview-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 14px;
		width: fit-content;
		max-width: 100%;
	}

	.overview-row {
		display: grid;
		grid-template-columns: minmax(210px, auto) max-content;
		align-items: start;
		gap: 16px 28px;
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
		text-align: left;
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
		gap: 10px 14px;
	}

	.status-chip {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 0.95rem;
	}

	.status-chip-warn {
		background: color-mix(in srgb, #f6c453 16%, white);
		color: #9a6700;
	}

	.status-chip-danger {
		background: color-mix(in srgb, #d94841 14%, white);
		color: #b42318;
	}

	.overview-heading-icon,
	.overview-inline-icon {
		flex: 0 0 auto;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.overview-heading-icon {
		width: 18px;
		height: 18px;
	}

	.overview-inline-icon {
		width: 20px;
		height: 20px;
	}

	.overview-heading-icon-chart {
		color: #4c6ef5;
	}

	.overview-inline-icon-gold {
		color: #c99700;
	}

	.overview-inline-icon-blue {
		color: #1971c2;
	}

	.overview-inline-icon-amber {
		color: #b7791f;
	}

	.overview-inline-icon-rose {
		color: #c2255c;
	}

	@media (max-width: 720px) {
		.overview-card {
			padding: 20px;
		}

		.overview-head,
		.overview-row {
			display: flex;
			flex-direction: column;
		}

		.overview-meta {
			justify-items: start;
		}

		.overview-value,
		.status-inline {
			text-align: left;
			justify-content: flex-start;
		}
	}
</style>
