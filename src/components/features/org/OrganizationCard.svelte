<script lang="ts">
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import {
		DEFAULT_ORGANIZATION_CARD_DISPLAY,
		ORGANIZATION_CARD_UI_LIMITS,
	} from '../../../libs/api/organizations/organization-card.ts';

	interface PropsLabels {
		members: string;
		characters: string;
		supportedOrg: string;
	}

	interface ActionLink {
		label: string;
		href: string;
		tone?: 'primary' | 'secondary';
	}

	export let organization: OrganizationCardResponse;
	export let href: string = '#';
	export let actionLabel: string = 'Open';
	export let actions: ActionLink[] = [];
	export let labels: PropsLabels = {
		members: 'Members',
		characters: 'Characters',
		supportedOrg: 'Supported org',
	};

	const MEMBERSHIP_ROLE_LABELS = {
		owner: 'Owner',
		admin: 'Admin',
		member: 'Member',
	} as const;

	const MEMBERSHIP_STATUS_LABELS = {
		pending: 'Pending',
		active: 'Joined',
	} as const;

	$: initials = organization.name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('')
		.slice(0, 2);

	$: display = {
		...DEFAULT_ORGANIZATION_CARD_DISPLAY,
		...organization.display,
	};

	$: visibleGames = organization.games.slice(
		0,
		Math.min(display.maxVisibleGames, ORGANIZATION_CARD_UI_LIMITS.maxVisibleGames),
	);
	$: hiddenGamesCount = Math.max(0, organization.games.length - visibleGames.length);
	$: visibleTags = organization.tags.slice(
		0,
		Math.min(display.maxVisibleTags, ORGANIZATION_CARD_UI_LIMITS.maxVisibleTags),
	);
	$: hiddenTagsCount = Math.max(0, organization.tags.length - visibleTags.length);
	$: membershipRoleLabel = organization.membership?.role
		? MEMBERSHIP_ROLE_LABELS[organization.membership.role]
		: null;
	$: membershipStatusLabel = organization.membership?.status
		? MEMBERSHIP_STATUS_LABELS[organization.membership.status]
		: null;
	$: resolvedActions =
		actions.length > 0
			? actions
			: [{ label: actionLabel, href, tone: 'secondary' as const }];
</script>

