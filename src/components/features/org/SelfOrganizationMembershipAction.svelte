<script lang="ts">
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { refreshMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import {
		clearCachedOrganizationMembershipRecord,
		readCachedOrganizationMembershipRecord,
		writeCachedOrganizationMembershipRecord,
	} from '../../../libs/organizations/membership-record-cache.ts';

	interface Labels {
		leaveLabel: string;
		cancelLabel: string;
		processingLabel: string;
		errorTitle: string;
		resolveError: string;
	}

	export let lang: string;
	export let organization: string;
	export let membershipStatus: 'pending' | 'active' | null = null;
	export let labels: Labels;
	export let onCompleted: (() => void) | null = null;

	let session: AuthSession | null = null;
	let submitting = false;
	let errorMessage = '';

	$: isVisible = membershipStatus === 'pending' || membershipStatus === 'active';
	$: buttonLabel = membershipStatus === 'pending' ? labels.cancelLabel : labels.leaveLabel;

	async function resolveMemberId(userId: number) {
		if (typeof window !== 'undefined') {
			const cached = readCachedOrganizationMembershipRecord(window.localStorage, organization, userId);
			if (cached && (cached.status === membershipStatus || membershipStatus === 'active')) {
				return cached.memberId;
			}
		}

		const response = await getApiAdapter().listOrganizationMembers(organization);
		const matched = response.members.find(
			(member) => member.userId === userId && (!membershipStatus || member.status === membershipStatus),
		);
		if (!matched) {
			throw new Error(labels.resolveError);
		}

		if (typeof window !== 'undefined') {
			writeCachedOrganizationMembershipRecord(window.localStorage, {
				organization,
				userId,
				memberId: matched.id,
				status: matched.status,
			});
		}

		return matched.id;
	}

	async function handleAction() {
		if (!isVisible || submitting) {
			return;
		}

		session = await ensureAuthSession();
		if (!isAuthenticatedSession(session)) {
			window.location.href = `/${lang}/login`;
			return;
		}

		submitting = true;
		errorMessage = '';

		try {
			const memberId = await resolveMemberId(session.user.id);
			if (membershipStatus === 'pending') {
				await getApiAdapter().cancelOrganizationMember(organization, memberId);
			} else {
				await getApiAdapter().leaveOrganization(organization, memberId);
			}

			if (typeof window !== 'undefined') {
				clearCachedOrganizationMembershipRecord(window.localStorage, organization, session.user.id);
			}

			await refreshMyOrganizationsCache();
			onCompleted?.();
		} catch (error) {
			errorMessage = getErrorMessage(error, labels.errorTitle);
		} finally {
			submitting = false;
		}
	}
</script>

{#if isVisible}
	<div class="membership-action">
		<button
			type="button"
			class="membership-action-button"
			data-tone={membershipStatus === 'pending' ? 'secondary' : 'danger'}
			on:click={handleAction}
			disabled={submitting}
		>
			{submitting ? labels.processingLabel : buttonLabel}
		</button>
		{#if errorMessage}
			<p class="membership-action-error">{labels.errorTitle}: {errorMessage}</p>
		{/if}
	</div>
{/if}

<style>
	.membership-action {
		display: grid;
		gap: 8px;
	}

	.membership-action-button {
		min-height: 42px;
		padding: 0 16px;
		border-radius: 999px;
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

	.membership-action-button[data-tone='secondary'] {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		color: var(--text-main);
	}

	.membership-action-button[data-tone='danger'] {
		border: 1px solid color-mix(in srgb, #dc2626 42%, var(--line));
		background: color-mix(in srgb, #fee2e2 74%, white);
		color: #991b1b;
	}

	.membership-action-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.membership-action-button:disabled {
		cursor: progress;
		opacity: 0.78;
	}

	.membership-action-error {
		margin: 0;
		font-size: 0.84rem;
		line-height: 1.55;
		color: #b91c1c;
	}

	@media (max-width: 720px) {
		.membership-action-button {
			width: 100%;
		}
	}
</style>
