<script lang="ts">
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { refreshMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';

	interface Labels {
		applyLabel: string;
		applyingLabel: string;
		appliedLabel: string;
		errorTitle: string;
		loginLabel: string;
	}

	export let lang: string;
	export let organization: string;
	export let membershipStatus: 'pending' | 'active' | null = null;
	export let labels: Labels;
	export let onApplied: (() => void) | null = null;

	let session: AuthSession | null = null;
	let applying = false;
	let errorMessage = '';
	let localMembershipStatus: 'pending' | 'active' | null = membershipStatus;

	$: localMembershipStatus = membershipStatus ?? localMembershipStatus;
	$: isHidden = localMembershipStatus === 'pending' || localMembershipStatus === 'active';

	async function handleApply() {
		if (applying || isHidden) {
			return;
		}

		session = await ensureAuthSession();
		if (!isAuthenticatedSession(session)) {
			window.location.href = `/${lang}/login`;
			return;
		}

		applying = true;
		errorMessage = '';

		try {
			await getApiAdapter().applyToOrganization(organization, {});
			localMembershipStatus = 'pending';
			await refreshMyOrganizationsCache();
			onApplied?.();
		} catch (error) {
			errorMessage = getErrorMessage(error, labels.errorTitle);
		} finally {
			applying = false;
		}
	}
</script>

{#if !isHidden}
	<div class="apply-org-action">
		<button type="button" class="apply-org-button" on:click={handleApply} disabled={applying}>
			{applying ? labels.applyingLabel : labels.applyLabel}
		</button>
		{#if errorMessage}
			<p class="apply-org-error">{labels.errorTitle}: {errorMessage}</p>
		{/if}
	</div>
{/if}

<style>
	.apply-org-action {
		display: grid;
		gap: 8px;
	}

	.apply-org-button {
		min-height: 42px;
		padding: 0 16px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--ledger-accent) 45%, var(--line));
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--ledger-accent) 88%, white),
			color-mix(in srgb, var(--ledger-accent) 56%, white)
		);
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.92rem;
		font-weight: 700;
		white-space: nowrap;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease,
			opacity 0.18s ease;
	}

	.apply-org-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.apply-org-button:disabled {
		cursor: progress;
		opacity: 0.78;
	}

	.apply-org-error {
		margin: 0;
		font-size: 0.84rem;
		line-height: 1.55;
		color: #b91c1c;
	}

	@media (max-width: 720px) {
		.apply-org-button {
			width: 100%;
		}
	}
</style>
