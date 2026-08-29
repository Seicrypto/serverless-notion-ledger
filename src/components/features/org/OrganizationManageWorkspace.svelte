<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import RequestStatusDialog from './RequestStatusDialog.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, subscribeAuthSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import {
		clearOrganizationManageCache,
		ensureOrganizationManageCache,
		refreshOrganizationManageCache,
		type OrganizationManageCharacter,
		type OrganizationManageMember,
		type OrganizationManageSummary,
	} from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import { refreshMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';

	interface Labels {
		title: string;
		intro: string;
		loadingLabel: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
		missingOrgTitle: string;
		missingOrgBody: string;
		orgCardEditLabel: string;
		orgCardMembersLabel: string;
		orgCardCharactersLabel: string;
		orgCardSupportedLabel: string;
		orgCardVanityLabel: string;
		tabCharactersLabel: string;
		tabMembersLabel: string;
		charactersCreateLabel: string;
		charactersRefreshLabel: string;
		membersInviteLabel: string;
		membersPendingLabel: string;
		refreshCooldownLabel: string;
		refreshingLabel: string;
		inviteSearchFieldLabel: string;
		inviteSearchInputLabel: string;
		inviteSearchDisplayNameOption: string;
		inviteSearchEmailOption: string;
		inviteSearchPlaceholderDisplayName: string;
		inviteSearchPlaceholderEmail: string;
		inviteSearchValidationEmail: string;
		inviteSearchSubmitLabel: string;
		inviteSearchCancelLabel: string;
		editOrgTitle: string;
		editOrgNameLabel: string;
		editOrgSlugLabel: string;
		editOrgDescriptionLabel: string;
		editOrgIconUrlLabel: string;
		editOrgSubmitLabel: string;
		editOrgCancelLabel: string;
		createCharacterTitle: string;
		createCharacterNameLabel: string;
		createCharacterDescriptionLabel: string;
		createCharacterAssigneeLabel: string;
		createCharacterAssigneeHint: string;
		createCharacterSubmitLabel: string;
		createCharacterCancelLabel: string;
		characterNameColumn: string;
		characterClaimStateColumn: string;
		characterClaimByColumn: string;
		characterDescriptionColumn: string;
		characterActionsColumn: string;
		memberNameColumn: string;
		memberActionsColumn: string;
		claimStateClaimed: string;
		claimStateUnclaimed: string;
		claimStatePending: string;
		claimCharacterLabel: string;
		editLabel: string;
		deleteLabel: string;
		removeMemberLabel: string;
		pendingBadgeLabel: string;
		currentUserLabel: string;
		placeholderActionTitle: string;
		placeholderActionBody: string;
		savePendingTitle: string;
		savePendingBody: string;
		saveSuccessTitle: string;
		saveSuccessBody: string;
		saveErrorTitle: string;
		createPendingTitle: string;
		createPendingBody: string;
		createSuccessTitle: string;
		createSuccessBody: string;
		createErrorTitle: string;
		confirmLabel: string;
		closeLabel: string;
		validationRequired: string;
		validationSlug: string;
		validationUrl: string;
		validationNameLength: string;
		validationSlugLength: string;
		validationDescriptionLength: string;
		emptyCharactersTitle: string;
		emptyMembersTitle: string;
	}

	type ActiveTab = 'characters' | 'members';
	type DialogState = 'pending' | 'success' | 'error';

	interface FieldErrors {
		name?: string;
		slug?: string;
		description?: string;
		iconUrl?: string;
		characterName?: string;
		characterDescription?: string;
	}

	const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
	const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;
	const REFRESH_KEY_PREFIX = 'raid-ledger.org-manage-last-refresh';

	export let lang: string;
	export let orgVanity: string | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;
	let workspaceError = '';
	let organization: OrganizationManageSummary | null = null;
	let characters: OrganizationManageCharacter[] = [];
	let members: OrganizationManageMember[] = [];
	let activeTab: ActiveTab = 'characters';
	let refreshLockedUntil = 0;
	let isRefreshing = false;

	let editOrgOpen = false;
	let editName = '';
	let editSlug = '';
	let editDescription = '';
	let editIconUrl = '';

	let createCharacterOpen = false;
	let createCharacterName = '';
	let createCharacterDescription = '';

	let inviteMemberOpen = false;
	let inviteSearchField: 'displayName' | 'email' = 'displayName';
	let inviteSearchQuery = '';
	let inviteSearchError = '';

	let fieldErrors: FieldErrors = {};
	let now = Date.now();

	let statusOpen = false;
	let statusState: DialogState = 'pending';
	let statusTitle = '';
	let statusMessage = '';
	let statusPrimaryAction: { label: string; onClick?: () => void; href?: string } | null = null;

	const toRefreshKey = (targetOrgVanity: string) => `${REFRESH_KEY_PREFIX}:${targetOrgVanity}`;

	const hydrateRefreshCooldown = () => {
		if (typeof window === 'undefined' || !orgVanity) {
			return;
		}

		const raw = window.sessionStorage.getItem(toRefreshKey(orgVanity));
		refreshLockedUntil = raw ? Number(raw) : 0;
	};

	const writeRefreshCooldown = () => {
		if (typeof window === 'undefined' || !orgVanity) {
			return;
		}

		refreshLockedUntil = Date.now() + MANUAL_REFRESH_COOLDOWN_MS;
		window.sessionStorage.setItem(toRefreshKey(orgVanity), String(refreshLockedUntil));
	};

	const isRefreshCoolingDown = () => refreshLockedUntil > now;

	const resetStatusDialog = () => {
		statusOpen = false;
		statusPrimaryAction = null;
	};

	const openStatus = (
		state: DialogState,
		title: string,
		message: string,
		primaryAction: { label: string; onClick?: () => void; href?: string } | null = null,
	) => {
		statusOpen = true;
		statusState = state;
		statusTitle = title;
		statusMessage = message;
		statusPrimaryAction = primaryAction;
	};

	const fillEditForm = () => {
		if (!organization) {
			return;
		}

		editName = organization.name;
		editSlug = organization.slug;
		editDescription = organization.description ?? '';
		editIconUrl = organization.iconUrl ?? '';
		fieldErrors = {};
	};

	const getMemberDisplayName = (member: OrganizationManageMember) => {
		if (member.displayName?.trim()) {
			return member.displayName;
		}

		if (isAuthenticatedSession(session) && session.user.id === member.userId) {
			return session.user.displayName?.trim() || `${labels.currentUserLabel} @${session.user.vanity ?? member.userId}`;
		}

		return member.vanity ? `@${member.vanity}` : `User #${member.userId}`;
	};

	const getClaimStateLabel = (character: OrganizationManageCharacter) => {
		if (character.isClaimed) {
			return labels.claimStateClaimed;
		}

		return labels.claimStateUnclaimed;
	};

	const getCharacterClaimDisplay = (character: OrganizationManageCharacter) => {
		if (!character.claimedBy) {
			return null;
		}

		if (character.claimedBy.displayName?.trim()) {
			return character.claimedBy.displayName;
		}

		if (character.claimedBy.vanity) {
			return `@${character.claimedBy.vanity}`;
		}

		return `User #${character.claimedBy.userId}`;
	};

	const loadWorkspace = async (forceRefresh = false) => {
		if (!orgVanity || !isAuthenticatedSession(session)) {
			loading = false;
			return;
		}

		loading = true;
		workspaceError = '';

		try {
			const snapshot = forceRefresh
				? await refreshOrganizationManageCache(orgVanity)
				: await ensureOrganizationManageCache(orgVanity);
			organization = snapshot.organization;
			characters = snapshot.characters;
			members = snapshot.members;
			fillEditForm();
		} catch (error) {
			workspaceError = getErrorMessage(error, labels.saveErrorTitle);
		} finally {
			loading = false;
			isRefreshing = false;
		}
	};

	const validateOrganizationPatch = () => {
		const nextErrors: FieldErrors = {};

		if (!editName.trim()) {
			nextErrors.name = labels.validationRequired;
		} else if (editName.trim().length > 100) {
			nextErrors.name = labels.validationNameLength;
		}

		const normalizedSlug = editSlug.trim();
		if (!normalizedSlug) {
			nextErrors.slug = labels.validationRequired;
		} else if (normalizedSlug.length < 2 || normalizedSlug.length > 80) {
			nextErrors.slug = labels.validationSlugLength;
		} else if (!SLUG_PATTERN.test(normalizedSlug)) {
			nextErrors.slug = labels.validationSlug;
		}

		if (editDescription.trim().length > 500) {
			nextErrors.description = labels.validationDescriptionLength;
		}

		if (editIconUrl.trim()) {
			try {
				new URL(editIconUrl.trim());
			} catch {
				nextErrors.iconUrl = labels.validationUrl;
			}
		}

		fieldErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const submitOrganizationPatch = async () => {
		if (!orgVanity || !validateOrganizationPatch()) {
			return;
		}

		editOrgOpen = false;
		openStatus('pending', labels.savePendingTitle, labels.savePendingBody);

		try {
			await getApiAdapter().updateOrganization(orgVanity, {
				name: editName.trim(),
				slug: editSlug.trim(),
				description: editDescription.trim() || undefined,
				iconUrl: editIconUrl.trim() || undefined,
			});
			clearOrganizationManageCache(orgVanity);
			await refreshMyOrganizationsCache();
			await loadWorkspace(true);
			openStatus('success', labels.saveSuccessTitle, labels.saveSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.saveErrorTitle, getErrorMessage(error, labels.saveErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const validateCreateCharacter = () => {
		const nextErrors: FieldErrors = {};

		if (!createCharacterName.trim()) {
			nextErrors.characterName = labels.validationRequired;
		} else if (createCharacterName.trim().length > 100) {
			nextErrors.characterName = labels.validationNameLength;
		}

		if (createCharacterDescription.trim().length > 1000) {
			nextErrors.characterDescription = labels.validationDescriptionLength;
		}

		fieldErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const submitCreateCharacter = async () => {
		if (!orgVanity || !organization || !validateCreateCharacter()) {
			return;
		}

		const primaryGame = organization.games.find((game) => game.primary) ?? organization.games[0];
		if (!primaryGame) {
			openStatus('error', labels.createErrorTitle, labels.placeholderActionBody, {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
			return;
		}

		createCharacterOpen = false;
		openStatus('pending', labels.createPendingTitle, labels.createPendingBody);

		try {
			await getApiAdapter().createOrganizationCharacter(orgVanity, {
				gameId: primaryGame.gameId,
				name: createCharacterName.trim(),
				notes: createCharacterDescription.trim() || undefined,
			});
			createCharacterName = '';
			createCharacterDescription = '';
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.createSuccessTitle, labels.createSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.createErrorTitle, getErrorMessage(error, labels.createErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const triggerPlaceholderAction = () => {
		openStatus('success', labels.placeholderActionTitle, labels.placeholderActionBody, {
			label: labels.confirmLabel,
			onClick: resetStatusDialog,
		});
	};

	const submitInviteSearch = () => {
		const trimmed = inviteSearchQuery.trim();
		inviteSearchError = '';

		if (inviteSearchField === 'email' && trimmed) {
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailPattern.test(trimmed)) {
				inviteSearchError = labels.inviteSearchValidationEmail;
				return;
			}
		}

		inviteMemberOpen = false;
		triggerPlaceholderAction();
	};

	const refreshWorkspace = async () => {
		if (!orgVanity || isRefreshing || isRefreshCoolingDown()) {
			return;
		}

		isRefreshing = true;
		writeRefreshCooldown();
		await loadWorkspace(true);
	};

	onMount(() => {
		void (async () => {
			session = await ensureAuthSession();
			hydrateRefreshCooldown();
			await loadWorkspace();
		})();

		const unsubscribe = subscribeAuthSession((nextSession) => {
			session = nextSession;
			void loadWorkspace();
		});
		const timer = window.setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			unsubscribe();
			window.clearInterval(timer);
		};
	});
</script>

{#if loading && !isAuthenticatedSession(session)}
	<AccessNoticeCard title={labels.title} body={labels.loadingLabel} />
{:else if !isAuthenticatedSession(session)}
	<AccessNoticeCard
		title={labels.authRequiredTitle}
		body={labels.authRequiredBody}
		primaryAction={{ label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' }}
		secondaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' }}
	/>
{:else if !orgVanity}
	<AccessNoticeCard title={labels.missingOrgTitle} body={labels.missingOrgBody} />
{:else}
	<section class="org-manage-shell">
		<div class="org-manage-head">
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
		</div>

		{#if workspaceError}
			<AccessNoticeCard title={labels.saveErrorTitle} body={workspaceError} />
		{:else if loading || !organization}
			<AccessNoticeCard title={labels.title} body={labels.loadingLabel} />
		{:else}
			<article class="org-manage-card">
				<div class="org-manage-card-top">
					<div class="org-manage-card-brand">
						{#if organization.iconUrl}
							<img src={organization.iconUrl} alt="" class="org-manage-card-avatar-image" />
						{:else}
							<div class="org-manage-card-avatar" aria-hidden="true">
								{organization.name
									.split(/\s+/)
									.filter(Boolean)
									.slice(0, 2)
									.map((part) => part[0]?.toUpperCase() ?? '')
									.join('')
									.slice(0, 2) || 'OG'}
							</div>
						{/if}

						<div class="org-manage-card-copy">
							<p class="org-manage-card-slug">/{organization.slug}</p>
							<h2>{organization.name}</h2>
						</div>
					</div>

					<button
						type="button"
						class="org-manage-edit-trigger"
						aria-label={labels.orgCardEditLabel}
						on:click={() => {
							fillEditForm();
							editOrgOpen = true;
						}}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M4 20h4l10-10-4-4L4 16v4Z" fill="currentColor"></path>
							<path d="m13 5 4 4" stroke="currentColor" stroke-width="1.5" fill="none"></path>
						</svg>
					</button>
				</div>

				{#if organization.description}
					<p class="org-manage-card-description">{organization.description}</p>
				{/if}

				{#if organization.games.length > 0}
					<div class="org-manage-card-games">
						{#each organization.games as game}
							<span class:primary={game.primary}>{game.name}</span>
						{/each}
					</div>
				{/if}

				<dl class="org-manage-card-stats">
					<div>
						<dt>{labels.orgCardMembersLabel}</dt>
						<dd>{organization.stats.memberCount}</dd>
					</div>
					<div>
						<dt>{labels.orgCardCharactersLabel}</dt>
						<dd>{organization.stats.characterCount}</dd>
					</div>
				</dl>

				{#if organization.vanity}
					<p class="org-manage-card-vanity">
						<strong>{labels.orgCardVanityLabel}:</strong> {organization.vanity}
					</p>
				{/if}
			</article>

			<section class="org-manage-panels">
				<div class="org-manage-tabs">
					<button
						type="button"
						class:active={activeTab === 'characters'}
						on:click={() => {
							activeTab = 'characters';
						}}
					>
						{labels.tabCharactersLabel}
					</button>
					<button
						type="button"
						class:active={activeTab === 'members'}
						on:click={() => {
							activeTab = 'members';
						}}
					>
						{labels.tabMembersLabel}
					</button>
				</div>

				<div class="org-manage-toolbar">
					{#if activeTab === 'characters'}
						<div class="org-manage-toolbar-actions">
							<button
								type="button"
								class="toolbar-primary"
								on:click={() => {
									fieldErrors = {};
									createCharacterOpen = true;
								}}
							>
								{labels.charactersCreateLabel}
							</button>
							<button
								type="button"
								class="toolbar-secondary"
								disabled={isRefreshing || isRefreshCoolingDown()}
								on:click={() => void refreshWorkspace()}
							>
								{isRefreshing ? labels.refreshingLabel : labels.charactersRefreshLabel}
							</button>
						</div>
					{:else}
						<div class="org-manage-toolbar-actions">
							<button
								type="button"
								class="toolbar-primary"
								on:click={() => {
									inviteSearchField = 'displayName';
									inviteSearchQuery = '';
									inviteSearchError = '';
									inviteMemberOpen = true;
								}}
							>
								{labels.membersInviteLabel}
							</button>
							<a
								class="toolbar-secondary toolbar-link"
								href={`/${lang}/guilds/manage/pending?orgVanity=${encodeURIComponent(orgVanity)}`}
							>
								{labels.membersPendingLabel}
							</a>
						</div>
					{/if}

					{#if activeTab === 'characters' && isRefreshCoolingDown()}
						<p class="org-manage-toolbar-note">{labels.refreshCooldownLabel}</p>
					{/if}
				</div>

				<div class="org-manage-table-shell">
					{#if activeTab === 'characters'}
						{#if characters.length === 0}
							<p class="org-manage-empty">{labels.emptyCharactersTitle}</p>
						{:else}
							<table class="org-manage-table">
								<thead>
									<tr>
										<th>{labels.characterNameColumn}</th>
										<th>{labels.characterClaimStateColumn}</th>
										<th>{labels.characterClaimByColumn}</th>
										<th>{labels.characterDescriptionColumn}</th>
										<th>{labels.characterActionsColumn}</th>
									</tr>
								</thead>
								<tbody>
									{#each characters as character}
										<tr>
											<td>{character.name}</td>
											<td>
												<span class:claimed={character.isClaimed} class="claim-state">
													{character.isClaimed ? '✓' : '–'}
												</span>
												<span class="sr-only">{getClaimStateLabel(character)}</span>
											</td>
											<td>
												{#if getCharacterClaimDisplay(character)}
													{getCharacterClaimDisplay(character)}
												{:else}
													<button type="button" class="table-text-action" on:click={triggerPlaceholderAction}>
														{labels.claimCharacterLabel}
													</button>
												{/if}
											</td>
											<td>{character.description || '—'}</td>
											<td class="org-manage-actions-cell">
												<button type="button" class="table-chip-button" on:click={triggerPlaceholderAction}>
													{labels.editLabel}
												</button>
												<button type="button" class="table-chip-button danger" on:click={triggerPlaceholderAction}>
													{labels.deleteLabel}
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{:else}
						{#if members.length === 0}
							<p class="org-manage-empty">{labels.emptyMembersTitle}</p>
						{:else}
							<table class="org-manage-table">
								<thead>
									<tr>
										<th>{labels.memberNameColumn}</th>
										<th>{labels.memberActionsColumn}</th>
									</tr>
								</thead>
								<tbody>
									{#each members as member}
										<tr>
											<td>
												<div class="member-cell">
													<span>{getMemberDisplayName(member)}</span>
													{#if member.status === 'pending'}
														<em>{labels.pendingBadgeLabel}</em>
													{/if}
												</div>
											</td>
											<td class="org-manage-actions-cell">
												<button type="button" class="table-chip-button danger" on:click={triggerPlaceholderAction}>
													{labels.removeMemberLabel}
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{/if}
				</div>
			</section>
		{/if}

		{#if editOrgOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.editOrgTitle}</h2>
						<label class="manage-field">
							<span>{labels.editOrgNameLabel}</span>
							<input bind:value={editName} class:error={Boolean(fieldErrors.name)} type="text" maxlength="100" />
							{#if fieldErrors.name}<em>{fieldErrors.name}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.editOrgSlugLabel}</span>
							<input bind:value={editSlug} class:error={Boolean(fieldErrors.slug)} type="text" maxlength="80" />
							{#if fieldErrors.slug}<em>{fieldErrors.slug}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.editOrgDescriptionLabel}</span>
							<textarea bind:value={editDescription} class:error={Boolean(fieldErrors.description)} rows="4" maxlength="500"></textarea>
							{#if fieldErrors.description}<em>{fieldErrors.description}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.editOrgIconUrlLabel}</span>
							<input bind:value={editIconUrl} class:error={Boolean(fieldErrors.iconUrl)} type="url" />
							{#if fieldErrors.iconUrl}<em>{fieldErrors.iconUrl}</em>{/if}
						</label>
						<div class="manage-modal-actions">
							<button type="button" class="modal-secondary" on:click={() => (editOrgOpen = false)}>
								{labels.editOrgCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={() => void submitOrganizationPatch()}>
								{labels.editOrgSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if createCharacterOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.createCharacterTitle}</h2>
						<label class="manage-field">
							<span>{labels.createCharacterNameLabel}</span>
							<input bind:value={createCharacterName} class:error={Boolean(fieldErrors.characterName)} type="text" maxlength="100" />
							{#if fieldErrors.characterName}<em>{fieldErrors.characterName}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterDescriptionLabel}</span>
							<textarea
								bind:value={createCharacterDescription}
								class:error={Boolean(fieldErrors.characterDescription)}
								rows="4"
								maxlength="1000"
							></textarea>
							{#if fieldErrors.characterDescription}<em>{fieldErrors.characterDescription}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterAssigneeLabel}</span>
							<select disabled>
								<option>{labels.createCharacterAssigneeHint}</option>
							</select>
						</label>
						<div class="manage-modal-actions">
							<button type="button" class="modal-secondary" on:click={() => (createCharacterOpen = false)}>
								{labels.createCharacterCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={() => void submitCreateCharacter()}>
								{labels.createCharacterSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if inviteMemberOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.membersInviteLabel}</h2>
						<label class="manage-field">
							<span>{labels.inviteSearchFieldLabel}</span>
							<select bind:value={inviteSearchField}>
								<option value="displayName">{labels.inviteSearchDisplayNameOption}</option>
								<option value="email">{labels.inviteSearchEmailOption}</option>
							</select>
						</label>
						<label class="manage-field">
							<span>{labels.inviteSearchInputLabel}</span>
							<input
								type={inviteSearchField === 'email' ? 'email' : 'search'}
								bind:value={inviteSearchQuery}
								class:error={Boolean(inviteSearchError)}
								placeholder={inviteSearchField === 'email'
									? labels.inviteSearchPlaceholderEmail
									: labels.inviteSearchPlaceholderDisplayName}
							/>
							{#if inviteSearchError}<em>{inviteSearchError}</em>{/if}
						</label>
						<div class="manage-modal-actions">
							<button
								type="button"
								class="modal-secondary"
								on:click={() => {
									inviteMemberOpen = false;
								}}
							>
								{labels.inviteSearchCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={submitInviteSearch}>
								{labels.inviteSearchSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		<RequestStatusDialog
			open={statusOpen}
			state={statusState}
			title={statusTitle}
			message={statusMessage}
			primaryAction={statusPrimaryAction}
			onClose={resetStatusDialog}
		/>
	</section>
{/if}

<style>
	.org-manage-shell {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.org-manage-head,
	.org-manage-card,
	.org-manage-panels {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.org-manage-head h1,
	.org-manage-head p,
	.org-manage-card h2,
	.org-manage-card p,
	.org-manage-empty {
		margin: 0;
	}

	.org-manage-head p,
	.org-manage-card-description,
	.org-manage-empty,
	.org-manage-toolbar-note,
	.org-manage-card-vanity {
		margin-top: 12px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.org-manage-card {
		display: grid;
		gap: 18px;
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 10%, transparent), transparent 32%),
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white) 0%, var(--surface-strong) 100%);
	}

	.org-manage-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.org-manage-card-brand {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.org-manage-card-avatar,
	.org-manage-card-avatar-image {
		width: 58px;
		height: 58px;
		border-radius: 18px;
		flex: 0 0 auto;
	}

	.org-manage-card-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 54%, white) 100%);
		color: white;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.org-manage-card-avatar-image {
		object-fit: cover;
	}

	.org-manage-card-copy {
		min-width: 0;
	}

	.org-manage-card-slug {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 72%, var(--text-soft));
	}

	.org-manage-card-copy h2 {
		margin-top: 6px;
		font-size: 1.3rem;
	}

	.org-manage-edit-trigger {
		width: 40px;
		height: 40px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.org-manage-edit-trigger svg {
		width: 16px;
		height: 16px;
	}

	.org-manage-card-games,
	.org-manage-tabs,
	.org-manage-toolbar-actions,
	.manage-modal-actions,
	.org-manage-actions-cell {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.org-manage-card-games span,
	.org-manage-tabs button,
	.toolbar-primary,
	.toolbar-secondary,
	.table-chip-button {
		min-height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
	}

	.org-manage-card-games span {
		display: inline-flex;
		align-items: center;
		background: color-mix(in srgb, var(--surface-soft) 84%, white);
	}

	.org-manage-card-games span.primary {
		background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
		color: var(--accent-deep);
	}

	.org-manage-card-stats {
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.org-manage-card-stats div {
		padding: 16px;
		border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 74%, white);
	}

	.org-manage-card-stats dt {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.org-manage-card-stats dd {
		margin: 8px 0 0;
		font-size: 1.1rem;
		font-weight: 800;
	}

	.org-manage-tabs button,
	.toolbar-primary,
	.toolbar-secondary,
	.table-chip-button,
	.table-text-action,
	.modal-primary,
	.modal-secondary {
		cursor: pointer;
	}

	.org-manage-tabs button {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
	}

	.org-manage-tabs button.active,
	.toolbar-primary,
	.modal-primary {
		border: 1px solid transparent;
		background: var(--accent);
		color: white;
	}

	.toolbar-secondary,
	.table-chip-button,
	.modal-secondary,
	.toolbar-link {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		color: var(--text-main);
	}

	.toolbar-link {
		min-height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.org-manage-table-shell {
		margin-top: 20px;
	}

	.org-manage-table {
		width: 100%;
		border-collapse: collapse;
	}

	.org-manage-table th,
	.org-manage-table td {
		padding: 14px 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		text-align: left;
		vertical-align: middle;
	}

	.org-manage-table th {
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.claim-state {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		color: var(--text-soft);
		font-weight: 800;
	}

	.claim-state.claimed {
		color: #188f59;
	}

	.table-text-action {
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-deep);
		font: inherit;
		font-weight: 700;
	}

	.table-chip-button {
		min-height: 32px;
	}

	.table-chip-button.danger {
		color: #b24a4a;
	}

	.member-cell {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.member-cell em {
		min-height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		background: color-mix(in srgb, #f0b429 16%, var(--surface-soft));
		color: #8f6508;
		font-style: normal;
		font-size: 0.82rem;
		font-weight: 700;
	}

	.manage-modal-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.manage-modal {
		width: min(560px, 100%);
	}

	.manage-modal-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 26px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 14px;
	}

	.manage-modal-card h2 {
		margin: 0;
	}

	.manage-field {
		display: grid;
		gap: 8px;
	}

	.manage-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.manage-field input,
	.manage-field textarea,
	.manage-field select {
		width: 100%;
		min-height: 46px;
		padding: 10px 14px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.manage-field textarea {
		resize: vertical;
	}

	.manage-field input.error,
	.manage-field textarea.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.manage-field em {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 720px) {
		.org-manage-head,
		.org-manage-card,
		.org-manage-panels,
		.manage-modal-card {
			padding: 22px;
			border-radius: 22px;
		}

		.org-manage-card-top {
			flex-direction: column;
			align-items: stretch;
		}

		.org-manage-card-stats {
			grid-template-columns: 1fr;
		}

		.org-manage-table {
			display: block;
			overflow-x: auto;
		}

		.manage-modal-actions {
			flex-direction: column-reverse;
		}
	}
</style>
