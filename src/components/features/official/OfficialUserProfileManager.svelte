<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import UserInfoCard from '../shared/UserInfoCard.svelte';
	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		ensureAuthSession,
		getApiErrorCode,
		getErrorMessage,
		isAuthenticatedSession,
		subscribeAuthSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		backLabel: string;
		loadingLabel: string;
		loginRequiredTitle: string;
		loginRequiredBody: string;
		staffOnlyTitle: string;
		staffOnlyBody: string;
		loginLabel: string;
		homeLabel: string;
		searchInputLabel: string;
		searchPlaceholderUser: string;
		searchSubmitLabel: string;
		searchClearLabel: string;
		searchRequiredError: string;
		searchEmptyTitle: string;
		searchEmptyBody: string;
		searchNoResultTitle: string;
		searchNoResultBody: string;
		searchErrorTitle: string;
		searchErrorBody: string;
		resultEyebrow: string;
		nameLabel: string;
		emailLabel: string;
		idLabel: string;
		vanityLabel: string;
		statusLabel: string;
		emailVerifiedLabel: string;
		unsetLabel: string;
		editVanityLabel: string;
		editDialogTitle: string;
		editDialogBody: string;
		editInputLabel: string;
		editSubmitLabel: string;
		editCancelLabel: string;
		editPlaceholder: string;
		editRequiredError: string;
		editLengthError: string;
		editPatternError: string;
		actionPendingTitle: string;
		actionPendingBody: string;
		actionSuccessTitle: string;
		actionSuccessBody: string;
		actionErrorTitle: string;
		actionErrorBody: string;
		confirmLabel: string;
		statusApproveLabel: string;
		statusEnableLabel: string;
		statusDisableLabel: string;
	}

	interface ManagedUserView {
		id: number;
		displayName: string | null;
		email: string;
		emailVerifiedAt: string | null;
		status: 'pending_verification' | 'pending_approval' | 'active' | 'disabled';
		vanity: string | null;
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

	type StatusActionKind = 'approve' | 'enable' | 'disable';

	const VANITY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
	const UPDATE_TIMEOUT_MS = 12000;

	export let lang: string;
	export let labels: Labels;
	export let initialUser = '';

	let session: AuthSession | null = null;
	let loading = true;
	let loadingUser = false;
	let queryDraft = initialUser;
	let queryError = '';
	let resultError = '';
	let hasSearched = Boolean(initialUser.trim());
	let selectedUser: ManagedUserView | null = null;
	let vanityDialogOpen = false;
	let vanityDraft = '';
	let vanityError = '';
	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; onClick?: () => void } | null = null;

	function isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && value !== null;
	}

	function toNullableString(value: unknown) {
		return typeof value === 'string' && value.trim() ? value : null;
	}

	function normalizeManagedUser(input: unknown): ManagedUserView {
		const user = isObject(input) ? input : {};
		const status =
			user.status === 'pending_verification' ||
			user.status === 'pending_approval' ||
			user.status === 'active' ||
			user.status === 'disabled'
				? user.status
				: 'disabled';

		return {
			id: Number(user.id),
			displayName: toNullableString(user.displayName),
			email: typeof user.email === 'string' ? user.email : '',
			emailVerifiedAt: toNullableString(user.emailVerifiedAt),
			status,
			vanity: toNullableString(user.vanity),
		};
	}

	function syncUrl(user: string) {
		if (typeof window === 'undefined') {
			return;
		}

		const url = new URL(window.location.href);
		if (user.trim()) {
			url.searchParams.set('user', user.trim());
		} else {
			url.searchParams.delete('user');
		}

		window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
	}

	function validateSearch() {
		const trimmed = queryDraft.trim();
		if (!trimmed) {
			queryError = labels.searchRequiredError;
			return null;
		}

		queryError = '';
		return trimmed;
	}

	function validateVanity() {
		const trimmed = vanityDraft.trim();
		if (!trimmed) {
			vanityError = labels.editRequiredError;
			return null;
		}

		if (trimmed.length > 64) {
			vanityError = labels.editLengthError;
			return null;
		}

		if (!VANITY_PATTERN.test(trimmed)) {
			vanityError = labels.editPatternError;
			return null;
		}

		vanityError = '';
		return trimmed;
	}

	function openPendingDialog() {
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.actionPendingTitle;
		dialogMessage = labels.actionPendingBody;
		dialogPrimaryAction = null;
	}

	function openErrorDialog(message: string, reopenEdit = false) {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.actionErrorTitle;
		dialogMessage = message;
		dialogPrimaryAction = {
			label: labels.confirmLabel,
			onClick: () => {
				dialogOpen = false;
				if (reopenEdit) {
					vanityDialogOpen = true;
				}
			},
		};
	}

	function openSuccessDialog(message = labels.actionSuccessBody) {
		dialogOpen = true;
		dialogState = 'success';
		dialogTitle = labels.actionSuccessTitle;
		dialogMessage = message;
		dialogPrimaryAction = {
			label: labels.confirmLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
	}

	function getStatusActionLabel(status: ManagedUserView['status']) {
		if (status === 'pending_approval') {
			return labels.statusApproveLabel;
		}

		if (status === 'disabled') {
			return labels.statusEnableLabel;
		}

		return labels.statusDisableLabel;
	}

	function getStatusActionKind(status: ManagedUserView['status']): StatusActionKind {
		if (status === 'pending_approval') {
			return 'approve';
		}

		if (status === 'disabled') {
			return 'enable';
		}

		return 'disable';
	}

	function isNotFoundError(error: unknown) {
		const code = getApiErrorCode(error);
		if (code === 'NOT_FOUND' || code === 'USER_NOT_FOUND') {
			return true;
		}

		if (error instanceof Error) {
			return error.message.toLowerCase().includes('not found');
		}

		return false;
	}

	async function loadUser(searchValue?: string) {
		if (!isAuthenticatedSession(session) || !session.user.isStaff) {
			loading = false;
			return;
		}

		const target = searchValue ?? validateSearch();
		if (!target) {
			selectedUser = null;
			resultError = '';
			hasSearched = false;
			return;
		}

		loadingUser = true;
		resultError = '';
		hasSearched = true;

		try {
			const response = await getApiAdapter().getManagedUser(target);
			selectedUser = normalizeManagedUser(response.user);
			queryDraft = target;
			syncUrl(target);
		} catch (error) {
			selectedUser = null;
			resultError = isNotFoundError(error) ? '' : getErrorMessage(error, labels.searchErrorBody);
			syncUrl(target);
		} finally {
			loadingUser = false;
		}
	}

	async function submitSearch() {
		await loadUser();
	}

	function clearSearch() {
		queryDraft = '';
		queryError = '';
		resultError = '';
		hasSearched = false;
		selectedUser = null;
		syncUrl('');
	}

	async function submitVanityUpdate() {
		const nextVanity = validateVanity();
		if (!nextVanity || !selectedUser) {
			return;
		}

		vanityDialogOpen = false;
		openPendingDialog();

		let timedOut = false;
		const timeoutId = window.setTimeout(() => {
			timedOut = true;
			openErrorDialog(labels.actionErrorBody, true);
		}, UPDATE_TIMEOUT_MS);

		try {
			const previousVanity = selectedUser.vanity;
			const response = await getApiAdapter().updateUserVanity(selectedUser.id, { vanity: nextVanity });
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			selectedUser = normalizeManagedUser(response.user);
			if (queryDraft.trim() === (previousVanity ?? '')) {
				queryDraft = selectedUser.vanity ?? queryDraft;
				syncUrl(queryDraft);
			}
			openSuccessDialog();
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			openErrorDialog(getErrorMessage(error, labels.actionErrorBody), true);
		}
	}

	async function submitStatusAction(kind: StatusActionKind) {
		if (!selectedUser) {
			return;
		}

		openPendingDialog();

		try {
			const response =
				kind === 'approve'
					? await getApiAdapter().approveUser(selectedUser.id)
					: kind === 'enable'
						? await getApiAdapter().enableUser(selectedUser.id)
						: await getApiAdapter().disableUser(selectedUser.id);
			selectedUser = normalizeManagedUser(response.user);
			openSuccessDialog();
		} catch (error) {
			openErrorDialog(getErrorMessage(error, labels.actionErrorBody));
		}
	}

	$: userCardItems = selectedUser
		? ([
				{
					key: 'displayName',
					label: labels.nameLabel,
					value: selectedUser.displayName ?? labels.unsetLabel,
				},
				{
					key: 'email',
					label: labels.emailLabel,
					value: selectedUser.email || labels.unsetLabel,
				},
				{
					key: 'id',
					label: labels.idLabel,
					value: String(selectedUser.id),
				},
				{
					key: 'vanity',
					label: labels.vanityLabel,
					value: selectedUser.vanity ?? labels.unsetLabel,
					action: {
						ariaLabel: labels.editVanityLabel,
						onClick: () => {
							vanityDraft = selectedUser?.vanity ?? '';
							vanityError = '';
							vanityDialogOpen = true;
						},
					},
				},
				{
					key: 'status',
					label: labels.statusLabel,
					value: selectedUser.status,
				},
				{
					key: 'emailVerifiedAt',
					label: labels.emailVerifiedLabel,
					value: selectedUser.emailVerifiedAt ?? labels.unsetLabel,
				},
			] satisfies UserInfoCardItem[])
		: [];

	$: userCardTitle = selectedUser
		? selectedUser.displayName
			? selectedUser.displayName
			: `User #${selectedUser.id}`
		: '';

	onMount(() => {
		void (async () => {
			session = await ensureAuthSession();
			loading = false;
			if (initialUser.trim()) {
				await loadUser(initialUser.trim());
			}
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
	<section class="official-user-profile">
		<div class="official-user-head">
			<p class="official-user-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
			<a class="official-user-back" href={`/${lang}/official`}>{labels.backLabel}</a>
		</div>

		<form
			class="official-user-search"
			on:submit|preventDefault={() => {
				void submitSearch();
			}}
		>
			<label class="official-user-field">
				<span>{labels.searchInputLabel}</span>
				<input
					class:error={Boolean(queryError)}
					type="search"
					bind:value={queryDraft}
					placeholder={labels.searchPlaceholderUser}
					autocomplete="off"
				/>
				{#if queryError}<em>{queryError}</em>{/if}
			</label>

			<div class="official-user-search-actions">
				<button type="submit" class="official-user-submit" disabled={loadingUser}>
					{labels.searchSubmitLabel}
				</button>
				<button
					type="button"
					class="official-user-clear"
					disabled={loadingUser && !queryDraft}
					on:click={clearSearch}
				>
					{labels.searchClearLabel}
				</button>
			</div>
		</form>

		<div class="official-user-result-shell">
			{#if loadingUser}
				<p class="official-user-state">{labels.loadingLabel}</p>
			{:else if resultError}
				<div class="official-user-state-block">
					<h2>{labels.searchErrorTitle}</h2>
					<p>{resultError}</p>
				</div>
			{:else if selectedUser}
				<div class="official-user-result-card">
					<UserInfoCard
						eyebrow={labels.resultEyebrow}
						title={userCardTitle}
						intro=""
						items={userCardItems}
						headingTag="h2"
					/>

					<div class="official-user-actions">
						<button
							type="button"
							class="official-user-status-action"
							on:click={() => {
								const user = selectedUser;
								if (!user) {
									return;
								}

								void submitStatusAction(getStatusActionKind(user.status));
							}}
						>
							{getStatusActionLabel(selectedUser.status)}
						</button>
					</div>
				</div>
			{:else if hasSearched}
				<div class="official-user-state-block">
					<h2>{labels.searchNoResultTitle}</h2>
					<p>{labels.searchNoResultBody}</p>
				</div>
			{:else}
				<div class="official-user-state-block">
					<h2>{labels.searchEmptyTitle}</h2>
					<p>{labels.searchEmptyBody}</p>
				</div>
			{/if}
		</div>

		{#if vanityDialogOpen}
			<div class="official-user-edit-backdrop" role="presentation">
				<section class="official-user-edit-dialog" role="dialog" aria-modal="true">
					<div class="official-user-edit-card">
						<h2>{labels.editDialogTitle}</h2>
						<p>{labels.editDialogBody}</p>
						<label class="official-user-edit-field">
							<span>{labels.editInputLabel}</span>
							<input
								class:error={Boolean(vanityError)}
								bind:value={vanityDraft}
								type="text"
								maxlength="64"
								placeholder={labels.editPlaceholder}
								autocomplete="off"
							/>
							{#if vanityError}<em>{vanityError}</em>{/if}
						</label>
						<div class="official-user-edit-actions">
							<button
								type="button"
								class="official-user-edit-button official-user-edit-button-secondary"
								on:click={() => (vanityDialogOpen = false)}
							>
								{labels.editCancelLabel}
							</button>
							<button
								type="button"
								class="official-user-edit-button official-user-edit-button-primary"
								on:click={() => void submitVanityUpdate()}
							>
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
	.official-user-profile {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.official-user-head,
	.official-user-search,
	.official-user-result-shell {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.official-user-eyebrow {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.official-user-head h1,
	.official-user-head p,
	.official-user-state-block h2,
	.official-user-state-block p {
		margin: 0;
	}

	.official-user-head h1 {
		margin-top: 12px;
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.03em;
	}

	.official-user-head p,
	.official-user-state-block p,
	.official-user-state {
		margin-top: 14px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.official-user-back {
		margin-top: 20px;
		display: inline-flex;
		font-weight: 700;
	}

	.official-user-field,
	.official-user-edit-field {
		display: grid;
		gap: 8px;
	}

	.official-user-field span,
	.official-user-edit-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.official-user-field input,
	.official-user-edit-field input {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.official-user-field input.error,
	.official-user-edit-field input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.official-user-field em,
	.official-user-edit-field em {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.official-user-search-actions,
	.official-user-actions,
	.official-user-edit-actions {
		margin-top: 18px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.official-user-submit,
	.official-user-clear,
	.official-user-status-action,
	.official-user-edit-button {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.official-user-submit,
	.official-user-status-action,
	.official-user-edit-button-primary {
		border: 1px solid transparent;
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.official-user-clear,
	.official-user-edit-button-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
		color: var(--text-main);
	}

	.official-user-state-block {
		display: grid;
		gap: 12px;
	}

	.official-user-result-card {
		display: grid;
		gap: 18px;
	}

	.official-user-edit-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.official-user-edit-dialog {
		width: min(520px, 100%);
	}

	.official-user-edit-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 26px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 14px;
	}

	.official-user-edit-card h2,
	.official-user-edit-card p {
		margin: 0;
	}

	.official-user-edit-card p {
		line-height: 1.7;
		color: var(--text-soft);
	}

	@media (max-width: 720px) {
		.official-user-head,
		.official-user-search,
		.official-user-result-shell,
		.official-user-edit-card {
			padding: 22px;
			border-radius: 22px;
		}

		.official-user-search-actions,
		.official-user-actions,
		.official-user-edit-actions {
			flex-direction: column-reverse;
		}

		.official-user-submit,
		.official-user-clear,
		.official-user-status-action,
		.official-user-edit-button {
			width: 100%;
		}
	}
</style>
