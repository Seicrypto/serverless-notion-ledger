<script lang="ts">
	export interface NoticeAction {
		label: string;
		href: string;
		variant?: 'primary' | 'secondary';
	}

	export let eyebrow = '';
	export let title: string;
	export let body: string;
	export let primaryAction: NoticeAction | null = null;
	export let secondaryAction: NoticeAction | null = null;
</script>

<section class="access-notice">
	{#if eyebrow}<p class="access-notice-eyebrow">{eyebrow}</p>{/if}
	<h1>{title}</h1>
	<p>{body}</p>

	{#if primaryAction || secondaryAction}
		<div class="access-notice-actions">
			{#if secondaryAction}
				<a class="access-notice-action access-notice-action-secondary" href={secondaryAction.href}>
					{secondaryAction.label}
				</a>
			{/if}
			{#if primaryAction}
				<a class="access-notice-action access-notice-action-primary" href={primaryAction.href}>
					{primaryAction.label}
				</a>
			{/if}
		</div>
	{/if}
</section>

<style>
	.access-notice {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.access-notice-eyebrow {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.access-notice h1,
	.access-notice p {
		margin: 0;
	}

	.access-notice h1 {
		margin-top: 12px;
		font-size: clamp(1.8rem, 4vw, 2.6rem);
		letter-spacing: -0.03em;
	}

	.access-notice p {
		margin-top: 14px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.access-notice-actions {
		margin-top: 22px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.access-notice-action {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.access-notice-action-primary {
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.access-notice-action-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
		color: var(--text-main);
	}

	@media (max-width: 720px) {
		.access-notice {
			padding: 22px;
			border-radius: 22px;
		}

		.access-notice-actions {
			flex-direction: column-reverse;
		}
	}
</style>
