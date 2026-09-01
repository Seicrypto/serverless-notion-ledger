<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type TimeSelectorMode = 'single' | 'range';
	type TimeSelectorInputType = 'date' | 'datetime-local';

	export let mode: TimeSelectorMode = 'single';
	export let inputType: TimeSelectorInputType = 'datetime-local';
	export let value = '';
	export let start = '';
	export let end = '';
	export let disabled = false;
	export let error = false;
	export let startError = false;
	export let endError = false;
	export let placeholder = '';
	export let startPlaceholder = '';
	export let endPlaceholder = '';
	export let ariaLabel = 'Time selector';
	export let startAriaLabel = 'Start time';
	export let endAriaLabel = 'End time';

	const dispatch = createEventDispatcher<{
		change: { value: string } | { start: string; end: string };
	}>();

	function handleSingleInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		dispatch('change', { value: target.value });
	}

	function handleRangeInput(nextKey: 'start' | 'end', nextValue: string) {
		dispatch('change', {
			start: nextKey === 'start' ? nextValue : start,
			end: nextKey === 'end' ? nextValue : end,
		});
	}
</script>

{#if mode === 'single'}
	<input
		class="time-selector-input"
		class:error
		type={inputType}
		value={value}
		placeholder={placeholder}
		aria-label={ariaLabel}
		disabled={disabled}
		on:input={handleSingleInput}
	/>
{:else}
	<div class="time-selector-range">
		<input
			class="time-selector-input"
			class:error={startError}
			type={inputType}
			value={start}
			placeholder={startPlaceholder}
			aria-label={startAriaLabel}
			disabled={disabled}
			on:input={(event) => {
				const target = event.currentTarget;
				if (target instanceof HTMLInputElement) {
					handleRangeInput('start', target.value);
				}
			}}
		/>
		<input
			class="time-selector-input"
			class:error={endError}
			type={inputType}
			value={end}
			placeholder={endPlaceholder}
			aria-label={endAriaLabel}
			disabled={disabled}
			on:input={(event) => {
				const target = event.currentTarget;
				if (target instanceof HTMLInputElement) {
					handleRangeInput('end', target.value);
				}
			}}
		/>
	</div>
{/if}

<style>
	.time-selector-range {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.time-selector-input {
		width: 100%;
		min-height: 48px;
		padding: 10px 14px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
		font: inherit;
	}

	.time-selector-input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.time-selector-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 640px) {
		.time-selector-range {
			grid-template-columns: 1fr;
		}
	}
</style>
