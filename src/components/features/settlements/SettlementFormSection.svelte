<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import SearchSelect from '../../shared/SearchSelect.svelte';
	import SettlementAmountEditor from '../../shared/SettlementAmountEditor.svelte';
	import TimeSelector from '../../shared/TimeSelector.svelte';
	import type {
		CreateLedgerSettlementRequest,
		LedgerEventDetail,
	} from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		formReadyTitle: string;
		formReadyBody: string;
		formLoadingLabel: string;
		formContextEventLabel: string;
		formContextGameLabel: string;
		formContextAssetLabel: string;
		formContextHolderLabel: string;
		formTitleLabel: string;
		formTitlePlaceholder: string;
		formDecidedAtLabel: string;
		formAmountLabel: string;
		formGrossAmountLabel: string;
		formNetAmountLabel: string;
		formFeeRuleSectionLabel: string;
		formFeeRuleToggleLabel: string;
		formFeeRuleHideLabel: string;
		formFeePercentLabel: string;
		formFeeAmountLabel: string;
		formFeeRuleKeyLabel: string;
		formFeeRuleKeyPlaceholder: string;
		formPayerTypeLabel: string;
		formPayerRefLabel: string;
		formPayerRefPlaceholder: string;
		formPayerRefEmpty: string;
		formPayerRefHint: string;
		formPayerRefSelectedLabel: string;
		formPayerRefAddLabel: string;
		formPayerRefChangeLabel: string;
		formRecipientsLabel: string;
		formRecipientsPlaceholder: string;
		formRecipientsEmpty: string;
		formRecipientsHint: string;
		formRecipientsSelectedLabel: string;
		formRecipientsAddLabel: string;
		formRecipientsMismatchWarning: string;
		clearSelectionLabel: string;
		formSettlementTypeLabel: string;
		formAllocationModeLabel: string;
		formNotesLabel: string;
		formNotesPlaceholder: string;
		formAutoNetHint: string;
		submitLabel: string;
		requiredHint: string;
		optionalHint: string;
		validationRequired: string;
		settlementTypeSale: string;
		settlementTypeBonus: string;
		settlementTypeSalary: string;
		settlementTypeReward: string;
		settlementTypeSubsidy: string;
		settlementTypeAdjustment: string;
		payerTypeCharacter: string;
		payerTypeOrgTreasury: string;
		payerTypeExternal: string;
		payerTypeCustom: string;
		allocationModeEqual: string;
		allocationModeWeight: string;
		allocationModeManual: string;
		feeModeNone: string;
		feeModePercent: string;
		feeModeFixed: string;
		feeModeRule: string;
	}

	type SettlementType = NonNullable<CreateLedgerSettlementRequest['settlementType']>;
	type PayerType = NonNullable<CreateLedgerSettlementRequest['payerType']>;
	type AllocationMode = NonNullable<CreateLedgerSettlementRequest['allocationMode']>;
	type FeeMode = NonNullable<CreateLedgerSettlementRequest['feeMode']>;
	type CharacterSelection = { id: number; name: string };

	const dispatch = createEventDispatcher<{
		submit: void;
		titlechange: { value: string };
		decidedatchange: { value: string };
		settlementtypechange: { value: SettlementType };
		amountchange: {
			grossAmount: string;
			netAmount: string;
			feeMode: FeeMode;
			feePercent: string;
			feeAmount: string;
			feeRuleKey: string;
		};
		payertypechange: { value: PayerType };
		payercharacterchange: { value: string };
		payerrefchange: { value: string };
		recipientadd: { value: string };
		recipientremove: { value: string };
		allocationmodechange: { value: AllocationMode };
		noteschange: { value: string };
	}>();

	const settlementTypeOptions: Array<{ value: SettlementType; labelKey: keyof Labels }> = [
		{ value: 'sale', labelKey: 'settlementTypeSale' },
		{ value: 'bonus', labelKey: 'settlementTypeBonus' },
		{ value: 'salary', labelKey: 'settlementTypeSalary' },
		{ value: 'reward', labelKey: 'settlementTypeReward' },
		{ value: 'subsidy', labelKey: 'settlementTypeSubsidy' },
		{ value: 'adjustment', labelKey: 'settlementTypeAdjustment' },
	];

	const payerTypeOptions: Array<{ value: PayerType; labelKey: keyof Labels }> = [
		{ value: 'character', labelKey: 'payerTypeCharacter' },
		{ value: 'org_treasury', labelKey: 'payerTypeOrgTreasury' },
		{ value: 'external', labelKey: 'payerTypeExternal' },
		{ value: 'custom', labelKey: 'payerTypeCustom' },
	];

	const allocationModeOptions: Array<{ value: AllocationMode; labelKey: keyof Labels }> = [
		{ value: 'equal', labelKey: 'allocationModeEqual' },
		{ value: 'weight', labelKey: 'allocationModeWeight' },
		{ value: 'manual', labelKey: 'allocationModeManual' },
	];

	export let selectedEvent: LedgerEventDetail | null = null;
	export let selectedGameName = '';
	export let selectedAssetName = '';
	export let selectedHolderLabel = '';
	export let loading = false;
	export let submitting = false;
	export let title = '';
	export let decidedAt = '';
	export let settlementType: SettlementType = 'sale';
	export let grossAmount = '';
	export let netAmount = '';
	export let feeMode: FeeMode = 'none';
	export let feePercent = '';
	export let feeAmount = '';
	export let feeRuleKey = '';
	export let payerType: PayerType = 'character';
	export let payerRef = '';
	export let payerCharacterId = '';
	export let selectedPayerCharacter: CharacterSelection | null = null;
	export let payerCharacterOptions: Array<{ value: string; label: string; metaLabel?: string | null }> = [];
	export let selectedRecipientCharacters: CharacterSelection[] = [];
	export let recipientCharacterOptions: Array<{ value: string; label: string; metaLabel?: string | null }> = [];
	export let hasRecipientMismatch = false;
	export let allocationMode: AllocationMode = 'equal';
	export let notes = '';
	export let errors: Record<string, string> = {};
	export let isMemberRestrictedPayerSelection = false;
	export let labels: Labels;
