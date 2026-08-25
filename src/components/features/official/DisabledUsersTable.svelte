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
		searchFieldLabel: string;
		searchInputLabel: string;
		searchPlaceholderDisplayName: string;
		searchPlaceholderEmail: string;
		searchDisplayNameOption: string;
		searchEmailOption: string;
		searchSubmitLabel: string;
		searchClearLabel: string;
		searchValidationEmail: string;
		tableActionLabel: string;
	}

	interface ManagedUserRow {
		id: number;
		displayName: string;
		email: string;
	}

	type SearchField = 'displayName' | 'email';

	const DEFAULT_LIMIT = 10;
	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	export let lang: string;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;
	let users: ManagedUserRow[] = [];
	let activeUserId: number | null = null;
	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogMessage = '';
	let searchField: SearchField = 'displayName';
	let searchQuery = '';
	let searchError = '';

	const openDialog = (state: 'pending' | 'success' | 'error', message: string) => {
		dialogOpen = true;
		dialogState = state;
		dialogMessage = message;
	};

	const normalizeUsers = (input: Array<Record<string, unknown>>) =>
		input.map((user) => ({
			id: Number(user.id),
			displayName:
				typeof user.displayName === 'string' && user.displayName.trim()
					? user.displayName
					: '—',
			email: typeof user.email === 'string' ? user.email : '',
		}));

	const buildSearchQuery = () => {
		const trimmed = searchQuery.trim();
		searchError = '';

		if (!trimmed) {
			return { limit: DEFAULT_LIMIT, offset: 0 };
		}

		if (searchField === 'email') {
			if (!EMAIL_PATTERN.test(trimmed)) {
				searchError = labels.searchValidationEmail;
				return null;
			}

			return { email: trimmed, limit: DEFAULT_LIMIT, offset: 0 };
		}

		return { displayName: trimmed, limit: DEFAULT_LIMIT, offset: 0 };
	};

	const loadUsers = async () => {
		if (!isAuthenticatedSession(session) || !session.user.isStaff) {
			loading = false;
			users = [];
			return;
		}

		const query = buildSearchQuery();
		if (!query) {
			loading = false;
			users = [];
			return;
		}

		loading = true;

		try {
			const response = await getApiAdapter().listDisabledUsers(query);
			users = normalizeUsers(response.users as Array<Record<string, unknown>>);
		} catch (error) {
			users = [];
			openDialog('error', getErrorMessage(error, labels.errorBody));
		} finally {
			loading = false;
		}
	};

	const approveUser = async (user: ManagedUserRow) => {
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

	const submitSearch = async () => {
		await loadUsers();
	};

	const clearSearch = async () => {
		searchQuery = '';
		searchField = 'displayName';
		searchError = '';
		await loadUsers();
	};

	onMount(() => {
		void (async () => {
			session = await ensureAuthSession();
			await loadUsers();
		})();

		const unsubscribe = subscribeAuthSession((nextSession) => {
			session = nextSession;
			void loadUsers();
		});

		return unsubscribe;
	});
</script>

{#if loading && !isAuthenticatedSession(session)}
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
	<section class="disabled-users">
		<div class="disabled-users-head">
			<p class="disabled-users-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
			<a class="disabled-users-back" href={`/${lang}/official`}>{labels.backLabel}</a>
		</div>

		<form
			class="disabled-users-search"
			on:submit|preventDefault={() => {
				void submitSearch();
			}}
		>
			<div class="disabled-users-search-grid">
				<label class="disabled-users-field">
					<span>{labels.searchFieldLabel}</span>
					<select bind:value={searchField}>
						<option value="displayName">{labels.searchDisplayNameOption}</option>
						<option value="email">{labels.searchEmailOption}</option>
					</select>
				</label>

				<label class="disabled-users-field disabled-users-field-query">
					<span>{labels.searchInputLabel}</span>
					<input
						class:error={Boolean(searchError)}
						type={searchField === 'email' ? 'email' : 'search'}
						bind:value={searchQuery}
						placeholder={searchField === 'email'
							? labels.searchPlaceholderEmail
							: labels.searchPlaceholderDisplayName}
					/>
					{#if searchError}<em>{searchError}</em>{/if}
				</label>
			</div>

			<div class="disabled-users-search-actions">
				<button type="submit" class="disabled-users-submit" disabled={loading}>
					{labels.searchSubmitLabel}
				</button>
				<button
					type="button"
					class="disabled-users-clear"
					disabled={loading && !searchQuery}
					on:click={() => void clearSearch()}
				>
					{labels.searchClearLabel}
				</button>
			</div>
		</form>

		<div class="disabled-users-table-shell">
			{#if loading}
				<p class="disabled-users-loading">{labels.loadingLabel}</p>
			{:else if users.length === 0}
				<p class="disabled-users-empty">{labels.emptyTitle}</p>
			{:else}
				<table class="disabled-users-table">
					<thead>
						<tr>
							<th>{labels.nameLabel}</th>
							<th>{labels.emailLabel}</th>
							<th>{labels.tableActionLabel}</th>
						</tr>
					</thead>
					<tbody>
						{#each users as user}
							<tr>
								<td>{user.displayName}</td>
								<td>{user.email}</td>
								<td class="disabled-users-table-action">
									<button
										type="button"
										class="disabled-users-approve"
										disabled={activeUserId === user.id}
										on:click={() => void approveUser(user)}
									>
										{activeUserId === user.id ? labels.pendingTitle : labels.approveLabel}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

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
	.disabled-users {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.disabled-users-head,
	.disabled-users-search,
	.disabled-users-table-shell {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.disabled-users-eyebrow {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.disabled-users-head h1,
	.disabled-users-head p,
	.disabled-users-loading,
	.disabled-users-empty {
		margin: 0;
	}

	.disabled-users-head h1 {
		margin-top: 12px;
	}

	.disabled-users-head p,
	.disabled-users-loading,
	.disabled-users-empty {
		margin-top: 12px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.disabled-users-back {
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

	.disabled-users-search {
		display: grid;
		gap: 16px;
	}

	.disabled-users-search-grid {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		gap: 14px;
	}

	.disabled-users-field {
		display: grid;
		gap: 8px;
	}

	.disabled-users-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.disabled-users-field select,
	.disabled-users-field input {
		width: 100%;
		min-height: 46px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.disabled-users-field input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.disabled-users-field em {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.disabled-users-search-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.disabled-users-submit,
	.disabled-users-clear,
	.disabled-users-approve {
		min-height: 42px;
		padding: 0 16px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.disabled-users-submit,
	.disabled-users-approve {
		border: 1px solid transparent;
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.disabled-users-clear {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
		color: var(--text-main);
	}

	.disabled-users-approve {
		min-height: 34px;
		padding: 0 12px;
		font-size: 0.92rem;
	}

	.disabled-users-approve:disabled,
	.disabled-users-submit:disabled,
	.disabled-users-clear:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.disabled-users-table {
		width: 100%;
		border-collapse: collapse;
	}

	.disabled-users-table th,
	.disabled-users-table td {
		padding: 14px 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		text-align: left;
		vertical-align: middle;
	}

	.disabled-users-table th {
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.disabled-users-table td {
		color: var(--text-main);
	}

	.disabled-users-table-action {
		width: 1%;
		white-space: nowrap;
	}

	@media (max-width: 720px) {
		.disabled-users-head,
		.disabled-users-search,
		.disabled-users-table-shell {
			padding: 22px;
			border-radius: 22px;
		}

		.disabled-users-search-grid {
			grid-template-columns: 1fr;
		}

		.disabled-users-table {
			display: block;
			overflow-x: auto;
		}
	}
</style>
