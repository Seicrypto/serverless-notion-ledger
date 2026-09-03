<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export interface AssetOptionPickerItem {
		value: string;
		label: string;
		iconUrl?: string | null;
	}

	const dispatch = createEventDispatcher<{
		change: { value: string };
		search: { query: string };
		focus: { query: string };
		detail: { value: string };
	}>();
	const instanceId = `asset-option-picker-${Math.random().toString(36).slice(2, 10)}`;

	export let items: AssetOptionPickerItem[] = [];
	export let value = '';
	export let placeholder = '';
	export let searchPlaceholder = '';
	export let emptyLabel = 'No matching items.';
	export let disabled = false;
	export let error = false;
	export let ariaLabel = 'Asset picker';
	export let searchLabel = 'Search';
	export let searchingLabel = 'Searching';
	export let detailLabel = 'Item detail';
	export let searchPending = false;
	export let detailDisabled = false;

	let open = false;
	let query = '';
	let failedIconUrls = new Set<string>();

	function getIconUrl(item: AssetOptionPickerItem | null) {
		if (!item?.iconUrl || failedIconUrls.has(item.iconUrl)) {
			return null;
		}

		return item.iconUrl;
	}

	function markIconFailed(url: string | null) {
		if (!url) {
			return;
		}

		failedIconUrls = new Set([...failedIconUrls, url]);
	}

	function toggleOpen() {
		if (disabled) {
			return;
		}

		open = !open;
		if (!open) {
			query = '';
			return;
		}

		dispatch('focus', { query });
	}

	function handleInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		query = target.value;
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter') {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		requestSearch();
	}

	function selectItem(nextValue: string) {
		if (!items.some((item) => item.value === nextValue)) {
			return;
		}

		open = false;
		query = '';
		dispatch('change', { value: nextValue });
	}

	function requestSearch() {
		if (disabled || searchPending) {
			return;
		}

		dispatch('search', { query: query.trim() });
	}

	function requestDetail() {
		if (!value || detailDisabled) {
			return;
		}

		dispatch('detail', { value });
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open) {
			return;
		}

		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (!target.closest(`[data-asset-option-picker-root="${instanceId}"]`)) {
			open = false;
			query = '';
		}
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			query = '';
		}
	}

	$: selectedItem = items.find((item) => item.value === value) ?? null;
	$: normalizedQuery = query.trim().toLocaleLowerCase();
	$: filteredItems = normalizedQuery
		? items.filter((item) =>
				[item.label, item.value].some((candidate) =>
					candidate.toLocaleLowerCase().includes(normalizedQuery),
				),
			)
		: items;
</script>

<svelte:document on:click={handleDocumentClick} on:keydown={handleDocumentKeydown} />

