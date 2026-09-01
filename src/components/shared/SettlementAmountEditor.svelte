<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import {
		calculateSettlementNetAmount,
		formatAmountDisplay,
		normalizeNumericInput,
		type SettlementAmountState,
		type SettlementFeeMode,
	} from '../../libs/ledger/settlement-amounts.ts';

	interface Labels {
		amountLabel: string;
		grossAmountLabel: string;
		netAmountLabel: string;
		ruleSectionLabel: string;
		ruleToggleLabel: string;
		ruleHideLabel: string;
		feeModeNone: string;
		feeModePercent: string;
		feeModeFixed: string;
		feeModeRule: string;
		feePercentLabel: string;
		feeAmountLabel: string;
		feeRuleKeyLabel: string;
		feeRuleKeyPlaceholder: string;
		autoNetHint: string;
		requiredHint: string;
		optionalHint: string;
	}

	const dispatch = createEventDispatcher<{
		change: SettlementAmountState;
	}>();

	export let grossAmount = '';
	export let netAmount = '';
	export let feeMode: SettlementFeeMode = 'none';
	export let feePercent = '';
	export let feeAmount = '';
	export let feeRuleKey = '';
	export let disabled = false;
	export let labels: Labels;
	export let errors: {
		grossAmount?: string;
		netAmount?: string;
		feePercent?: string;
		feeAmount?: string;
		feeRuleKey?: string;
	} = {};

	let rulePanelOpen = false;
	let grossFocused = false;
	let feePercentFocused = false;
	let feeAmountFocused = false;

	function getFeeModeLabel(mode: SettlementFeeMode) {
		if (mode === 'percent') {
			return labels.feeModePercent;
		}

		if (mode === 'fixed') {
			return labels.feeModeFixed;
		}

		if (mode === 'rule') {
			return labels.feeModeRule;
		}

		return labels.feeModeNone;
	}

	function emitChange(next: Partial<SettlementAmountState>) {
		const merged: SettlementAmountState = {
			grossAmount,
			netAmount,
			feeMode,
			feePercent,
			feeAmount,
			feeRuleKey,
			...next,
		};

		merged.netAmount = calculateSettlementNetAmount(merged);
		dispatch('change', merged);
	}

	function handleGrossInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		emitChange({ grossAmount: normalizeNumericInput(target.value) });
	}

	function handleFeePercentInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		emitChange({ feePercent: normalizeNumericInput(target.value) });
	}

	function handleFeeAmountInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		emitChange({ feeAmount: normalizeNumericInput(target.value) });
	}

	function handleFeeRuleKeyInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		emitChange({ feeRuleKey: target.value });
	}

	function handleFeeModeChange(nextMode: SettlementFeeMode) {
		rulePanelOpen = false;

		if (nextMode === 'none') {
			emitChange({
				feeMode: 'none',
				feePercent: '',
				feeAmount: '',
				feeRuleKey: '',
			});
			return;
		}

		if (nextMode === 'percent') {
			emitChange({
				feeMode: 'percent',
				feeAmount: '',
				feeRuleKey: '',
			});
			return;
		}

		if (nextMode === 'fixed') {
			emitChange({
				feeMode: 'fixed',
				feePercent: '',
				feeRuleKey: '',
			});
			return;
		}

		emitChange({
			feeMode: 'rule',
			feePercent: '',
		});
	}

	function handleEnterBlur(event: KeyboardEvent) {
		if (event.key !== 'Enter') {
			return;
		}

		const target = event.currentTarget;
		if (target instanceof HTMLInputElement) {
			target.blur();
		}
	}

	$: grossDisplayValue = grossFocused ? grossAmount : formatAmountDisplay(grossAmount);
	$: feePercentDisplayValue = feePercentFocused ? feePercent : formatAmountDisplay(feePercent);
	$: feeAmountDisplayValue = feeAmountFocused ? feeAmount : formatAmountDisplay(feeAmount);
	$: netDisplayValue = formatAmountDisplay(netAmount);
	$: amountPrimaryLabel = feeMode === 'none' ? labels.amountLabel : labels.grossAmountLabel;
</script>

