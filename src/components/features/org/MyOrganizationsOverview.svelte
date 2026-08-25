<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import OrganizationCard from './OrganizationCard.svelte';
	import { ensureMyOrganizationsCache, refreshMyOrganizationsCache, subscribeMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import { ensureAuthSession, isAuthenticatedSession, subscribeAuthSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import { getErrorMessage } from '../../../libs/api/auth/session.ts';

	interface Labels {
		title: string;
		intro: string;
		loadingLabel: string;
		errorTitle: string;
		emptyTitle: string;
		emptyBody: string;
		viewOrgsLabel: string;
		createOrgLabel: string;
		openOrgLabel: string;
		memberCountLabel: string;
		characterCountLabel: string;
		supportedOrgLabel: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
	}

	export let lang: string;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let organizations: OrganizationCardResponse[] = [];
	let loading = true;
	let errorMessage = '';

	const loadOrganizations = async (forceRefresh = false) => {
		if (!isAuthenticatedSession(session)) {
			loading = false;
			organizations = [];
			return;
		}

		loading = true;
		errorMessage = '';

		try {
			const snapshot = forceRefresh ? await refreshMyOrganizationsCache() : await ensureMyOrganizationsCache();
			organizations = snapshot.organizations;
		} catch (error) {
			errorMessage = getErrorMessage(error, labels.errorTitle);
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		void ensureAuthSession().then((nextSession) => {
			session = nextSession;
			void loadOrganizations();
		});

		const unsubscribeSession = subscribeAuthSession((nextSession) => {
			session = nextSession;
			if (isAuthenticatedSession(nextSession)) {
				void loadOrganizations();
				return;
			}

			organizations = [];
			errorMessage = '';
			loading = false;
		});

		const unsubscribe = subscribeMyOrganizationsCache((snapshot) => {
			organizations = snapshot.organizations;
			loading = false;
			errorMessage = '';
		});

		return () => {
			unsubscribe();
			unsubscribeSession();
		};
	});
</script>

{#if !loading && !isAuthenticatedSession(session)}
	<AccessNoticeCard
		title={labels.authRequiredTitle}
		body={labels.authRequiredBody}
		primaryAction={{ label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' }}
		secondaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' }}
	/>
{:else}
	<section class="my-orgs-shell">
		<div class="my-orgs-head">
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
		</div>

		{#if loading}
			<section class="my-orgs-state">
				<h2>{labels.loadingLabel}</h2>
			</section>
		{:else if errorMessage}
			<section class="my-orgs-state">
				<h2>{labels.errorTitle}</h2>
				<p>{errorMessage}</p>
			</section>
		{:else if organizations.length === 0}
			<section class="my-orgs-state">
				<h2>{labels.emptyTitle}</h2>
				<p>{labels.emptyBody}</p>
				<div class="my-orgs-actions">
					<a class="my-orgs-action-primary" href={`/${lang}/orgs`}>
						{labels.viewOrgsLabel}
					</a>
					<a class="my-orgs-action-secondary" href={`/${lang}/orgs/new`}>
						{labels.createOrgLabel}
					</a>
				</div>
			</section>
		{:else}
			<div class="org-card-grid">
				{#each organizations as organization}
					<OrganizationCard
						organization={organization}
						href={`/${lang}/orgs/manage?orgVanity=${encodeURIComponent(organization.slug)}`}
						actionLabel={labels.openOrgLabel}
						labels={{
							members: labels.memberCountLabel,
							characters: labels.characterCountLabel,
							supportedOrg: labels.supportedOrgLabel,
						}}
					/>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.my-orgs-shell {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.my-orgs-head,
	.my-orgs-state {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.my-orgs-head h1,
	.my-orgs-state h2,
	.my-orgs-state p {
		margin: 0;
	}

	.my-orgs-head p,
	.my-orgs-state p {
		margin-top: 12px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.my-orgs-actions {
		margin-top: 22px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.my-orgs-action-primary,
	.my-orgs-action-secondary {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.my-orgs-action-primary {
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.my-orgs-action-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
	}

	@media (max-width: 720px) {
		.my-orgs-head,
		.my-orgs-state {
			padding: 22px;
			border-radius: 22px;
		}

		.my-orgs-actions {
			flex-direction: column;
		}
	}
</style>
