<script lang="ts">
	import type {
		CharacterLedgerDashboardDetailResponse,
		LedgerDashboardDetailGroup,
	} from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		titlePrefix: string;
		closeLabel: string;
		receivableLabel: string;
		payableLabel: string;
		totalLabel: string;
		settlementCountLabel: string;
		noDataLabel: string;
		settlementLabel: string;
		eventLabel: string;
		claimStatusLabel: string;
		decidedAtLabel: string;
	}

	export let open = false;
	export let detail: CharacterLedgerDashboardDetailResponse | null = null;
	export let labels: Labels;
	export let onClose: (() => void) | null = null;

	const claimStatusMap: Record<string, string> = {
		none: 'None',
		partial: 'Partial',
		claimed: 'Claimed',
		confirmed: 'Confirmed',
	};

	function formatAmount(value: number) {
		return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
	}

	function formatDateTime(value: string) {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	function groupTotal(group: LedgerDashboardDetailGroup) {
		return group.unitBreakdown.reduce((total, item) => total + item.amountTotal, 0);
	}

	function filterPendingGroups(groups: LedgerDashboardDetailGroup[]) {
		return groups
			.map((group) => {
				const settlements = group.settlements.filter((settlement) => settlement.claimStatus === 'none');
				if (!settlements.length) {
					return null;
				}

				const unitBreakdownMap = new Map<string, { amountTotal: number; settlementCount: number; unitAssetId: number | null; unitAssetName: string | null }>();
				for (const settlement of settlements) {
					const key = `${settlement.unitAssetId ?? 'null'}:${settlement.unitAssetName ?? ''}`;
					const current = unitBreakdownMap.get(key) ?? {
						amountTotal: 0,
						settlementCount: 0,
						unitAssetId: settlement.unitAssetId ?? null,
						unitAssetName: settlement.unitAssetName ?? null,
					};
					current.amountTotal += settlement.amount;
					current.settlementCount += 1;
					unitBreakdownMap.set(key, current);
				}

				return {
					...group,
					settlements,
					unitBreakdown: [...unitBreakdownMap.values()],
				};
			})
			.filter((group): group is LedgerDashboardDetailGroup => group !== null);
	}

	$: pendingReceivableGroups = detail ? filterPendingGroups(detail.receivableGroups) : [];
	$: pendingPayableGroups = detail ? filterPendingGroups(detail.payableGroups) : [];
</script>

{#if open && detail}
	<div class="detail-backdrop" role="presentation">
		<section class="detail-dialog" role="dialog" aria-modal="true">
			<div class="detail-card">
				<div class="detail-head">
					<h2>{labels.titlePrefix}: {detail.character.name}</h2>
					<button type="button" class="detail-close" on:click={onClose}>{labels.closeLabel}</button>
				</div>

				<div class="detail-sections">
					<section class="detail-section">
						<h3>{labels.receivableLabel}</h3>
						{#if pendingReceivableGroups.length === 0}
							<p>{labels.noDataLabel}</p>
						{:else}
							{#each pendingReceivableGroups as group}
								<details class="detail-group">
									<summary>
										<span>{group.counterpartyLabel}</span>
										<strong>{labels.totalLabel}: {formatAmount(groupTotal(group))}</strong>
									</summary>
									<div class="detail-group-body">
										<p>{labels.settlementCountLabel}: {group.settlements.length}</p>
										<ul>
											{#each group.settlements as settlement}
												<li>
													<strong>{labels.settlementLabel}: {settlement.settlementTitle}</strong>
													<span>{labels.eventLabel}: {settlement.eventTitle ?? `#${settlement.eventId ?? '—'}`}</span>
													<span>{labels.claimStatusLabel}: {claimStatusMap[settlement.claimStatus] ?? settlement.claimStatus}</span>
													<span>{labels.decidedAtLabel}: {formatDateTime(settlement.decidedAt)}</span>
													<small>{formatAmount(settlement.amount)} · {settlement.unitAssetName ?? `Asset #${settlement.unitAssetId ?? '—'}`}</small>
												</li>
											{/each}
										</ul>
									</div>
								</details>
							{/each}
						{/if}
					</section>

					<section class="detail-section">
						<h3>{labels.payableLabel}</h3>
						{#if pendingPayableGroups.length === 0}
							<p>{labels.noDataLabel}</p>
						{:else}
							{#each pendingPayableGroups as group}
								<details class="detail-group">
									<summary>
										<span>{group.counterpartyLabel}</span>
										<strong>{labels.totalLabel}: {formatAmount(groupTotal(group))}</strong>
									</summary>
									<div class="detail-group-body">
										<p>{labels.settlementCountLabel}: {group.settlements.length}</p>
										<ul>
											{#each group.settlements as settlement}
												<li>
													<strong>{labels.settlementLabel}: {settlement.settlementTitle}</strong>
													<span>{labels.eventLabel}: {settlement.eventTitle ?? `#${settlement.eventId ?? '—'}`}</span>
													<span>{labels.claimStatusLabel}: {claimStatusMap[settlement.claimStatus] ?? settlement.claimStatus}</span>
													<span>{labels.decidedAtLabel}: {formatDateTime(settlement.decidedAt)}</span>
													<small>{formatAmount(settlement.amount)} · {settlement.unitAssetName ?? `Asset #${settlement.unitAssetId ?? '—'}`}</small>
												</li>
											{/each}
										</ul>
									</div>
								</details>
							{/each}
						{/if}
					</section>
				</div>
			</div>
		</section>
	</div>
{/if}

<style>
	.detail-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(8, 10, 16, 0.42);
		backdrop-filter: blur(8px);
		padding: 24px;
		display: grid;
		place-items: center;
		z-index: 70;
	}

	.detail-dialog {
		width: min(980px, 100%);
		max-height: calc(100vh - 48px);
	}

	.detail-card {
		max-height: inherit;
		overflow: auto;
		padding: 24px;
		border-radius: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 18px;
	}

	.detail-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: start;
	}

	.detail-head h2,
	.detail-section h3,
	.detail-section p {
		margin: 0;
	}

	.detail-close {
		min-height: 42px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		font: inherit;
	}

	.detail-sections {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 18px;
	}

	.detail-section {
		display: grid;
		gap: 12px;
	}

	.detail-section p,
	.detail-group-body p,
	.detail-group li span,
	.detail-group li small {
		color: var(--text-soft);
	}

	.detail-group {
		border: 1px solid var(--line);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		padding: 14px 16px;
	}

	.detail-group summary {
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: center;
	}

	.detail-group-body {
		margin-top: 12px;
		display: grid;
		gap: 10px;
	}

	.detail-group-body ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.detail-group li {
		padding-top: 10px;
		border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
		display: grid;
		gap: 4px;
	}

	@media (max-width: 820px) {
		.detail-sections {
			grid-template-columns: 1fr;
		}
	}
</style>