<section class="settlement-amount-editor">
	<label class="settlement-amount-field">
		<span>{amountPrimaryLabel}</span>
		<input
			class:error={Boolean(errors.grossAmount)}
			type="text"
			inputmode="decimal"
			value={grossDisplayValue}
			disabled={disabled}
			on:focus={() => {
				grossFocused = true;
			}}
			on:blur={() => {
				grossFocused = false;
			}}
			on:keydown={handleEnterBlur}
			on:input={handleGrossInput}
		/>
		<small>{labels.requiredHint}</small>
		{#if errors.grossAmount}<em>{errors.grossAmount}</em>{/if}
	</label>

	<div class="settlement-amount-rule-card">
		<div class="settlement-amount-rule-head">
			<div>
				<span>{labels.ruleSectionLabel}</span>
				<strong>{getFeeModeLabel(feeMode)}</strong>
			</div>
			<button
				type="button"
				class="settlement-amount-rule-toggle"
				disabled={disabled}
				on:click={() => {
					rulePanelOpen = !rulePanelOpen;
				}}
			>
				{rulePanelOpen ? labels.ruleHideLabel : labels.ruleToggleLabel}
			</button>
		</div>

		{#if rulePanelOpen}
			<div class="settlement-amount-rule-options" role="radiogroup" aria-label={labels.ruleSectionLabel}>
				{#each ([
					['none', labels.feeModeNone],
					['percent', labels.feeModePercent],
					['fixed', labels.feeModeFixed],
					['rule', labels.feeModeRule],
				] as Array<[SettlementFeeMode, string]>) as [mode, label]}
					<button
						type="button"
						class="settlement-amount-rule-chip"
						class:active={feeMode === mode}
						aria-pressed={feeMode === mode ? 'true' : 'false'}
						on:click={() => handleFeeModeChange(mode)}
					>
						{label}
					</button>
				{/each}
			</div>
		{/if}

		{#if feeMode === 'percent'}
			<label class="settlement-amount-field">
				<span>{labels.feePercentLabel}</span>
				<input
					class:error={Boolean(errors.feePercent)}
					type="text"
					inputmode="decimal"
					value={feePercentDisplayValue}
					disabled={disabled}
					on:focus={() => {
						feePercentFocused = true;
					}}
					on:blur={() => {
						feePercentFocused = false;
					}}
					on:keydown={handleEnterBlur}
					on:input={handleFeePercentInput}
				/>
				<small>{labels.optionalHint}</small>
				{#if errors.feePercent}<em>{errors.feePercent}</em>{/if}
			</label>
		{:else if feeMode === 'fixed' || feeMode === 'rule'}
			<label class="settlement-amount-field">
				<span>{labels.feeAmountLabel}</span>
				<input
					class:error={Boolean(errors.feeAmount)}
					type="text"
					inputmode="decimal"
					value={feeAmountDisplayValue}
					disabled={disabled}
					on:focus={() => {
						feeAmountFocused = true;
					}}
					on:blur={() => {
						feeAmountFocused = false;
					}}
					on:keydown={handleEnterBlur}
					on:input={handleFeeAmountInput}
				/>
				<small>{labels.optionalHint}</small>
				{#if errors.feeAmount}<em>{errors.feeAmount}</em>{/if}
			</label>
		{/if}

		{#if feeMode === 'rule'}
			<label class="settlement-amount-field">
				<span>{labels.feeRuleKeyLabel}</span>
				<input
					class:error={Boolean(errors.feeRuleKey)}
					type="text"
					maxlength="120"
					value={feeRuleKey}
					placeholder={labels.feeRuleKeyPlaceholder}
					disabled={disabled}
					on:input={handleFeeRuleKeyInput}
				/>
				<small>{labels.optionalHint}</small>
				{#if errors.feeRuleKey}<em>{errors.feeRuleKey}</em>{/if}
			</label>
		{/if}
	</div>

	{#if feeMode !== 'none'}
		<div class="settlement-amount-net-card">
			<span>{labels.netAmountLabel}</span>
			<strong>{netDisplayValue || '0'}</strong>
			<small>{labels.autoNetHint}</small>
			{#if errors.netAmount}<em>{errors.netAmount}</em>{/if}
		</div>
	{/if}
</section>

<style>
	.settlement-amount-editor {
		grid-column: 1 / -1;
		display: grid;
		gap: 16px;
		padding: 18px;
		border-radius: 22px;
		border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 12%, transparent), transparent 42%),
			color-mix(in srgb, var(--surface-strong) 84%, white);
	}

	.settlement-amount-field {
		display: grid;
		gap: 8px;
	}

	.settlement-amount-field span,
	.settlement-amount-rule-head span,
	.settlement-amount-net-card span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.settlement-amount-field input {
		width: 100%;
		min-height: 52px;
		padding: 12px 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
		font: inherit;
	}

	.settlement-amount-field input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.settlement-amount-field small,
	.settlement-amount-rule-head strong,
	.settlement-amount-net-card small {
		color: var(--text-soft);
	}

	.settlement-amount-field em,
	.settlement-amount-net-card em {
		color: rgba(180, 60, 60, 0.92);
		font-style: normal;
		font-size: 0.9rem;
	}

	.settlement-amount-rule-card,
	.settlement-amount-net-card {
		display: grid;
		gap: 12px;
		padding: 16px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
	}

	.settlement-amount-rule-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.settlement-amount-rule-head > div,
	.settlement-amount-net-card {
		display: grid;
		gap: 4px;
	}

	.settlement-amount-rule-toggle,
	.settlement-amount-rule-chip {
		min-height: 40px;
		padding: 0 14px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.settlement-amount-rule-toggle {
		border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--line));
		background: white;
		color: var(--text-main);
	}

	.settlement-amount-rule-options {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.settlement-amount-rule-chip {
		border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 86%, white);
		color: var(--text-main);
	}

	.settlement-amount-rule-chip.active {
		border-color: color-mix(in srgb, #2563eb 72%, white);
		background: color-mix(in srgb, #2563eb 14%, white);
		color: #123c94;
	}

	.settlement-amount-net-card strong {
		font-size: clamp(1.35rem, 2.5vw, 1.8rem);
		line-height: 1.1;
	}
	@media (max-width: 640px) {
		.settlement-amount-rule-head {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
