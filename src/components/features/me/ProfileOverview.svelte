<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		refreshAuthSession,
		subscribeAuthSession,
		updateAuthenticatedSessionUserDisplayName,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		displayNameLabel: string;
		emailLabel: string;
		statusLabel: string;
		staffLabel: string;
		yesLabel: string;
		noLabel: string;
		editLabel: string;
		myOrganizationsLabel: string;
		editDialogTitle: string;
		editDialogBody: string;
		editInputLabel: string;
		editSubmitLabel: string;
		editCancelLabel: string;
		editPlaceholder: string;
		editRequiredError: string;
		editLengthError: string;
		editPatternError: string;
		pendingTitle: string;
		pendingBody: string;
		errorTitle: string;
		errorTimeoutBody: string;
		retryLabel: string;
		successTitle: string;
		successBody: string;
		confirmLabel: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
		loadingLabel: string;
	}

	const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}\s._-]+$/u;
	const UPDATE_TIMEOUT_MS = 12000;

	export let lang: string;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;
	let editDialogOpen = false;
	let displayNameDraft = '';
	let displayNameError = '';
	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; onClick?: () => void } | null = null;

	const syncDraft = () => {
		if (isAuthenticatedSession(session)) {
			displayNameDraft = session.user.displayName ?? '';
		}
	};

	const validateDisplayName = () => {
		const trimmed = displayNameDraft.trim();
		if (!trimmed) {
			displayNameError = labels.editRequiredError;
			return null;
		}

		if (trimmed.length > 50) {
			displayNameError = labels.editLengthError;
			return null;
		}

		if (!DISPLAY_NAME_PATTERN.test(trimmed)) {
			displayNameError = labels.editPatternError;
			return null;
		}

		displayNameError = '';
		return trimmed;
	};

	const openPendingDialog = () => {
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.pendingTitle;
		dialogMessage = labels.pendingBody;
		dialogPrimaryAction = null;
	};

	const openErrorDialog = (message: string) => {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.errorTitle;
		dialogMessage = message;
		dialogPrimaryAction = {
			label: labels.retryLabel,
			onClick: () => {
				dialogOpen = false;
				editDialogOpen = true;
			},
		};
	};

	const openSuccessDialog = () => {
		dialogOpen = true;
		dialogState = 'success';
		dialogTitle = labels.successTitle;
		dialogMessage = labels.successBody;
		dialogPrimaryAction = {
			label: labels.confirmLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
	};

	const submitDisplayName = async () => {
		const nextDisplayName = validateDisplayName();
		if (!nextDisplayName || !isAuthenticatedSession(session)) {
			return;
		}

		editDialogOpen = false;
		openPendingDialog();

		let timedOut = false;
		const timeoutId = window.setTimeout(() => {
			timedOut = true;
			openErrorDialog(labels.errorTimeoutBody);
		}, UPDATE_TIMEOUT_MS);

		try {
			const response = await getApiAdapter().updateDisplayName({ displayName: nextDisplayName });
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			updateAuthenticatedSessionUserDisplayName(response.user.displayName);
			await refreshAuthSession();
			openSuccessDialog();
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			openErrorDialog(getErrorMessage(error, labels.errorTitle));
		}
	};

	onMount(() => {
		void (async () => {
			session = await ensureAuthSession();
			syncDraft();
			loading = false;
		})();

		const unsubscribe = subscribeAuthSession((nextSession) => {
			session = nextSession;
			syncDraft();
		});

		return unsubscribe;
	});
</script>

{#if loading}
	<AccessNoticeCard eyebrow={labels.eyebrow} title={labels.title} body={labels.loadingLabel} />
{:else if !isAuthenticatedSession(session)}
	<AccessNoticeCard
		eyebrow={labels.eyebrow}
		title={labels.authRequiredTitle}
		body={labels.authRequiredBody}
		primaryAction={{ label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' }}
		secondaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' }}
	/>
{:else}
	<section class="me-profile">
		<div class="me-profile-card">
			<p class="me-profile-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p class="me-profile-intro">{labels.intro}</p>

			<dl class="me-profile-grid">
				<div class="me-profile-item me-profile-item-display-name">
					<dt>{labels.displayNameLabel}</dt>
					<dd>
						<span>{session.user.displayName || '—'}</span>
						<button
							type="button"
							class="me-profile-edit"
							aria-label={labels.editLabel}
							on:click={() => {
								displayNameError = '';
								editDialogOpen = true;
							}}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 20h4l10-10-4-4L4 16v4Z" fill="currentColor"></path>
								<path d="m13 5 4 4" stroke="currentColor" stroke-width="1.5" fill="none"></path>
							</svg>
						</button>
					</dd>
				</div>
				<div class="me-profile-item">
					<dt>{labels.emailLabel}</dt>
					<dd>{session.user.email}</dd>
				</div>
				<div class="me-profile-item">
					<dt>{labels.statusLabel}</dt>
					<dd>{session.user.status}</dd>
				</div>
				<div class="me-profile-item">
					<dt>{labels.staffLabel}</dt>
					<dd>{session.user.isStaff ? labels.yesLabel : labels.noLabel}</dd>
				</div>
			</dl>

			<a class="me-profile-orgs-link" href={`/${lang}/me/orgs`}>
				<span>{labels.myOrganizationsLabel}</span>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M8 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path>
				</svg>
			</a>
		</div>

		{#if editDialogOpen}
			<div class="me-edit-backdrop" role="presentation">
				<section class="me-edit-dialog" role="dialog" aria-modal="true">
					<div class="me-edit-card">
						<h2>{labels.editDialogTitle}</h2>
						<p>{labels.editDialogBody}</p>
						<label class="me-edit-field">
							<span>{labels.editInputLabel}</span>
							<input class:error={Boolean(displayNameError)} bind:value={displayNameDraft} type="text" maxlength="50" placeholder={labels.editPlaceholder} />
							{#if displayNameError}<em>{displayNameError}</em>{/if}
						</label>
						<div class="me-edit-actions">
							<button type="button" class="me-edit-button me-edit-button-secondary" on:click={() => (editDialogOpen = false)}>
								{labels.editCancelLabel}
							</button>
							<button type="button" class="me-edit-button me-edit-button-primary" on:click={() => void submitDisplayName()}>
								{labels.editSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		<RequestStatusDialog
			open={dialogOpen}
			state={dialogState}
			title={dialogTitle}
			message={dialogMessage}
			primaryAction={dialogPrimaryAction}
			onClose={() => {
				dialogOpen = false;
			}}
		/>
	</section>
{/if}

<style>
	.me-profile {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
	}

	.me-profile-card {
		padding: 30px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.me-profile-eyebrow,
	.me-profile-item dt {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.me-profile-card h1 {
		margin: 12px 0 0;
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.03em;
	}

	.me-profile-intro,
	.me-profile-item dd {
		margin: 16px 0 0;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.me-profile-grid {
		margin: 28px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.me-profile-item {
		padding: 18px;
		border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 74%, white);
	}

	.me-profile-item dd {
		margin: 10px 0 0;
		font-size: 1.02rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.me-profile-item-display-name dd {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.me-profile-edit {
		width: 38px;
		height: 38px;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			border-color 0.18s ease;
	}

	.me-profile-edit:hover {
		transform: translateY(-1px);
		border-color: var(--line-strong);
	}

	.me-profile-edit svg {
		width: 16px;
		height: 16px;
	}

	.me-profile-orgs-link {
		margin-top: 26px;
		min-height: 52px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-weight: 700;
	}

	.me-profile-orgs-link svg {
		width: 16px;
		height: 16px;
	}

	.me-edit-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.me-edit-dialog {
		width: min(520px, 100%);
	}

	.me-edit-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 26px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 14px;
	}

	.me-edit-card h2,
	.me-edit-card p {
		margin: 0;
	}

	.me-edit-card p {
		line-height: 1.7;
		color: var(--text-soft);
	}

	.me-edit-field {
		display: grid;
		gap: 8px;
	}

	.me-edit-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.me-edit-field input {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.me-edit-field input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.me-edit-field em {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.me-edit-actions {
		margin-top: 8px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.me-edit-button {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.me-edit-button-primary {
		border: 1px solid transparent;
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.me-edit-button-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
		color: var(--text-main);
	}

	@media (max-width: 720px) {
		.me-profile-card,
		.me-edit-card {
			padding: 22px;
			border-radius: 22px;
		}

		.me-profile-grid {
			grid-template-columns: 1fr;
		}

		.me-profile-orgs-link {
			width: 100%;
			justify-content: center;
		}

		.me-edit-actions {
			flex-direction: column-reverse;
		}
	}
</style>
