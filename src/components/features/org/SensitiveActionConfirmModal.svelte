<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{ confirm: void; close: void }>();

	export let open = false;
	export let title = '';
	export let body = '';
	export let helperLabel = '';
	export let matchText = '';
	export let cancelLabel = 'Cancel';
	export let confirmLabel = 'Delete';
	export let workingLabel = 'Working';
	export let copyLabel = 'Copy';
	export let validationMessage = '';
	export let submitting = false;

	let confirmationInput = '';
	let copied = false;
	let lastOpen = false;

	$: if (open && !lastOpen) {
		confirmationInput = '';
		copied = false;
	}

	$: lastOpen = open;
	$: normalizedInput = confirmationInput.trim();
	$: canConfirm = normalizedInput === matchText;

	function handleBackdropClick(event: MouseEvent) {
		if (event.currentTarget === event.target && !submitting) {
			dispatch('close');
		}
	}

	async function handleCopy() {
		confirmationInput = matchText;
		copied = true;

		try {
			if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(matchText);
			}
		} catch {
			// Filling the field is the main action; clipboard failure should not block confirmation.
		}
	}
</script>

{#if open}
	<div class="sensitive-modal-backdrop" role="presentation" on:click={handleBackdropClick}>
		<section class="sensitive-modal" role="dialog" aria-modal="true" aria-labelledby="sensitive-action-title">
			<div class="sensitive-modal-card">
				<h2 id="sensitive-action-title">{title}</h2>
				<p>{body}</p>

				<label class="sensitive-field">
					<span>{helperLabel}</span>
					<div class="sensitive-input-row">
						<input
							type="text"
							bind:value={confirmationInput}
							autocomplete="off"
							autocapitalize="off"
							spellcheck="false"
							class:error={Boolean(validationMessage) && !canConfirm}
						/>
						<button
							type="button"
							class="sensitive-copy-button"
							on:click={() => void handleCopy()}
							aria-label={copyLabel}
							title={copyLabel}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path
									d="M9 9.75A2.25 2.25 0 0 1 11.25 7.5h7.5A2.25 2.25 0 0 1 21 9.75v9A2.25 2.25 0 0 1 18.75 21h-7.5A2.25 2.25 0 0 1 9 18.75v-9Z"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<path
									d="M15 7.5V5.25A2.25 2.25 0 0 0 12.75 3h-7.5A2.25 2.25 0 0 0 3 5.25v9a2.25 2.25 0 0 0 2.25 2.25H9"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							</svg>
						</button>
					</div>
					<small class="sensitive-match-text">{matchText}</small>
					{#if copied}
						<small class="sensitive-copy-note">{copyLabel}</small>
					{/if}
					{#if validationMessage && !canConfirm}
						<em>{validationMessage}</em>
					{/if}
				</label>

				<div class="sensitive-modal-actions">
					<button type="button" class="sensitive-modal-secondary" on:click={() => dispatch('close')} disabled={submitting}>
						{cancelLabel}
					</button>
					<button
						type="button"
						class="sensitive-modal-danger"
						on:click={() => dispatch('confirm')}
						disabled={!canConfirm || submitting}
					>
						{submitting ? workingLabel : confirmLabel}
					</button>
				</div>
			</div>
		</section>
	</div>
{/if}

<style>
	.sensitive-modal-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 70;
	}

	.sensitive-modal {
		width: min(560px, 100%);
	}

	.sensitive-modal-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 26px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 14px;
	}

	.sensitive-modal-card h2,
	.sensitive-modal-card p {
		margin: 0;
	}

	.sensitive-modal-card p,
	.sensitive-field span,
	.sensitive-field small {
		line-height: 1.6;
	}

	.sensitive-modal-card p,
	.sensitive-field span,
	.sensitive-copy-note {
		color: var(--text-soft);
	}

	.sensitive-field {
		display: grid;
		gap: 8px;
	}

	.sensitive-field span {
		font-size: 0.9rem;
	}

	.sensitive-input-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 48px;
		gap: 10px;
	}

	.sensitive-input-row input,
	.sensitive-copy-button,
	.sensitive-modal-secondary,
	.sensitive-modal-danger {
		font: inherit;
	}

	.sensitive-input-row input {
		width: 100%;
		min-height: 48px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
	}

	.sensitive-input-row input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.sensitive-copy-button {
		min-height: 48px;
		border-radius: 14px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.sensitive-copy-button svg {
		width: 18px;
		height: 18px;
	}

	.sensitive-match-text {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9rem;
		color: var(--text-main);
	}

	.sensitive-copy-note {
		font-size: 0.82rem;
	}

	.sensitive-field em {
		font-style: normal;
		font-size: 0.9rem;
		color: #c24e4e;
	}

	.sensitive-modal-actions {
		margin-top: 8px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.sensitive-modal-secondary,
	.sensitive-modal-danger {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease,
			opacity 0.18s ease;
	}

	.sensitive-modal-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
	}

	.sensitive-modal-danger {
		border: 1px solid color-mix(in srgb, #dc2626 42%, var(--line));
		background: color-mix(in srgb, #fee2e2 76%, white);
		color: #991b1b;
	}

	.sensitive-modal-secondary:hover:not(:disabled),
	.sensitive-modal-danger:hover:not(:disabled),
	.sensitive-copy-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.sensitive-modal-secondary:disabled,
	.sensitive-modal-danger:disabled {
		cursor: progress;
		opacity: 0.72;
	}

	@media (max-width: 720px) {
		.sensitive-modal-card {
			padding: 22px;
			border-radius: 22px;
		}

		.sensitive-input-row {
			grid-template-columns: minmax(0, 1fr);
		}

		.sensitive-modal-actions {
			flex-direction: column-reverse;
		}

		.sensitive-modal-secondary,
		.sensitive-modal-danger,
		.sensitive-copy-button {
			width: 100%;
		}
	}
</style>
