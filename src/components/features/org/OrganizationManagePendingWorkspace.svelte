<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		subscribeAuthSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureOrganizationManageCache, type OrganizationManageSummary } from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import {
		getRecentCharacterClaimRequestsByOrganization,
		loadRecentCharacterClaimRequests,
		type RecentCharacterClaimRequestEntry,
	} from '../../../libs/organizations/recent-character-claim-requests.ts';
	import { resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';

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
		backManageLabel: string;
		currentUserLabel: string;
		relatedBadgeLabel: string;
		memberSectionTitle: string;
		memberSectionIntro: string;
		claimSectionTitle: string;
		claimSectionIntro: string;
		emptyMembersTitle: string;
		emptyClaimsTitle: string;
		localClaimsNote: string;
		kindInviteLabel: string;
		kindApplyLabel: string;
		requestedByLabel: string;
		targetLabel: string;
		roleLabel: string;
		characterLabel: string;
		gameLabel: string;
		errorTitle: string;
	}

	type PendingMemberRecord = Awaited<ReturnType<ReturnType<typeof getApiAdapter>['listOrganizationPendingMembers']>>['members'][number];

	export let lang: string;
	export let orgVanity: string | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;
	let errorMessage = '';
	let organization: OrganizationManageSummary | null = null;
	let pendingMembers: PendingMemberRecord[] = [];
	let recentClaimRequests: RecentCharacterClaimRequestEntry[] = [];

	const getGameLabel = (name: string | null | undefined, fallback: string) => name?.trim() || fallback;

	const isRelatedToCurrentUser = (userId: number | null | undefined) =>
		Boolean(isAuthenticatedSession(session) && typeof userId === 'number' && session.user.id === userId);

	const getUserDisplayName = (userId: number | null | undefined, vanity: string | null | undefined, displayName: string | null | undefined) => {
		if (displayName?.trim()) {
			return displayName;
		}

		if (isRelatedToCurrentUser(userId)) {
			return labels.currentUserLabel;
		}

		if (vanity?.trim()) {
			return `@${vanity}`;
		}

		return typeof userId === 'number' ? `User #${userId}` : '—';
	};

	$: currentOrgClaimRequests = orgVanity
		? getRecentCharacterClaimRequestsByOrganization(recentClaimRequests, orgVanity).filter(
				(entry) => entry.status === 'pending_confirmation',
			)
		: [];

	$: sortedPendingMembers = [...pendingMembers].sort((left, right) => {
		const leftScore = Number(isRelatedToCurrentUser(left.userId)) + Number(isRelatedToCurrentUser(left.invitedByUserId as number | undefined));
		const rightScore = Number(isRelatedToCurrentUser(right.userId)) + Number(isRelatedToCurrentUser(right.invitedByUserId as number | undefined));
		return rightScore - leftScore;
	});

	$: sortedClaimRequests = [...currentOrgClaimRequests].sort((left, right) => {
		const leftScore = Number(isRelatedToCurrentUser(left.targetUserId)) + Number(isRelatedToCurrentUser(left.requestedByUserId));
		const rightScore = Number(isRelatedToCurrentUser(right.targetUserId)) + Number(isRelatedToCurrentUser(right.requestedByUserId));
		return rightScore - leftScore || Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
	});

	const loadWorkspace = async () => {
		if (!orgVanity || !isAuthenticatedSession(session)) {
			loading = false;
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const [organizationSnapshot, pendingResponse] = await Promise.all([
				ensureOrganizationManageCache(orgVanity),
				getApiAdapter().listOrganizationPendingMembers(orgVanity),
			]);
			organization = organizationSnapshot.organization;
			pendingMembers = pendingResponse.members;
		} catch (error) {
			errorMessage = getErrorMessage(error, labels.errorTitle);
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		orgVanity = resolveOrganizationQuery(orgVanity);
		void (async () => {
			session = await ensureAuthSession();
			if (typeof window !== 'undefined') {
				recentClaimRequests = loadRecentCharacterClaimRequests(window.localStorage);
			}
			await loadWorkspace();
		})();

		const unsubscribe = subscribeAuthSession((nextSession) => {
			session = nextSession;
			void loadWorkspace();
		});

		return () => {
			unsubscribe();
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
	<section class="pending-shell">
		<div class="pending-head">
			<div>
				<h1>{labels.title}</h1>
				<p>{labels.intro}</p>
			</div>
			<a class="pending-back-link" href={`/${lang}/guilds/manage?orgVanity=${encodeURIComponent(orgVanity)}`}>
				{labels.backManageLabel}
			</a>
		</div>

		{#if errorMessage}
			<AccessNoticeCard title={labels.errorTitle} body={errorMessage} />
		{:else if loading || !organization}
			<AccessNoticeCard title={labels.title} body={labels.loadingLabel} />
		{:else}
			<section class="pending-grid">
				<article class="pending-card">
					<h2>{labels.claimSectionTitle}</h2>
					<p>{labels.claimSectionIntro}</p>
					<p class="pending-note">{labels.localClaimsNote}</p>

					{#if sortedClaimRequests.length === 0}
						<p class="pending-empty">{labels.emptyClaimsTitle}</p>
					{:else}
						<div class="pending-list">
							{#each sortedClaimRequests as request}
								<div
									class:related={isRelatedToCurrentUser(request.targetUserId) || isRelatedToCurrentUser(request.requestedByUserId)}
									class="pending-item"
								>
									<div class="pending-item-top">
										<strong>{request.characterName}</strong>
										{#if isRelatedToCurrentUser(request.targetUserId) || isRelatedToCurrentUser(request.requestedByUserId)}
											<span>{labels.relatedBadgeLabel}</span>
										{/if}
									</div>
									<dl>
										<div>
											<dt>{labels.gameLabel}</dt>
											<dd>{request.gameId ? `#${request.gameId}` : '—'}</dd>
										</div>
										<div>
											<dt>{labels.requestedByLabel}</dt>
											<dd>{getUserDisplayName(request.requestedByUserId, null, null)}</dd>
										</div>
										<div>
											<dt>{labels.targetLabel}</dt>
											<dd>{getUserDisplayName(request.targetUserId, null, null)}</dd>
										</div>
									</dl>
								</div>
							{/each}
						</div>
					{/if}
				</article>

				<article class="pending-card">
					<h2>{labels.memberSectionTitle}</h2>
					<p>{labels.memberSectionIntro}</p>

					{#if sortedPendingMembers.length === 0}
						<p class="pending-empty">{labels.emptyMembersTitle}</p>
					{:else}
						<div class="pending-list">
							{#each sortedPendingMembers as member}
								<div
									class:related={isRelatedToCurrentUser(member.userId) || isRelatedToCurrentUser(member.invitedByUserId as number | undefined)}
									class="pending-item"
								>
									<div class="pending-item-top">
										<strong>{getUserDisplayName(member.userId, member.userVanity as string | null | undefined, member.displayName as string | null | undefined)}</strong>
										<div class="pending-badges">
											<span>{member.pendingKind === 'invite' ? labels.kindInviteLabel : labels.kindApplyLabel}</span>
											{#if isRelatedToCurrentUser(member.userId) || isRelatedToCurrentUser(member.invitedByUserId as number | undefined)}
												<span>{labels.relatedBadgeLabel}</span>
											{/if}
										</div>
									</div>
									<dl>
										<div>
											<dt>{labels.roleLabel}</dt>
											<dd>{member.role}</dd>
										</div>
										<div>
											<dt>{labels.characterLabel}</dt>
											<dd>{member.pendingCharacter.name}</dd>
										</div>
										<div>
											<dt>{labels.gameLabel}</dt>
											<dd>{getGameLabel(member.pendingCharacter.game.displayName as string | null | undefined, member.pendingCharacter.game.gameName)}</dd>
										</div>
										<div>
											<dt>{labels.requestedByLabel}</dt>
											<dd>{getUserDisplayName(member.invitedByUserId as number | undefined, null, null)}</dd>
										</div>
									</dl>
								</div>
							{/each}
						</div>
					{/if}
				</article>
			</section>
		{/if}
	</section>
{/if}

<style>
	.pending-shell {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.pending-head,
	.pending-card {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.pending-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.pending-head h1,
	.pending-head p,
	.pending-card h2,
	.pending-card p,
	.pending-empty,
	.pending-note {
		margin: 0;
	}

	.pending-head p,
	.pending-card > p,
	.pending-note,
	.pending-empty {
		margin-top: 10px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.pending-back-link {
		min-height: 40px;
		padding: 0 16px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
		font-weight: 700;
		text-decoration: none;
	}

	.pending-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	.pending-list {
		margin-top: 18px;
		display: grid;
		gap: 12px;
	}

	.pending-item {
		padding: 16px;
		border: 1px solid color-mix(in srgb, var(--line) 84%, white);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
	}

	.pending-item.related {
		border-color: color-mix(in srgb, var(--accent) 30%, var(--line));
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, white) 0%, color-mix(in srgb, var(--surface-strong) 88%, white) 100%);
	}

	.pending-item-top,
	.pending-badges {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.pending-item-top {
		justify-content: space-between;
	}

	.pending-item-top span,
	.pending-badges span {
		min-height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		background: color-mix(in srgb, var(--ledger-accent) 14%, var(--surface-soft));
		color: color-mix(in srgb, var(--ledger-accent-deep) 84%, var(--text-main));
		font-size: 0.78rem;
		font-weight: 700;
	}

	.pending-item dl {
		margin: 14px 0 0;
		display: grid;
		gap: 10px;
	}

	.pending-item dl div {
		display: grid;
		grid-template-columns: 118px minmax(0, 1fr);
		gap: 10px;
	}

	.pending-item dt,
	.pending-item dd {
		margin: 0;
	}

	.pending-item dt {
		color: var(--text-soft);
		font-weight: 700;
	}

	@media (max-width: 920px) {
		.pending-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.pending-head,
		.pending-card {
			padding: 22px;
			border-radius: 22px;
		}

		.pending-head {
			flex-direction: column;
		}

		.pending-item dl div {
			grid-template-columns: 1fr;
			gap: 4px;
		}
	}
</style>
