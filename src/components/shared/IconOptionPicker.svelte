<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getGameIconCandidates } from '../../libs/games/display.ts';

	export interface IconOptionPickerItem {
		value: string;
		label: string;
		metaLabel?: string | null;
		iconUrl?: string | null;
		resolvedIconUrl?: string | null;
		officialSiteUrl?: string | null;
	}

	const dispatch = createEventDispatcher<{ change: { value: string } }>();
	const instanceId = `icon-option-picker-${Math.random().toString(36).slice(2, 10)}`;

	export let items: IconOptionPickerItem[] = [];
	export let value = '';
	export let placeholder = '';
	export let searchPlaceholder = '';
	export let emptyLabel = 'No matches found.';
	export let disabled = false;
	export let error = false;
	export let ariaLabel = 'Option picker';
	export let theme: 'game' | 'guild' = 'game';

	let open = false;
	let query = '';
	let failedIconUrls = new Set<string>();

	function getSelectedItem() {
		return items.find((item) => item.value === value) ?? null;
	}

	function getIconCandidates(item: IconOptionPickerItem | null) {
		if (!item) {
			return [];
		}

		if (theme === 'guild') {
			return typeof item.iconUrl === 'string' && item.iconUrl.trim() ? [item.iconUrl.trim()] : [];
		}

		return getGameIconCandidates(item);
	}

	function getIconUrl(item: IconOptionPickerItem | null) {
		for (const candidate of getIconCandidates(item)) {
			if (!failedIconUrls.has(candidate)) {
				return candidate;
			}
		}

		return null;
	}

	function markIconFailed(url: string | null) {
		if (!url) {
			return;
		}

		failedIconUrls = new Set([...failedIconUrls, url]);
	}

	function selectItem(nextValue: string) {
		if (!items.some((item) => item.value === nextValue)) {
			return;
		}

		open = false;
		query = '';
		dispatch('change', { value: nextValue });
	}

	function toggleOpen() {
		if (disabled) {
			return;
		}

		open = !open;
		if (!open) {
			query = '';
		}
	}

	function handleInput(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}

		query = target.value;
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open) {
			return;
		}

		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (!target.closest(`[data-icon-option-picker-root="${instanceId}"]`)) {
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

	$: selectedItem = getSelectedItem();
	$: normalizedQuery = query.trim().toLocaleLowerCase();
	$: filteredItems = normalizedQuery
		? items.filter((item) => [item.label, item.metaLabel ?? '', item.value].some((candidate) => candidate.toLocaleLowerCase().includes(normalizedQuery)))
		: items;
</script>

<svelte:document on:click={handleDocumentClick} on:keydown={handleDocumentKeydown} />

<div
	class="icon-option-picker"
	class:theme-game={theme === 'game'}
	class:theme-guild={theme === 'guild'}
	data-icon-option-picker-root={instanceId}
>
	<button
		type="button"
		class:error
		class="icon-option-picker-trigger"
		aria-label={ariaLabel}
		aria-expanded={open ? 'true' : 'false'}
		disabled={disabled}
		on:click={toggleOpen}
	>
		<span class="icon-option-picker-trigger-value">
			<span class="icon-option-picker-icon-slot" aria-hidden="true">
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
					<span class="icon-option-picker-icon-blank"></span>
				{/if}
			</span>
			<span class="icon-option-picker-copy">
				<span class="icon-option-picker-label" class:is-placeholder={!selectedItem}>
					{selectedItem?.label ?? placeholder}
				</span>
				{#if selectedItem?.metaLabel}
					<small>{selectedItem.metaLabel}</small>
				{/if}
			</span>
		</span>
		<span class="icon-option-picker-chevron" aria-hidden="true">▾</span>
	</button>

	{#if open}
		<div class="icon-option-picker-menu" role="listbox" aria-label={ariaLabel}>
			<input
				class="icon-option-picker-search"
				type="search"
				autocomplete="off"
				bind:value={query}
				placeholder={searchPlaceholder || placeholder}
				aria-label={ariaLabel}
				on:input={handleInput}
			/>
			{#if filteredItems.length > 0}
				{#each filteredItems as item}
					<button
						type="button"
						role="option"
						class:active={item.value === value}
						class="icon-option-picker-option"
						aria-selected={item.value === value ? 'true' : 'false'}
						on:click={() => selectItem(item.value)}
					>
						<span class="icon-option-picker-icon-slot" aria-hidden="true">
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
								<span class="icon-option-picker-icon-blank"></span>
							{/if}
						</span>
						<span class="icon-option-picker-copy">
							<span class="icon-option-picker-label">{item.label}</span>
							{#if item.metaLabel}
								<small>{item.metaLabel}</small>
							{/if}
						</span>
					</button>
				{/each}
			{:else}
				<p class="icon-option-picker-empty">{emptyLabel}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.icon-option-picker {
		position: relative;
		width: 100%;
	}

	.icon-option-picker-trigger,
	.icon-option-picker-search,
	.icon-option-picker-option {
		font: inherit;
	}

	.icon-option-picker-trigger {
		width: 100%;
		min-height: 52px;
		padding: 0 16px;
		border-radius: 18px;
		border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
		text-align: left;
	}

	.icon-option-picker-trigger.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.icon-option-picker-trigger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.icon-option-picker-trigger-value,
	.icon-option-picker-option {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.icon-option-picker-icon-slot {
		width: 1.45rem;
		height: 1.45rem;
		flex: 0 0 1.45rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.icon-option-picker-icon-slot img,
	.icon-option-picker-icon-blank {
		width: 1.45rem;
		height: 1.45rem;
		border-radius: 0.45rem;
		object-fit: cover;
		display: block;
	}

	.icon-option-picker-icon-blank {
		background: color-mix(in srgb, var(--line) 68%, transparent);
	}

	.icon-option-picker-copy {
		min-width: 0;
		display: grid;
		gap: 3px;
	}

	.icon-option-picker-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 700;
	}

	.icon-option-picker-label.is-placeholder,
	.icon-option-picker-copy small,
	.icon-option-picker-chevron,
	.icon-option-picker-empty {
		color: var(--text-soft);
	}

	.icon-option-picker-copy small {
		font-size: 0.78rem;
		line-height: 1.3;
	}

	.icon-option-picker-menu {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		padding: 10px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 20px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 6px;
		z-index: 40;
		max-height: min(340px, calc(100vh - 180px));
		overflow: auto;
	}

	.icon-option-picker-search {
		width: 100%;
		min-height: 44px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
	}

	.icon-option-picker-option {
		width: 100%;
		min-height: 46px;
		padding: 0 12px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-main);
		cursor: pointer;
		text-align: left;
	}

	.icon-option-picker-option:hover {
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
	}

	.icon-option-picker-option.active {
		background: color-mix(in srgb, var(--ledger-accent) 14%, var(--surface-strong));
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	.icon-option-picker-empty {
		margin: 0;
		padding: 12px 10px;
		line-height: 1.6;
	}

	.icon-option-picker.theme-game .icon-option-picker-trigger {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white), color-mix(in srgb, var(--surface-strong) 88%, white));
	}

	.icon-option-picker.theme-guild .icon-option-picker-trigger {
		border-color: color-mix(in srgb, #2563eb 20%, var(--line));
		background:
			linear-gradient(180deg, color-mix(in srgb, #dbeafe 58%, white), color-mix(in srgb, var(--surface-strong) 90%, white));
	}

	.icon-option-picker.theme-guild .icon-option-picker-option.active {
		background: color-mix(in srgb, #bfdbfe 65%, white);
		color: color-mix(in srgb, #1d4ed8 76%, var(--text-main));
	}

	@media (max-width: 720px) {
		.icon-option-picker-menu {
			max-height: min(280px, calc(100vh - 220px));
		}
	}
</style>
