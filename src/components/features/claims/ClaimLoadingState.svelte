<script lang="ts">
	import SoftSpinner from '../../shared/SoftSpinner.svelte';

	export let label: string;
</script>

<div class="claim-loading-state" role="status" aria-live="polite">
	<SoftSpinner size={34} label={label} />
	<p>{label}</p>
</div>

<style>
	.claim-loading-state {
		min-height: 112px;
		display: grid;
		place-items: center;
		gap: 12px;
		padding: 18px;
		border: 1px dashed var(--ui-control-border);
		border-radius: 20px;
		background: color-mix(in srgb, var(--ui-control-bg) 92%, transparent);
		text-align: center;
	}

	.claim-loading-state p {
		margin: 0;
		color: var(--text-soft);
	}
</style>
