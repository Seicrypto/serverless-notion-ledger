<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import { ensureAuthSession, isAuthenticatedSession, subscribeAuthSession, type AuthSession } from '../../../libs/api/auth/session.ts';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		loadingLabel: string;
		loginRequiredTitle: string;
		loginRequiredBody: string;
		staffOnlyTitle: string;
		staffOnlyBody: string;
		loginLabel: string;
		homeLabel: string;
		disabledUsersPanelLabel: string;
		disabledUsersPanelTitle: string;
		disabledUsersPanelBody: string;
		openDisabledUsersLabel: string;
		userProfilePanelLabel: string;
		userProfilePanelTitle: string;
		userProfilePanelBody: string;
		openUserProfileLabel: string;
	}

	export let lang: string;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;

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
	<section class="official-dashboard">
		<div class="official-head">
			<p class="official-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
		</div>

		<div class="official-grid">
			<article class="official-panel">
				<p class="official-panel-label">{labels.disabledUsersPanelLabel}</p>
				<h2>{labels.disabledUsersPanelTitle}</h2>
				<p>{labels.disabledUsersPanelBody}</p>
				<a class="official-panel-action" href={`/${lang}/official/disabled-users`}>
					{labels.openDisabledUsersLabel}
				</a>
			</article>

			<article class="official-panel">
				<p class="official-panel-label">{labels.userProfilePanelLabel}</p>
				<h2>{labels.userProfilePanelTitle}</h2>
				<p>{labels.userProfilePanelBody}</p>
				<a class="official-panel-action" href={`/${lang}/official/users`}>
					{labels.openUserProfileLabel}
				</a>
			</article>
		</div>
	</section>
{/if}

<style>
	.official-dashboard {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.official-head,
	.official-panel {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.official-eyebrow,
	.official-panel-label {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.official-head h1,
	.official-head p,
	.official-panel h2,
	.official-panel p {
		margin: 0;
	}

	.official-head h1,
	.official-panel h2 {
		margin-top: 12px;
	}

	.official-head p,
	.official-panel p {
		margin-top: 14px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.official-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 18px;
	}

	.official-panel-action {
		margin-top: 20px;
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		background: var(--text-main);
		color: var(--surface-strong);
	}

	@media (max-width: 720px) {
		.official-head,
		.official-panel {
			padding: 22px;
			border-radius: 22px;
		}
	}
</style>
