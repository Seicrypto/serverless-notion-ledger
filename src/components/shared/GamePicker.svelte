<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { getGameIconCandidates } from '../../libs/games/display.ts';

	export interface GamePickerItem {
		value: string;
		label: string;
		resolvedIconUrl?: string | null;
		iconUrl?: string | null;
		officialSiteUrl?: string | null;
		metaLabel?: string | null;
	}

	interface ActionConfig {
		label: string;
		onClick: () => void;
	}

	const dispatch = createEventDispatcher<{ change: { value: string } }>();
	const instanceId = `game-picker-${Math.random().toString(36).slice(2, 10)}`;

	export let items: GamePickerItem[] = [];
	export let value = '';
	export let placeholder = '';
	export let disabled = false;
	export let error = false;
	export let variant: 'dropdown' | 'inline' = 'dropdown';
	export let ariaLabel = 'Game picker';
	export let action: ActionConfig | null = null;

	let open = false;
	let failedIconUrls = new Set<string>();

	function getIconUrl(item: GamePickerItem | null) {
		if (!item) {
			return null;
		}

		for (const candidate of getGameIconCandidates(item)) {
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
		open = false;
		dispatch('change', { value: nextValue });
	}

	function toggleOpen() {
		if (disabled || variant !== 'dropdown') {
			return;
		}

		open = !open;
	}

	function handleDocumentClick(event: MouseEvent) {
		if (!open) {
			return;
		}

		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (!target.closest(`[data-game-picker-root="${instanceId}"]`)) {
			open = false;
		}
	}

	function handleDocumentKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
		}
	}

	$: selectedItem = items.find((item) => item.value === value) ?? null;
</script>

<svelte:document on:click={handleDocumentClick} on:keydown={handleDocumentKeydown} />

<div
	class="game-picker"
	class:game-picker-dropdown={variant === 'dropdown'}
	class:game-picker-inline={variant === 'inline'}
	data-game-picker-root={instanceId}
>
	{#if variant === 'dropdown'}
		<button
			type="button"
			class:error
			class="game-picker-trigger"
			aria-label={ariaLabel}
			aria-expanded={open ? 'true' : 'false'}
			disabled={disabled}
			on:click={toggleOpen}
		>
			<span class="game-picker-trigger-value">
				<span class="game-picker-icon-slot" aria-hidden="true">
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
						<span class="game-picker-icon-blank"></span>
					{/if}
				</span>
				<span class="game-picker-label" class:is-placeholder={!selectedItem}>
					{selectedItem?.label ?? placeholder}
				</span>
			</span>
			<span class="game-picker-chevron" aria-hidden="true">▾</span>
		</button>

		{#if open}
			<div class="game-picker-menu" role="listbox" aria-label={ariaLabel}>
				{#each items as item}
					<button
						type="button"
						role="option"
						class:active={item.value === value}
						class="game-picker-option"
						aria-selected={item.value === value ? 'true' : 'false'}
						on:click={() => selectItem(item.value)}
					>
						<span class="game-picker-icon-slot" aria-hidden="true">
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
								<span class="game-picker-icon-blank"></span>
							{/if}
						</span>
						<span class="game-picker-option-copy">
							<span class="game-picker-label">{item.label}</span>
							{#if item.metaLabel}
								<strong>{item.metaLabel}</strong>
							{/if}
						</span>
					</button>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="game-picker-inline-list" role="tablist" aria-label={ariaLabel}>
			{#each items as item}
				<button
					type="button"
					role="tab"
					class:active={item.value === value}
					class="game-picker-inline-option"
					aria-selected={item.value === value ? 'true' : 'false'}
					disabled={disabled}
					on:click={() => selectItem(item.value)}
				>
					<span class="game-picker-icon-slot" aria-hidden="true">
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
							<span class="game-picker-icon-blank"></span>
						{/if}
					</span>
					<span class="game-picker-option-copy">
						<span class="game-picker-label">{item.label}</span>
						{#if item.metaLabel}
							<strong>{item.metaLabel}</strong>
						{/if}
					</span>
				</button>
			{/each}

			{#if action}
				<button type="button" class="game-picker-inline-action" on:click={action.onClick}>
					<span class="game-picker-inline-action-icon" aria-hidden="true">+</span>
					{action.label}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.game-picker {
		position: relative;
		width: 100%;
	}

	.game-picker-trigger,
	.game-picker-option,
	.game-picker-inline-option,
	.game-picker-inline-action {
		font: inherit;
	}

	.game-picker-trigger {
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
		cursor: pointer;
		text-align: left;
	}

	.game-picker-trigger.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.game-picker-trigger:disabled,
	.game-picker-inline-option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.game-picker-trigger-value,
	.game-picker-option,
	.game-picker-inline-option {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	.game-picker-trigger-value {
		min-width: 0;
	}

	.game-picker-icon-slot {
		width: 1.1em;
		height: 1.1em;
		flex: 0 0 1.1em;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.game-picker-icon-slot img,
	.game-picker-icon-blank {
		width: 1.1em;
		height: 1.1em;
		border-radius: 0.28em;
		object-fit: contain;
		display: block;
	}

	.game-picker-icon-blank {
		background: transparent;
	}

	.game-picker-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.game-picker-label.is-placeholder {
		color: var(--text-soft);
	}

	.game-picker-chevron {
		color: var(--text-soft);
		font-size: 0.9rem;
	}

	.game-picker-menu {
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
		max-height: 280px;
		overflow: auto;
	}

	.game-picker-option,
	.game-picker-inline-option,
	.game-picker-inline-action {
		min-height: 42px;
		padding: 0 12px;
		border-radius: 14px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-main);
		cursor: pointer;
		text-align: left;
	}

	.game-picker-option:hover,
	.game-picker-inline-option:hover,
	.game-picker-inline-action:hover {
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
	}

	.game-picker-option.active {
		background: color-mix(in srgb, var(--ledger-accent) 14%, var(--surface-strong));
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	.game-picker-option-copy,
	.game-picker-inline-option .game-picker-option-copy {
		min-width: 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.game-picker-option-copy strong {
		padding: 4px 8px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--ledger-accent) 14%, var(--surface-soft));
		color: color-mix(in srgb, var(--ledger-accent-deep) 86%, var(--text-main));
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.game-picker-inline-list {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.game-picker-inline-option,
	.game-picker-inline-action {
		border: 1px solid color-mix(in srgb, var(--line) 88%, white);
		background: color-mix(in srgb, var(--surface) 86%, white);
	}

	.game-picker-inline-option.active {
		border-color: color-mix(in srgb, var(--ledger-accent) 34%, var(--line));
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--ledger-accent) 22%, white),
			color-mix(in srgb, var(--ledger-accent) 10%, var(--surface))
		);
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	.game-picker-inline-action-icon {
		font-size: 1rem;
		line-height: 1;
	}
</style>