<div class="asset-option-picker" data-asset-option-picker-root={instanceId}>
	<div class="asset-option-picker-trigger-row">
		<button
			type="button"
			class="asset-option-picker-trigger"
			class:error
			aria-label={ariaLabel}
			aria-expanded={open ? 'true' : 'false'}
			disabled={disabled}
			on:click={toggleOpen}
		>
			<span class="asset-option-picker-trigger-value">
				<span class="asset-option-picker-icon-slot" aria-hidden="true">
					{#if getIconUrl(selectedItem)}
						<img
							src={getIconUrl(selectedItem) ?? undefined}
							alt=""
							on:error={(event) => {
								const target = event.currentTarget;
								if (target instanceof HTMLImageElement) {
									markIconFailed(target.currentSrc || target.src);
								}
							}}
						/>
					{:else}
						<span class="asset-option-picker-icon-blank"></span>
					{/if}
				</span>
				<span class="asset-option-picker-label" class:is-placeholder={!selectedItem}>
					{selectedItem?.label ?? placeholder}
				</span>
			</span>
			<span class="asset-option-picker-chevron" aria-hidden="true">▾</span>
		</button>

		<button
			type="button"
			class="asset-option-picker-detail"
			disabled={!value || detailDisabled}
			on:click={requestDetail}
		>
			{detailLabel}
		</button>
	</div>

	{#if open}
		<div class="asset-option-picker-menu" role="listbox" aria-label={ariaLabel}>
			<div class="asset-option-picker-search-row">
				<input
					class="asset-option-picker-search"
					type="search"
					autocomplete="off"
					bind:value={query}
					placeholder={searchPlaceholder || placeholder}
					aria-label={ariaLabel}
					on:input={handleInput}
					on:keydown={handleSearchKeydown}
				/>
				<button
					type="button"
					class="asset-option-picker-search-button"
					disabled={searchPending}
					on:click={requestSearch}
				>
					{searchPending ? searchingLabel : searchLabel}
				</button>
			</div>

			{#if filteredItems.length > 0}
				{#each filteredItems as item}
					<button
						type="button"
						role="option"
						class="asset-option-picker-option"
						class:active={item.value === value}
						aria-selected={item.value === value ? 'true' : 'false'}
						on:click={() => selectItem(item.value)}
					>
						<span class="asset-option-picker-icon-slot" aria-hidden="true">
							{#if getIconUrl(item)}
								<img
									src={getIconUrl(item) ?? undefined}
									alt=""
									on:error={(event) => {
										const target = event.currentTarget;
										if (target instanceof HTMLImageElement) {
											markIconFailed(target.currentSrc || target.src);
										}
									}}
								/>
							{:else}
								<span class="asset-option-picker-icon-blank"></span>
							{/if}
						</span>
						<span class="asset-option-picker-option-label">{item.label}</span>
					</button>
				{/each}
			{:else}
				<p class="asset-option-picker-empty">{emptyLabel}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.asset-option-picker {
		position: relative;
		width: 100%;
	}

	.asset-option-picker-trigger-row,
	.asset-option-picker-search-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 10px;
		align-items: center;
	}

	.asset-option-picker-trigger,
	.asset-option-picker-detail,
	.asset-option-picker-search,
	.asset-option-picker-search-button,
	.asset-option-picker-option {
		font: inherit;
	}

	.asset-option-picker-trigger {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.asset-option-picker-trigger.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.asset-option-picker-trigger-value,
	.asset-option-picker-option {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.asset-option-picker-label,
	.asset-option-picker-option-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.asset-option-picker-label.is-placeholder {
		color: var(--text-soft);
	}

	.asset-option-picker-icon-slot {
		width: 28px;
		height: 28px;
		flex: none;
		border-radius: 9px;
		overflow: hidden;
		background: color-mix(in srgb, var(--surface-strong) 72%, white);
		border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
		display: grid;
		place-items: center;
	}

	.asset-option-picker-icon-slot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.asset-option-picker-icon-blank {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 28%, white);
	}

	.asset-option-picker-detail,
	.asset-option-picker-search-button {
		min-height: 44px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
		font-weight: 700;
	}

	.asset-option-picker-menu {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		padding: 10px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 18px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 8px;
		z-index: 30;
		max-height: min(360px, calc(100vh - 180px));
		overflow: auto;
	}

	.asset-option-picker-search {
		width: 100%;
		min-height: 44px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
	}

	.asset-option-picker-option {
		width: 100%;
		min-height: 46px;
		padding: 10px 12px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: color-mix(in srgb, var(--surface-strong) 72%, white);
		color: var(--text-main);
		text-align: left;
	}

	.asset-option-picker-option.active {
		border-color: color-mix(in srgb, var(--ledger-accent) 36%, var(--line));
		background: color-mix(in srgb, var(--ledger-accent) 10%, white);
	}

	.asset-option-picker-empty {
		margin: 0;
		padding: 8px 6px 2px;
		color: var(--text-soft);
		line-height: 1.6;
	}

	@media (max-width: 720px) {
		.asset-option-picker-trigger-row,
		.asset-option-picker-search-row {
			grid-template-columns: 1fr;
		}
	}
</style>
