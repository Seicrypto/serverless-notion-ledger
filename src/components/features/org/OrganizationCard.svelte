<script lang="ts">
	export interface OrganizationCardGame {
		name: string;
		primary?: boolean;
	}

	export interface OrganizationCardStat {
		label: string;
		value: string;
	}

	export let name: string;
	export let slug: string;
	export let description: string = '';
	export let href: string = '#';
	export let iconUrl: string | null = null;
	export let games: OrganizationCardGame[] = [];
	export let stats: OrganizationCardStat[] = [];
	export let membershipRole: string | null = null;
	export let membershipStatus: string | null = null;
	export let note: string | null = null;
	export let actionLabel: string = 'Open';

	$: initials = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('')
		.slice(0, 2);
</script>

<article class="org-card">
	<div class="org-card-top">
		<div class="org-card-brand">
			{#if iconUrl}
				<img class="org-card-avatar-image" src={iconUrl} alt="" loading="lazy" />
			{:else}
				<div class="org-card-avatar" aria-hidden="true">{initials || 'OG'}</div>
			{/if}

			<div class="org-card-copy">
				<p class="org-card-slug">/{slug}</p>
				<h3>{name}</h3>
			</div>
		</div>

		{#if membershipRole || membershipStatus}
			<div class="org-card-membership">
				{#if membershipRole}
					<span>{membershipRole}</span>
				{/if}
				{#if membershipStatus}
					<span data-quiet>{membershipStatus}</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if description}
		<p class="org-card-description">{description}</p>
	{/if}

	{#if games.length > 0}
		<div class="org-card-games">
			{#each games as game}
				<span class:primary={game.primary}>{game.name}</span>
			{/each}
		</div>
	{/if}

	{#if stats.length > 0}
		<dl class="org-card-stats">
			{#each stats as stat}
				<div>
					<dt>{stat.label}</dt>
					<dd>{stat.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}

	<div class="org-card-footer">
		{#if note}
			<p class="org-card-note">{note}</p>
		{/if}

		<a class="org-card-link" href={href}>{actionLabel}</a>
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
	.org-card-games span {
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

	.org-card-description,
	.org-card-note {
		margin: 0;
		line-height: 1.65;
		color: var(--text-soft);
	}

	.org-card-games {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.org-card-games span {
		background: color-mix(in srgb, var(--surface-soft) 88%, white);
		color: var(--text-main);
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
		grid-template-columns: repeat(3, minmax(0, 1fr));
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

	.org-card-footer {
		margin-top: auto;
		padding-top: 4px;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
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
			background 0.18s ease;
	}

	.org-card-link:hover {
		transform: translateY(-1px);
		border-color: var(--line-strong);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
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
			grid-template-columns: 1fr 1fr;
		}

		.org-card-link {
			width: 100%;
		}
	}
</style>
