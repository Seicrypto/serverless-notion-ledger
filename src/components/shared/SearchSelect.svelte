<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export interface SearchSelectItem {
		value: string;
		label: string;
		metaLabel?: string | null;
	}

	const dispatch = createEventDispatcher<{
		change: { value: string };
		search: { query: string };
		focus: { query: string };
	}>();
	const instanceId = `search-select-${Math.random().toString(36).slice(2, 10)}`;

	export let items: SearchSelectItem[] = [];
	export let value = '';
	export let placeholder = '';
	export let emptyLabel = 'No matches found.';
	export let disabled = false;
	export let error = false;
	export let ariaLabel = 'Search select';
	export let triggerMode: 'input' | 'button' = 'input';
	export let buttonIdleLabel = 'Add selection';
	export let buttonActiveLabel = 'Change selection';
	export let searchPlaceholder = '';

	let open = false;
	let query = '';

	function getSelectedItem() {
		return items.find((item) => item.value === value) ?? null;
	}

	function selectItem(nextValue: string) {
		value = nextValue;
		open = false;
		dispatch('change', { value: nextValue });
	}

	function handleInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		query = target.value;
		open = true;
		dispatch('search', { query });
	}

	function handleFocus() {
		if (!disabled) {
			open = true;
			dispatch('focus', { query });
		}
	}

	function handleButtonClick() {
		if (disabled) {
			return;
		}

		open = !open;
		if (open) {
			query = '';
			dispatch('focus', { query });
		}
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open) {
			return;
		}

		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (!target.closest(`[data-search-select-root="${instanceId}"]`)) {
			open = false;
		}
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}

	$: selectedItem = getSelectedItem();
	$: normalizedQuery = query.trim().toLocaleLowerCase();
	$: filteredItems = normalizedQuery
		? items.filter((item) => {
				const haystacks = [item.label, item.metaLabel ?? '', item.value];
				return haystacks.some((candidate) => candidate.toLocaleLowerCase().includes(normalizedQuery));
			})
		: items;
	$: if (!open && triggerMode === 'input') {
		query = selectedItem?.label ?? '';
	}
</script>

<svelte:document on:click={handleDocumentClick} on:keydown={handleDocumentKeydown} />

<div class="search-select" data-search-select-root={instanceId}>
	{#if triggerMode === 'button'}
		<button
			type="button"
			class:error
			class="search-select-trigger"
			aria-label={ariaLabel}
			aria-expanded={open ? 'true' : 'false'}
			disabled={disabled}
			on:click={handleButtonClick}
		>
			<span>{selectedItem ? buttonActiveLabel : buttonIdleLabel}</span>
			<b aria-hidden="true">{open ? '−' : '+'}</b>
		</button>
	{:else}
		<input
			class:error
			class="search-select-input"
			type="search"
			autocomplete="off"
			bind:value={query}
			placeholder={selectedItem?.label ?? placeholder}
			aria-label={ariaLabel}
			disabled={disabled}
			on:input={handleInput}
			on:focus={handleFocus}
		/>
	{/if}

	{#if open && !disabled}
		<div class="search-select-menu" role="listbox" aria-label={ariaLabel}>
			{#if triggerMode === 'button'}
				<input
					class:error
					class="search-select-input search-select-menu-input"
					type="search"
					autocomplete="off"
					bind:value={query}
					placeholder={searchPlaceholder || placeholder}
					aria-label={ariaLabel}
					on:input={handleInput}
				/>
			{/if}
			{#if filteredItems.length > 0}
				{#each filteredItems as item}
					<button
						type="button"
						role="option"
						class:active={item.value === value}
						class="search-select-option"
						aria-selected={item.value === value ? 'true' : 'false'}
						on:click={() => selectItem(item.value)}
					>
						<span class="search-select-copy">
							<span>{item.label}</span>
							{#if item.metaLabel}
								<strong>{item.metaLabel}</strong>
							{/if}
						</span>
					</button>
				{/each}
			{:else}
				<p class="search-select-empty">{emptyLabel}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.search-select {
		position: relative;
		width: 100%;
	}

	.search-select-input,
	.search-select-option,
	.search-select-trigger {
		font: inherit;
	}

	.search-select-input {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
	}

	.search-select-input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.search-select-trigger {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px dashed color-mix(in srgb, var(--accent) 20%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
	}

	.search-select-trigger.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.search-select-trigger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.search-select-trigger b {
		font-size: 1rem;
		line-height: 1;
	}

	.search-select-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.search-select-menu {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		padding: 8px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 18px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 4px;
		z-index: 30;
		max-height: min(320px, calc(100vh - 180px));
		overflow: auto;
	}

	.search-select-menu-input {
		margin-bottom: 4px;
	}

	.search-select-option {
		min-height: 44px;
		padding: 0 12px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-main);
		cursor: pointer;
		text-align: left;
	}

	.search-select-option:hover {
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
	}

	.search-select-option.active {
		background: color-mix(in srgb, var(--ledger-accent) 14%, var(--surface-strong));
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	.search-select-copy {
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.search-select-copy strong {
		padding: 4px 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--ledger-accent) 14%, var(--surface-soft));
		color: color-mix(in srgb, var(--ledger-accent-deep) 86%, var(--text-main));
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.search-select-empty {
		margin: 0;
		padding: 12px 10px;
		color: var(--text-soft);
		line-height: 1.6;
	}

	@media (max-width: 720px) {
		.search-select-menu {
			max-height: min(260px, calc(100vh - 220px));
		}
	}
</style>