<article class="org-card" data-supported={display.isSupportedOrg ? 'true' : 'false'}>
	<div class="org-card-top">
		<div class="org-card-brand">
			{#if organization.iconUrl}
				<img class="org-card-avatar-image" src={organization.iconUrl} alt="" loading="lazy" />
			{:else}
				<div class="org-card-avatar" aria-hidden="true">{initials || 'OG'}</div>
			{/if}

			<div class="org-card-copy">
				{#if organization.vanity}
					<p class="org-card-slug">@{organization.vanity}</p>
				{/if}
				<h3>{organization.name}</h3>
			</div>
		</div>

		{#if membershipRoleLabel || membershipStatusLabel}
			<div class="org-card-membership">
				{#if membershipRoleLabel}
					<span>{membershipRoleLabel}</span>
				{/if}
				{#if membershipStatusLabel}
					<span data-quiet>{membershipStatusLabel}</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if organization.description}
		<p class="org-card-description">{organization.description}</p>
	{/if}

	{#if visibleGames.length > 0}
		<div class="org-card-games">
			{#each visibleGames as game}
				<span class:primary={game.primary}>
					{#if game.iconUrl}
						<img src={game.iconUrl} alt="" width="16" height="16" loading="lazy" />
					{/if}
					<em>{game.name}</em>
				</span>
			{/each}
			{#if hiddenGamesCount > 0}
				<span>+{hiddenGamesCount}</span>
			{/if}
		</div>
	{/if}

	{#if visibleTags.length > 0 || hiddenTagsCount > 0}
		<div class="org-card-tags">
			{#each visibleTags as tag}
				<span>{tag}</span>
			{/each}
			{#if hiddenTagsCount > 0}
				<span>+{hiddenTagsCount}</span>
			{/if}
		</div>
	{/if}

	<dl class="org-card-stats">
		<div>
			<dt>{labels.members}</dt>
			<dd>{organization.stats.memberCount}</dd>
		</div>
		<div>
			<dt>{labels.characters}</dt>
			<dd>{organization.stats.characterCount}</dd>
		</div>
	</dl>

	{#if display.isSupportedOrg}
		<p class="org-card-support">{labels.supportedOrg}</p>
	{/if}

	<div class="org-card-footer">
		{#each resolvedActions as action}
			<a
				class:org-card-link-primary={action.tone === 'primary'}
				class:org-card-link-secondary={action.tone !== 'primary'}
				class="org-card-link"
				href={action.href}
			>
				{action.label}
			</a>
		{/each}
	</div>
</article>

<style>
	.org-card {
		height: 100%;
		padding: 24px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 24px;
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 10%, transparent), transparent 32%),
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white) 0%, var(--surface-strong) 100%);
		box-shadow: var(--shadow);
		display: grid;
		gap: 18px;
	}

	.org-card[data-supported='true'] {
		border-color: color-mix(in srgb, var(--accent) 34%, white);
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent),
			var(--shadow);
	}

	.org-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.org-card-brand {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.org-card-avatar,
	.org-card-avatar-image {
		width: 58px;
		height: 58px;
		border-radius: 18px;
		flex: 0 0 auto;
	}

	.org-card-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 54%, white) 100%);
		color: white;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.org-card-avatar-image {
		object-fit: cover;
	}

	.org-card-copy {
		min-width: 0;
	}

	.org-card-slug {
		margin: 0;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 72%, var(--text-soft));
	}

	.org-card-copy h3 {
		margin: 6px 0 0;
		font-size: 1.22rem;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.org-card-membership {
		display: inline-flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 8px;
	}

	.org-card-membership span,
	.org-card-games span,
	.org-card-tags span {
		min-height: 30px;
		padding: 0 12px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.82rem;
		font-weight: 700;
	}

	.org-card-membership span {
		background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
		color: var(--accent-deep);
	}

	.org-card-membership span[data-quiet] {
		background: color-mix(in srgb, var(--surface-soft) 84%, white);
		color: var(--text-soft);
	}

	.org-card-description {
		margin: 0;
		line-height: 1.65;
		color: var(--text-soft);
	}

	.org-card-games,
	.org-card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.org-card-games span,
	.org-card-tags span {
		background: color-mix(in srgb, var(--surface-soft) 88%, white);
		color: var(--text-main);
	}

	.org-card-games span {
		gap: 8px;
	}

	.org-card-games img {
		width: 16px;
		height: 16px;
		border-radius: 999px;
		object-fit: cover;
	}

	.org-card-games em {
		font-style: normal;
	}

	.org-card-games span.primary {
		background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
		color: var(--accent-deep);
	}

	.org-card-stats {
		margin: 0;
		padding: 16px 0 0;
		border-top: 1px solid color-mix(in srgb, var(--line) 72%, transparent);
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
	}

	.org-card-stats div {
		min-width: 0;
	}

	.org-card-stats dt {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.org-card-stats dd {
		margin: 8px 0 0;
		font-size: 1.02rem;
		font-weight: 800;
		color: var(--text-main);
	}

	.org-card-support {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-deep);
	}

	.org-card-footer {
		margin-top: auto;
		padding-top: 8px;
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 16px;
	}

	.org-card-link {
		min-height: 42px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.92rem;
		font-weight: 700;
		white-space: nowrap;
		transition:
			transform 0.18s ease,
			border-color 0.18s ease,
			background 0.18s ease,
			box-shadow 0.18s ease,
			color 0.18s ease;
	}

	.org-card-link-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
	}

	.org-card-link-primary {
		border: 1px solid color-mix(in srgb, #2563eb 78%, white);
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		box-shadow: 0 16px 30px -22px rgba(37, 99, 235, 0.95);
	}

	.org-card-link:hover {
		transform: translateY(-1px);
	}

	.org-card-link-secondary:hover {
		border-color: var(--line-strong);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
	}

	.org-card-link-primary:hover {
		border-color: color-mix(in srgb, #1d4ed8 82%, white);
		background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
		box-shadow: 0 20px 32px -22px rgba(29, 78, 216, 1);
	}

	@media (max-width: 720px) {
		.org-card {
			padding: 20px;
		}

		.org-card-top,
		.org-card-footer {
			flex-direction: column;
			align-items: stretch;
		}

		.org-card-membership {
			justify-content: flex-start;
		}

		.org-card-stats {
			grid-template-columns: 1fr;
		}

		.org-card-link {
			width: 100%;
		}
	}
</style>
