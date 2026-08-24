<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import { ensureAuthSession, isAuthenticatedSession, subscribeAuthSession, type AuthSession } from '../../../libs/api/auth/session.ts';

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		loadingLabel: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
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
		title={labels.authRequiredTitle}
		body={labels.authRequiredBody}
		primaryAction={{ label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' }}
		secondaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' }}
	/>
{:else}
	<AccessNoticeCard eyebrow={labels.eyebrow} title={labels.title} body={labels.intro} />
{/if}
