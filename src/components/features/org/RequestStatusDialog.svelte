<script lang="ts">
	import SoftSpinner from '../../shared/SoftSpinner.svelte';

	type DialogState = 'pending' | 'success' | 'error';

	interface DialogAction {
		label: string;
		href?: string;
		variant?: 'primary' | 'secondary';
		onClick?: () => void;
	}

	export let open = false;
	export let state: DialogState = 'pending';
	export let title = '';
	export let message = '';
	export let primaryAction: DialogAction | null = null;
	export let secondaryAction: DialogAction | null = null;
	export let onClose: (() => void) | null = null;

	const handleAction = (action: DialogAction | null) => {
		if (!action) {
			return;
		}

		action.onClick?.();
	};
</script>

{#if open}
	<div class="status-dialog-backdrop" role="presentation">
		<section class="status-dialog" role="dialog" aria-modal="true" aria-live="polite">
			<div class="status-dialog-card" data-state={state}>
				{#if state === 'pending'}
					<SoftSpinner size={42} label={title || 'Loading'} />
				{/if}

				<h2>{title}</h2>
				<p>{message}</p>

				{#if state !== 'pending' && (secondaryAction || primaryAction)}
					<div class="status-dialog-actions">
						{#if secondaryAction}
							{#if secondaryAction.href}
								<a
									class:status-dialog-button={true}
									class:status-dialog-button-primary={secondaryAction.variant === 'primary'}
									class:status-dialog-button-secondary={secondaryAction.variant !== 'primary'}
									href={secondaryAction.href}
									on:click={() => handleAction(secondaryAction)}
								>
									{secondaryAction.label}
								</a>
							{:else}
								<button
									type="button"
									class="status-dialog-button status-dialog-button-secondary"
									on:click={() => handleAction(secondaryAction)}
								>
									{secondaryAction.label}
								</button>
							{/if}
						{/if}

						{#if primaryAction}
							{#if primaryAction.href}
								<a
									class:status-dialog-button={true}
									class:status-dialog-button-primary={true}
									class:status-dialog-button-secondary={false}
									href={primaryAction.href}
									on:click={() => handleAction(primaryAction)}
								>
									{primaryAction.label}
								</a>
							{:else}
								<button
									type="button"
									class="status-dialog-button status-dialog-button-primary"
									on:click={() => handleAction(primaryAction)}
								>
									{primaryAction.label}
								</button>
							{/if}
						{/if}
					</div>
				{:else if state !== 'pending' && onClose}
					<div class="status-dialog-actions">
						<button type="button" class="status-dialog-button status-dialog-button-secondary" on:click={onClose}>
							Close
						</button>
					</div>
				{/if}
			</div>
		</section>
	</div>
{/if}

<style>
	.status-dialog-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.status-dialog {
		width: min(540px, 100%);
	}

	.status-dialog-card {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 16px;
	}

	.status-dialog-card h2,
	.status-dialog-card p {
		margin: 0;
	}

	.status-dialog-card h2 {
		font-size: 1.35rem;
		letter-spacing: -0.03em;
	}

	.status-dialog-card p {
		line-height: 1.7;
		color: var(--text-soft);
	}

	.status-dialog-actions {
		margin-top: 8px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.status-dialog-button {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.status-dialog-button:hover {
		transform: translateY(-1px);
	}

	.status-dialog-button-primary {
		border: 1px solid transparent;
		background: var(--accent);
		color: white;
	}

	.status-dialog-button-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
	}

	@media (max-width: 720px) {
		.status-dialog-card {
			padding: 22px;
			border-radius: 22px;
		}

		.status-dialog-actions {
			flex-direction: column-reverse;
		}

		.status-dialog-button {
			width: 100%;
		}
	}
</style>
