<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, subscribeAuthSession, type AuthSession } from '../../../libs/api/auth/session.ts';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		mockNotice: string;
		nameLabel: string;
		emailLabel: string;
		approveLabel: string;
		backLabel: string;
		loadingLabel: string;
		loginRequiredTitle: string;
		loginRequiredBody: string;
		staffOnlyTitle: string;
		staffOnlyBody: string;
		loginLabel: string;
		homeLabel: string;
		pendingTitle: string;
		pendingBody: string;
		successTitle: string;
		successBody: string;
		errorTitle: string;
		errorBody: string;
		confirmLabel: string;
		emptyTitle: string;
	}

	interface PendingUserRow {
		id: number;
		displayName: string;
		email: string;
	}

	const sampleUsers: PendingUserRow[] = [
		{ id: 901, displayName: 'Mika Chen', email: 'mika.chen@example.com' },
		{ id: 902, displayName: 'Aoi Tanaka', email: 'aoi.tanaka@example.com' },
	];

	export let lang: string;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;
	let users = [...sampleUsers];
	let activeUserId: number | null = null;
	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogMessage = '';

	const openDialog = (state: 'pending' | 'success' | 'error', message: string) => {
		dialogOpen = true;
		dialogState = state;
		dialogMessage = message;
	};

	const approveUser = async (user: PendingUserRow) => {
		activeUserId = user.id;
		openDialog('pending', labels.pendingBody);

		try {
			await getApiAdapter().approveUser(user.id);
			users = users.filter((entry) => entry.id !== user.id);
			openDialog('success', labels.successBody);
		} catch (error) {
			openDialog('error', getErrorMessage(error, labels.errorBody));
		} finally {
			activeUserId = null;
		}
	};

	onMount(() => {
		void (async () => {
			session = await ensureAuthSession();
			loading = false;
		})();

		const unsubscribe = subscribeAuthSession((nextSession) => {
			session = nextSession;
			loading = false;
		});

		return unsubscribe;
	});
</script>

{#if loading}
	<AccessNoticeCard eyebrow={labels.eyebrow} title={labels.title} body={labels.loadingLabel} />
{:else if !isAuthenticatedSession(session)}
	<AccessNoticeCard
		eyebrow={labels.eyebrow}
		title={labels.loginRequiredTitle}
		body={labels.loginRequiredBody}
		primaryAction={{ label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' }}
		secondaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' }}
	/>
{:else if !session.user.isStaff}
	<AccessNoticeCard
		eyebrow={labels.eyebrow}
		title={labels.staffOnlyTitle}
		body={labels.staffOnlyBody}
		primaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'primary' }}
	/>
{:else}
	<section class="pending-users">
		<div class="pending-users-head">
			<p class="pending-users-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
			<p class="pending-users-note">{labels.mockNotice}</p>
			<a class="pending-users-back" href={`/${lang}/official`}>{labels.backLabel}</a>
		</div>

		{#if users.length === 0}
			<AccessNoticeCard title={labels.emptyTitle} body={labels.successBody} />
		{:else}
			<div class="pending-users-list">
				{#each users as user}
					<article class="pending-user-row">
						<div class="pending-user-copy">
							<h2>{user.displayName}</h2>
							<p><strong>{labels.emailLabel}:</strong> {user.email}</p>
							<p><strong>{labels.nameLabel}:</strong> {user.displayName}</p>
						</div>
						<button
							type="button"
							class="pending-user-approve"
							disabled={activeUserId === user.id}
							on:click={() => void approveUser(user)}
						>
							{activeUserId === user.id ? labels.pendingTitle : labels.approveLabel}
						</button>
					</article>
				{/each}
			</div>
		{/if}

		<RequestStatusDialog
			open={dialogOpen}
			state={dialogState}
			title={dialogState === 'pending' ? labels.pendingTitle : dialogState === 'success' ? labels.successTitle : labels.errorTitle}
			message={dialogMessage}
			primaryAction={
				dialogState === 'pending'
					? null
					: {
							label: labels.confirmLabel,
							onClick: () => {
								dialogOpen = false;
							},
						}
			}
			onClose={() => {
				if (dialogState !== 'pending') {
					dialogOpen = false;
				}
			}}
		/>
	</section>
{/if}

<style>
	.pending-users {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.pending-users-head,
	.pending-user-row {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.pending-users-eyebrow,
	.pending-users-note {
		margin: 0;
	}

	.pending-users-eyebrow {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.pending-users-head h1,
	.pending-users-head p,
	.pending-user-row h2,
	.pending-user-row p {
		margin: 0;
	}

	.pending-users-head h1,
	.pending-user-row h2 {
		margin-top: 12px;
	}

	.pending-users-head p,
	.pending-user-row p {
		margin-top: 12px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.pending-users-note {
		padding: 14px 16px;
		border-radius: 16px;
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
	}

	.pending-users-back {
		margin-top: 18px;
		min-height: 44px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1px solid var(--line);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.pending-users-list {
		display: grid;
		gap: 16px;
	}

	.pending-user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
	}

	.pending-user-copy {
		min-width: 0;
	}

	.pending-user-copy strong {
		color: var(--text-main);
	}

	.pending-user-approve {
		min-width: 148px;
		min-height: 46px;
		padding: 0 18px;
		border: 1px solid transparent;
		border-radius: 999px;
		background: var(--text-main);
		color: var(--surface-strong);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.pending-user-approve:disabled {
		opacity: 0.7;
		cursor: wait;
	}

	@media (max-width: 720px) {
		.pending-users-head,
		.pending-user-row {
			padding: 22px;
			border-radius: 22px;
		}

		.pending-user-row {
			flex-direction: column;
			align-items: stretch;
		}

		.pending-user-approve {
			width: 100%;
		}
	}
</style>
