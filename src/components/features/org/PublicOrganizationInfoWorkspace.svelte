<script lang="ts">
	import { onMount } from 'svelte';

	import OrganizationCard from './OrganizationCard.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		createOrganizationCardResponse,
		type OrganizationCardResponse,
	} from '../../../libs/api/organizations/organization-card.ts';
	import { resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';

	interface Labels {
		title: string;
		intro: string;
		loadingLabel: string;
		errorTitle: string;
		missingOrgTitle: string;
		missingOrgBody: string;
		memberCountLabel: string;
		characterCountLabel: string;
		supportedOrgLabel: string;
		openOrgDashboardLabel: string;
		backToGuildsLabel: string;
	}

	export let lang: string;
	export let organization: string | null = null;
	export let labels: Labels;

	let loading = true;
	let errorMessage = '';
	let orgCard: OrganizationCardResponse | null = null;
	let resolvedOrganization: string | null = null;

	function toNullableString(value: unknown) {
		return typeof value === 'string' && value.trim() ? value : null;
	}

	async function loadOrganization(reference: string) {
		loading = true;
		errorMessage = '';

		try {
			const response = await getApiAdapter().getOrganization(reference);
			orgCard = createOrganizationCardResponse({
				id: response.organization.id,
				name: response.organization.name,
				description: toNullableString(response.organization.description),
				iconUrl: toNullableString(response.organization.iconUrl),
				vanity: toNullableString(response.organization.vanity),
				membership: null,
				stats: {
					memberCount: response.organization.activeMemberCount,
					characterCount: response.organization.activeCharacterCount,
				},
				games: response.organization.games.map((game) => ({
					name: game.gameName,
					iconUrl: toNullableString(game.iconUrl),
					primary: game.isPrimary,
				})),
				tags: [],
				display: {
					isSupportedOrg: false,
				},
			});
		} catch (error) {
			orgCard = null;
			errorMessage = error instanceof Error && error.message.trim() ? error.message : labels.errorTitle;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		resolvedOrganization = resolveOrganizationQuery(organization);

		if (!resolvedOrganization) {
			loading = false;
			return;
		}

		void loadOrganization(resolvedOrganization);
	});
</script>

<section class="org-info-shell">
	<div class="org-info-head">
		<h1>{labels.title}</h1>
		<p>{labels.intro}</p>
	</div>

	{#if loading}
		<section class="org-info-state">
			<h2>{labels.loadingLabel}</h2>
		</section>
	{:else if !resolvedOrganization}
		<section class="org-info-state">
			<h2>{labels.missingOrgTitle}</h2>
			<p>{labels.missingOrgBody}</p>
			<a class="org-info-back-link" href={`/${lang}/guilds`}>{labels.backToGuildsLabel}</a>
		</section>
	{:else if errorMessage}
		<section class="org-info-state">
			<h2>{labels.errorTitle}</h2>
			<p>{errorMessage}</p>
		</section>
	{:else if orgCard}
		<div class="org-card-grid">
			<OrganizationCard
				organization={orgCard}
				actions={[
					{
						label: labels.openOrgDashboardLabel,
						href: `/${lang}/guilds/dashboard?orgVanity=${encodeURIComponent(resolvedOrganization)}`,
						tone: 'primary',
					},
				]}
				labels={{
					members: labels.memberCountLabel,
					characters: labels.characterCountLabel,
					supportedOrg: labels.supportedOrgLabel,
				}}
			/>
		</div>
	{/if}
</section>

<style>
	.org-info-shell {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.org-info-head,
	.org-info-state {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.org-info-head h1,
	.org-info-state h2,
	.org-info-state p {
		margin: 0;
	}

	.org-info-head p,
	.org-info-state p {
		margin-top: 12px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.org-info-back-link {
		margin-top: 18px;
		min-height: 42px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	@media (max-width: 720px) {
		.org-info-head,
		.org-info-state {
			padding: 22px;
			border-radius: 22px;
		}
	}
</style>