</script>

{#if loading}
	<section class="settlement-card">
		<h2>{labels.formReadyTitle}</h2>
		<p>{labels.formLoadingLabel}</p>
	</section>
{:else if selectedEvent}
	<form
		class="settlement-card settlement-form"
		on:submit|preventDefault={() => dispatch('submit')}
	>
		<div class="form-context">
			<div>
				<span>{labels.formContextEventLabel}</span>
				<strong>{selectedEvent.title}</strong>
			</div>
			<div>
				<span>{labels.formContextGameLabel}</span>
				<strong>{selectedGameName || selectedEvent.game.name}</strong>
			</div>
			<div>
				<span>{labels.formContextAssetLabel}</span>
				<strong>{selectedAssetName || selectedEvent.asset.name}</strong>
			</div>
			<div>
				<span>{labels.formContextHolderLabel}</span>
				<strong>{selectedHolderLabel || selectedEvent.holder.ref || selectedEvent.holder.type}</strong>
			</div>
		</div>

		<div class="settlement-form-grid">
			<label class="settlement-field settlement-field-wide">
				<span>{labels.formTitleLabel}</span>
				<input
					type="text"
					maxlength="200"
					value={title}
					placeholder={labels.formTitlePlaceholder}
					on:input={(event) => {
						const target = event.currentTarget;
						if (target instanceof HTMLInputElement) {
							dispatch('titlechange', { value: target.value });
						}
					}}
				/>
				<small>{labels.requiredHint}</small>
				{#if errors.title}<em>{errors.title}</em>{/if}
			</label>

			<label class="settlement-field">
				<span>{labels.formDecidedAtLabel}</span>
				<TimeSelector
					mode="single"
					inputType="datetime-local"
					value={decidedAt}
					ariaLabel={labels.formDecidedAtLabel}
					error={Boolean(errors.decidedAt)}
					on:change={(event) => dispatch('decidedatchange', event.detail)}
				/>
				<small>{labels.requiredHint}</small>
				{#if errors.decidedAt}<em>{errors.decidedAt}</em>{/if}
			</label>

			<label class="settlement-field">
				<span>{labels.formSettlementTypeLabel}</span>
				<select
					value={settlementType}
					on:change={(event) => {
						const target = event.currentTarget;
						if (target instanceof HTMLSelectElement) {
							dispatch('settlementtypechange', { value: target.value as SettlementType });
						}
					}}
				>
					{#each settlementTypeOptions as option}
						<option value={option.value} selected={option.value === settlementType}>
							{labels[option.labelKey]}
						</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<div class="settlement-field settlement-field-wide">
				<SettlementAmountEditor
					grossAmount={grossAmount}
					netAmount={netAmount}
					feeMode={feeMode}
					feePercent={feePercent}
					feeAmount={feeAmount}
					feeRuleKey={feeRuleKey}
					labels={{
						amountLabel: labels.formAmountLabel,
						grossAmountLabel: labels.formGrossAmountLabel,
						netAmountLabel: labels.formNetAmountLabel,
						ruleSectionLabel: labels.formFeeRuleSectionLabel,
						ruleToggleLabel: labels.formFeeRuleToggleLabel,
						ruleHideLabel: labels.formFeeRuleHideLabel,
						feeModeNone: labels.feeModeNone,
						feeModePercent: labels.feeModePercent,
						feeModeFixed: labels.feeModeFixed,
						feeModeRule: labels.feeModeRule,
						feePercentLabel: labels.formFeePercentLabel,
						feeAmountLabel: labels.formFeeAmountLabel,
						feeRuleKeyLabel: labels.formFeeRuleKeyLabel,
						feeRuleKeyPlaceholder: labels.formFeeRuleKeyPlaceholder,
						autoNetHint: labels.formAutoNetHint,
					}}
					on:change={(event) => dispatch('amountchange', event.detail)}
				/>
				{#if errors.grossAmount}<em>{errors.grossAmount}</em>{/if}
				{#if errors.netAmount}<em>{errors.netAmount}</em>{/if}
			</div>

			<label class="settlement-field">
				<span>{labels.formAllocationModeLabel}</span>
				<select
					value={allocationMode}
					on:change={(event) => {
						const target = event.currentTarget;
						if (target instanceof HTMLSelectElement) {
							dispatch('allocationmodechange', { value: target.value as AllocationMode });
						}
					}}
				>
					{#each allocationModeOptions as option}
						<option value={option.value} selected={option.value === allocationMode}>
							{labels[option.labelKey]}
						</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<label class="settlement-field">
				<span>{labels.formPayerTypeLabel}</span>
				<select
					value={payerType}
					on:change={(event) => {
						const target = event.currentTarget;
						if (target instanceof HTMLSelectElement) {
							dispatch('payertypechange', { value: target.value as PayerType });
						}
					}}
				>
					{#each payerTypeOptions as option}
						<option value={option.value} selected={option.value === payerType}>
							{labels[option.labelKey]}
						</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<div class="settlement-field settlement-field-wide">
				<span>{labels.formPayerRefLabel}</span>
				{#if payerType === 'character'}
					{#if selectedPayerCharacter}
						<div class="selection-chip-row">
							<span class="selection-chip">
								<strong>{selectedPayerCharacter.name}</strong>
								{#if !isMemberRestrictedPayerSelection}
									<button
										type="button"
										aria-label={labels.clearSelectionLabel}
										on:click={() => dispatch('payercharacterchange', { value: '' })}
									>
										×
									</button>
								{/if}
							</span>
						</div>
					{/if}

					<SearchSelect
						value={payerCharacterId}
						items={payerCharacterOptions}
						placeholder={labels.formPayerRefPlaceholder}
						searchPlaceholder={labels.formPayerRefPlaceholder}
						emptyLabel={labels.formPayerRefEmpty}
						error={Boolean(errors.payerRef)}
						ariaLabel={labels.formPayerRefLabel}
						triggerMode="button"
						buttonIdleLabel={labels.formPayerRefAddLabel}
						buttonActiveLabel={labels.formPayerRefChangeLabel}
						disabled={isMemberRestrictedPayerSelection}
						on:change={(event) => dispatch('payercharacterchange', event.detail)}
					/>
				{:else}
					<input
						type="text"
						value={payerRef}
						placeholder={labels.formPayerRefPlaceholder}
						on:input={(event) => {
							const target = event.currentTarget;
							if (target instanceof HTMLInputElement) {
								dispatch('payerrefchange', { value: target.value });
							}
						}}
					/>
				{/if}
				<small>{labels.formPayerRefHint}</small>
				{#if errors.payerRef}<em>{errors.payerRef}</em>{/if}
			</div>

			<div class="settlement-field settlement-field-wide">
				<span>{labels.formRecipientsLabel}</span>
				{#if selectedRecipientCharacters.length > 0}
					<div class="selection-chip-row">
						{#each selectedRecipientCharacters as character}
							<span class="selection-chip">
								<strong>{character.name}</strong>
								<button
									type="button"
									aria-label={labels.clearSelectionLabel}
									on:click={() => dispatch('recipientremove', { value: String(character.id) })}
								>
									×
								</button>
							</span>
						{/each}
					</div>
				{/if}

				<SearchSelect
					value=""
					items={recipientCharacterOptions}
					placeholder={labels.formRecipientsPlaceholder}
					searchPlaceholder={labels.formRecipientsPlaceholder}
					emptyLabel={labels.formRecipientsEmpty}
					error={Boolean(errors.recipientCharacterIds)}
					ariaLabel={labels.formRecipientsLabel}
					triggerMode="button"
					buttonIdleLabel={labels.formRecipientsAddLabel}
					buttonActiveLabel={labels.formRecipientsAddLabel}
					on:change={(event) => dispatch('recipientadd', event.detail)}
				/>
				<small>{labels.formRecipientsHint}</small>
				{#if hasRecipientMismatch}
					<p class="warning-text">{labels.formRecipientsMismatchWarning}</p>
				{/if}
				{#if errors.recipientCharacterIds}<em>{errors.recipientCharacterIds}</em>{/if}
			</div>

			<label class="settlement-field settlement-field-wide">
				<span>{labels.formNotesLabel}</span>
				<textarea
					rows="4"
					value={notes}
					placeholder={labels.formNotesPlaceholder}
					on:input={(event) => {
						const target = event.currentTarget;
						if (target instanceof HTMLTextAreaElement) {
							dispatch('noteschange', { value: target.value });
						}
					}}
				></textarea>
				<small>{labels.optionalHint}</small>
			</label>
		</div>

		<div class="settlement-submit-row">
			<button type="submit" class="primary-button" disabled={submitting}>
				{labels.submitLabel}
			</button>
		</div>
	</form>
{:else}
	<section class="settlement-card">
		<h2>{labels.formReadyTitle}</h2>
		<p>{labels.formReadyBody}</p>
	</section>
{/if}

<style>
	.settlement-card {
		display: grid;
		gap: 18px;
	}

	.form-context {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px 16px;
		padding: 18px;
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		border: 1px solid color-mix(in srgb, var(--line) 88%, white);
	}

	.form-context div {
		display: grid;
		gap: 4px;
	}

	.form-context span,
	.settlement-field small {
		color: var(--text-soft);
	}

	.settlement-form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.settlement-field {
		display: grid;
		gap: 10px;
	}

	.settlement-field > span {
		font-weight: 700;
	}

	.settlement-field-wide {
		grid-column: 1 / -1;
	}

	input,
	select,
	textarea {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
		font: inherit;
	}

	textarea {
		min-height: 120px;
		padding: 14px 16px;
		resize: vertical;
	}

	em,
	.warning-text {
		margin: 0;
		font-style: normal;
		color: #b74a4a;
	}

	.selection-chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.selection-chip {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 14%, white);
		border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--line));
	}

	.selection-chip button {
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 1rem;
		cursor: pointer;
	}

	.settlement-submit-row {
		display: flex;
		justify-content: flex-start;
	}

	@media (max-width: 720px) {
		.form-context,
		.settlement-form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
