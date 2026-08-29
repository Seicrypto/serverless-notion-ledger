<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import UserInfoCard from '../shared/UserInfoCard.svelte';
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

	interface UserInfoCardItem {
		key: string;
		label: string;
		value: string;
		action?: {
			ariaLabel: string;
			onClick: () => void;
		};
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

	$: profileItems = isAuthenticatedSession(session)
		? ([
				{
					key: 'displayName',
					label: labels.displayNameLabel,
					value: session.user.displayName || '—',
					action: {
						ariaLabel: labels.editLabel,
						onClick: () => {
							displayNameError = '';
							editDialogOpen = true;
						},
					},
				},
				{
					key: 'email',
					label: labels.emailLabel,
					value: session.user.email,
				},
				{
					key: 'status',
					label: labels.statusLabel,
					value: session.user.status,
				},
				{
					key: 'staff',
					label: labels.staffLabel,
					value: session.user.isStaff ? labels.yesLabel : labels.noLabel,
				},
			] satisfies UserInfoCardItem[])
		: [];

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
		<UserInfoCard
			eyebrow={labels.eyebrow}
			title={labels.title}
			intro={labels.intro}
			items={profileItems}
			footerLink={{ href: `/${lang}/me/guilds`, label: labels.myOrganizationsLabel }}
		/>

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
		.me-edit-card {
			padding: 22px;
			border-radius: 22px;
		}

		.me-edit-actions {
			flex-direction: column-reverse;
		}
	}
</style>
