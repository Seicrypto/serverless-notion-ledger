<script lang="ts">
	export interface UserInfoCardAction {
		ariaLabel: string;
		onClick: () => void;
	}

	export interface UserInfoCardItem {
		key: string;
		label: string;
		value: string;
		action?: UserInfoCardAction;
	}

	export interface UserInfoCardFooterLink {
		href: string;
		label: string;
	}

	export let eyebrow = '';
	export let title = '';
	export let intro = '';
	export let items: UserInfoCardItem[] = [];
	export let footerLink: UserInfoCardFooterLink | null = null;
	export let headingTag: 'h1' | 'h2' = 'h1';
</script>

<div class="user-info-card">
	{#if eyebrow}<p class="user-info-eyebrow">{eyebrow}</p>{/if}
	{#if title}<svelte:element this={headingTag}>{title}</svelte:element>{/if}
	{#if intro}<p class="user-info-intro">{intro}</p>{/if}

	<dl class="user-info-grid">
		{#each items as item (item.key)}
			<div class={`user-info-item ${item.action ? 'user-info-item-actionable' : ''}`}>
				<dt>{item.label}</dt>
				<dd>
					<span>{item.value}</span>
					{#if item.action}
						<button
							type="button"
							class="user-info-edit"
							aria-label={item.action.ariaLabel}
							on:click={item.action.onClick}
						>
							<svg viewBox="0 0 24 24" aria-hidden="true">
								<path d="M4 20h4l10-10-4-4L4 16v4Z" fill="currentColor"></path>
								<path d="m13 5 4 4" stroke="currentColor" stroke-width="1.5" fill="none"></path>
							</svg>
						</button>
					{/if}
				</dd>
			</div>
		{/each}
	</dl>

	{#if footerLink}
		<a class="user-info-footer-link" href={footerLink.href}>
			<span>{footerLink.label}</span>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M8 5l7 7-7 7"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
				></path>
			</svg>
		</a>
	{/if}
</div>

<style>
	.user-info-card {
		padding: 30px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.user-info-eyebrow,
	.user-info-item dt {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 68%, var(--text-soft));
	}

	.user-info-card h1 {
		margin: 12px 0 0;
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.03em;
	}

	.user-info-intro,
	.user-info-item dd {
		margin: 16px 0 0;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.user-info-grid {
		margin: 28px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.user-info-item {
		padding: 18px;
		border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 74%, white);
	}

	.user-info-item dd {
		margin: 10px 0 0;
		font-size: 1.02rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.user-info-item-actionable dd {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.user-info-edit {
		width: 38px;
		height: 38px;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			border-color 0.18s ease;
	}

	.user-info-edit:hover {
		transform: translateY(-1px);
		border-color: var(--line-strong);
	}

	.user-info-edit svg,
	.user-info-footer-link svg {
		width: 16px;
		height: 16px;
	}

	.user-info-footer-link {
		margin-top: 26px;
		min-height: 52px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 76%, white);
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-weight: 700;
	}

	@media (max-width: 720px) {
		.user-info-card {
			padding: 22px;
			border-radius: 22px;
		}

		.user-info-grid {
			grid-template-columns: 1fr;
		}

		.user-info-footer-link {
			width: 100%;
			justify-content: center;
		}
	}
</style>
