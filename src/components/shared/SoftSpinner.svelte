<script lang="ts">
	export let size = 32;
	export let tone: 'accent' | 'muted' = 'accent';
	export let label = 'Loading';

	const dotCount = 8;
</script>

<div
	class="soft-spinner"
	class:tone-muted={tone === 'muted'}
	style={`--soft-spinner-size:${size}px;`}
	role="status"
	aria-label={label}
>
	{#each Array.from({ length: dotCount }) as _, index}
		<span class="soft-spinner-dot" style={`--soft-spinner-index:${index};`} aria-hidden="true"></span>
	{/each}
</div>

<style>
	.soft-spinner {
		--soft-spinner-dot-size: calc(var(--soft-spinner-size) * 0.16);
		position: relative;
		width: var(--soft-spinner-size);
		height: var(--soft-spinner-size);
		display: inline-block;
		color: color-mix(in srgb, var(--accent) 88%, white);
	}

	.soft-spinner.tone-muted {
		color: color-mix(in srgb, var(--text-soft) 78%, var(--accent));
	}

	.soft-spinner-dot {
		position: absolute;
		top: 50%;
		left: 50%;
		width: var(--soft-spinner-dot-size);
		height: var(--soft-spinner-dot-size);
		margin: calc(var(--soft-spinner-dot-size) * -0.5);
		border-radius: 999px;
		background: currentColor;
		transform:
			rotate(calc(var(--soft-spinner-index) * 45deg))
			translateY(calc(var(--soft-spinner-size) * -0.42));
		animation: soft-spinner-pulse 0.9s linear infinite;
		animation-delay: calc(var(--soft-spinner-index) * -0.1125s);
		opacity: 0.18;
	}

	@keyframes soft-spinner-pulse {
		0%,
		100% {
			opacity: 0.18;
			filter: saturate(0.9);
		}

		45% {
			opacity: 1;
			filter: saturate(1.05);
		}
	}
</style>
