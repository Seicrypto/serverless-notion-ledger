<script lang="ts">
	import { onMount } from 'svelte';

	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import GuildOptionPicker from '../../shared/GuildOptionPicker.svelte';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import { ensureMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import type { OrganizationCardResponse } from '../../../libs/api/organizations/organization-card.ts';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { getOrganizationRecentEventCreations, loadRecentEventCreations, type RecentEventCreationEntry } from '../../../libs/events/recent-event-creations.ts';
	import { getOrganizationReference } from '../../../libs/organizations/reference.ts';
	import { getLatestActiveOrganization, readPreferredOrganization, writePreferredOrganization } from '../../../libs/ledger/workspace-preferences.ts';
	import type { LedgerEvent } from '../../../libs/api/openapi/generated/schema';

	interface Labels {
		title: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
		loadErrorTitle: string;
		noOrganizationsTitle: string;
		noOrganizationsBody: string;
		findOrganizationsLabel: string;
		organizationLabel: string;
		organizationCurrentPrefix: string;
		organizationStatsMembers: string;
		organizationStatsCharacters: string;
		eventCardEyebrow: string;
		eventCardTitle: string;
		eventCardBody: string;
		eventCreateLabel: string;
		eventDuplicateLabel: string;
		eventDuplicateEmpty: string;
		eventDuplicateSelectLabel: string;
		eventDuplicateMetaPrefix: string;
		settlementCardEyebrow: string;
		settlementCardTitle: string;
		settlementCardBody: string;
		settlementCreateLabel: string;
		settlementQuickLabel: string;
		settlementQuickEmpty: string;
		settlementQuickSelectLabel: string;
		settlementLoadingLabel: string;
		claimCardEyebrow: string;
		claimCardTitle: string;
		claimCardBody: string;
		claimOpenLabel: string;
		yesterdayPrefix: string;
	}

	export let lang: string;
	export let initialOrganization: string | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let organizations: OrganizationCardResponse[] = [];
	let selectedOrganization = '';
	let settleableEvents: LedgerEvent[] = [];
	let settleableLoading = false;
	let settleableError = '';
	let recentEventEntries: RecentEventCreationEntry[] = [];
	let selectedRecentEventId = '';
	let selectedSettleableEventId = '';
	let pageError = '';

	let dialogOpen = false;
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' } | null = null;
	let dialogSecondaryAction: { label: string; href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' } | null = null;

	function findOrganizationByReference(reference: string) {
		return organizations.find((organization) => getOrganizationReference(organization) === reference) ?? null;
	}

	function closeDialog() {
		dialogOpen = false;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
	}

	function openLoginDialog() {
		dialogOpen = true;
		dialogTitle = labels.authRequiredTitle;
		dialogMessage = labels.authRequiredBody;
		dialogPrimaryAction = { label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' };
		dialogSecondaryAction = { label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' };
	}

	function openNoOrganizationsDialog() {
		dialogOpen = true;
		dialogTitle = labels.noOrganizationsTitle;
		dialogMessage = labels.noOrganizationsBody;
		dialogPrimaryAction = { label: labels.findOrganizationsLabel, href: `/${lang}/guilds`, variant: 'primary' };
		dialogSecondaryAction = { label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' };
	}

	function formatRecentEntryLabel(entry: RecentEventCreationEntry) {
		const createdAtDate = new Date(entry.createdAt);
		const now = new Date();
		const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const createdDay = new Date(
			createdAtDate.getFullYear(),
			createdAtDate.getMonth(),
			createdAtDate.getDate(),
		);
		const dayDiff = Math.round((currentDay.getTime() - createdDay.getTime()) / (24 * 60 * 60 * 1000));
		const timeLabel = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit',
		}).format(createdAtDate);
		const prefix = dayDiff === 1 ? `${labels.yesterdayPrefix} ` : '';
		return `${entry.payload.title} · ${prefix}${timeLabel}`;
	}

	function formatEventLabel(event: LedgerEvent) {
		const timeLabel = new Intl.DateTimeFormat(undefined, {
			month: 'numeric',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(event.occurredAt));
		return `${event.title} · ${timeLabel}`;
	}

	function getSelectedOrganizationCard() {
		return findOrganizationByReference(selectedOrganization);
	}

	function refreshRecentEvents() {
		if (typeof window === 'undefined' || !selectedOrganization) {
			recentEventEntries = [];
			selectedRecentEventId = '';
			return;
		}

		recentEventEntries = getOrganizationRecentEventCreations(
			loadRecentEventCreations(window.localStorage),
			selectedOrganization,
		);
		selectedRecentEventId = recentEventEntries[0]?.id ?? '';
	}

	async function loadSettleableEvents() {
		if (!selectedOrganization) {
			settleableEvents = [];
			selectedSettleableEventId = '';
			return;
		}

		settleableLoading = true;
		settleableError = '';

		try {
			const response = await getApiAdapter().listOrganizationLedgerEvents(selectedOrganization, {
				statusGroup: 'settleable',
				limit: 24,
				sortBy: 'occurredAt',
				sortOrder: 'desc',
			});
			settleableEvents = response.events;
			selectedSettleableEventId = response.events[0] ? String(response.events[0].id) : '';
		} catch (error) {
			settleableError = getErrorMessage(error, labels.loadErrorTitle);
		} finally {
			settleableLoading = false;
		}
	}

	async function initializeOrganizations() {
		const snapshot = await ensureMyOrganizationsCache();
		organizations = snapshot.organizations;

		if (!organizations.length) {
			openNoOrganizationsDialog();
			return;
		}

		const recentOrganization =
			typeof window !== 'undefined'
				? getLatestActiveOrganization(window.localStorage, window.sessionStorage)
				: null;
		const preferredOrganization =
			typeof window !== 'undefined' ? readPreferredOrganization(window.localStorage) : null;
		const normalizedInitialOrganization = initialOrganization
			? findOrganizationByReference(initialOrganization)
			: null;
		const normalizedRecentOrganization = recentOrganization
			? findOrganizationByReference(recentOrganization)
			: null;
		const normalizedPreferredOrganization = preferredOrganization
			? findOrganizationByReference(preferredOrganization)
			: null;
		const nextOrganization =
			(normalizedInitialOrganization && getOrganizationReference(normalizedInitialOrganization)) ||
			(normalizedRecentOrganization && getOrganizationReference(normalizedRecentOrganization)) ||
			(normalizedPreferredOrganization && getOrganizationReference(normalizedPreferredOrganization)) ||
			(organizations[0] && getOrganizationReference(organizations[0])) ||
			'';

		selectedOrganization = nextOrganization;
		await syncOrganizationContext();
	}

	async function syncOrganizationContext() {
		if (!selectedOrganization || typeof window === 'undefined') {
			return;
		}

		writePreferredOrganization(window.localStorage, selectedOrganization);
		refreshRecentEvents();
		await loadSettleableEvents();

		const url = new URL(window.location.href);
		url.searchParams.set('orgVanity', selectedOrganization);
		window.history.replaceState({}, '', url);
	}

	function handleOrganizationChange(event: CustomEvent<{ value: string }>) {
		selectedOrganization = event.detail.value;
		void syncOrganizationContext();
	}

	$: selectedOrganizationCard = getSelectedOrganizationCard();
	$: organizationOptions = organizations.map((organization) => ({
		value: getOrganizationReference(organization),
		label: organization.name,
		metaLabel: organization.vanity ? `@${organization.vanity}` : `${organization.stats.memberCount} members`,
		iconUrl: organization.iconUrl,
	}));
	$: eventCreateHref = selectedOrganization ? `/${lang}/guilds/events/new?orgVanity=${encodeURIComponent(selectedOrganization)}` : `/${lang}/login`;
	$: eventDuplicateHref =
		selectedOrganization && selectedRecentEventId
			? `/${lang}/guilds/events/new?orgVanity=${encodeURIComponent(selectedOrganization)}&quickCreateId=${encodeURIComponent(selectedRecentEventId)}`
			: eventCreateHref;
	$: settlementCreateHref = selectedOrganization
		? `/${lang}/guilds/settlements/new?orgVanity=${encodeURIComponent(selectedOrganization)}`
		: `/${lang}/login`;
	$: settlementQuickHref =
		selectedOrganization && selectedSettleableEventId
			? `/${lang}/guilds/settlements/new?orgVanity=${encodeURIComponent(selectedOrganization)}&eventId=${encodeURIComponent(selectedSettleableEventId)}`
			: settlementCreateHref;
	$: claimHref = selectedOrganization
		? `/${lang}/guilds/claim?orgVanity=${encodeURIComponent(selectedOrganization)}`
		: `/${lang}/login`;

	onMount(() => {
		void ensureAuthSession().then(async (nextSession) => {
			session = nextSession;
			if (!isAuthenticatedSession(nextSession)) {
				openLoginDialog();
				return;
			}

			try {
				await initializeOrganizations();
			} catch (error) {
				pageError = getErrorMessage(error, labels.loadErrorTitle);
			}
		});
	});
</script>

<section class="app-section">
	<article class="workspace-card ledger-context-card">
		<div class="ledger-context-head">
			<div class="ledger-context-copy">
				<h1>{labels.title}</h1>
				{#if selectedOrganizationCard}
					<p class="ledger-context-current">
						{labels.organizationCurrentPrefix}
						<strong>{selectedOrganizationCard.name}</strong>
					</p>
				{:else}
					<p class="ledger-context-current">{labels.organizationCurrentPrefix}</p>
				{/if}
			</div>
			{#if selectedOrganizationCard}
				<p class="ledger-context-stats">
					{labels.organizationStatsMembers}: {selectedOrganizationCard.stats.memberCount}
					<span aria-hidden="true"> · </span>
					{labels.organizationStatsCharacters}: {selectedOrganizationCard.stats.characterCount}
				</p>
			{/if}
		</div>

		{#if pageError}
			<p class="workspace-error">{pageError}</p>
		{:else if !isAuthenticatedSession(session)}
			<p class="workspace-meta">{labels.authRequiredBody}</p>
		{:else if !organizations.length}
			<p class="workspace-meta">{labels.noOrganizationsBody}</p>
		{:else}
			<label class="workspace-field ledger-context-field">
				<span>{labels.organizationLabel}</span>
				<GuildOptionPicker
					value={selectedOrganization}
					ariaLabel={labels.organizationLabel}
					placeholder={labels.organizationLabel}
					searchPlaceholder={labels.organizationLabel}
					emptyLabel={labels.noOrganizationsBody}
					items={organizationOptions}
					on:change={handleOrganizationChange}
				/>
			</label>
		{/if}
	</article>
</section>

<section class="app-section ledger-grid">
	<article class="workspace-card ledger-card">
		<p class="app-card-label">{labels.eventCardEyebrow}</p>
		<h2>{labels.eventCardTitle}</h2>
		<p>{labels.eventCardBody}</p>

		<div class="card-actions">
			<a class="primary-action" href={eventCreateHref}>{labels.eventCreateLabel}</a>
			<a class="secondary-action" href={eventDuplicateHref}>{labels.eventDuplicateLabel}</a>
		</div>

		{#if recentEventEntries.length > 0}
			<label class="workspace-field">
				<span>{labels.eventDuplicateSelectLabel}</span>
				<select bind:value={selectedRecentEventId}>
					{#each recentEventEntries as entry}
						<option value={entry.id}>{formatRecentEntryLabel(entry)}</option>
					{/each}
				</select>
			</label>
			<p class="workspace-meta">
				{labels.eventDuplicateMetaPrefix}: {formatRecentEntryLabel(recentEventEntries[0])}
			</p>
		{:else}
			<p class="workspace-meta">{labels.eventDuplicateEmpty}</p>
		{/if}
	</article>

	<article class="workspace-card ledger-card">
		<p class="app-card-label">{labels.settlementCardEyebrow}</p>
		<h2>{labels.settlementCardTitle}</h2>
		<p>{labels.settlementCardBody}</p>

		<div class="card-actions">
			<a class="primary-action" href={settlementCreateHref}>{labels.settlementCreateLabel}</a>
			<a class="secondary-action" href={settlementQuickHref}>{labels.settlementQuickLabel}</a>
		</div>

		{#if settleableLoading}
			<p class="workspace-meta">{labels.settlementLoadingLabel}</p>
		{:else if settleableError}
			<p class="workspace-error">{settleableError}</p>
		{:else if settleableEvents.length > 0}
			<label class="workspace-field">
				<span>{labels.settlementQuickSelectLabel}</span>
				<select bind:value={selectedSettleableEventId}>
					{#each settleableEvents as event}
						<option value={event.id}>{formatEventLabel(event)}</option>
					{/each}
				</select>
			</label>
		{:else}
			<p class="workspace-meta">{labels.settlementQuickEmpty}</p>
		{/if}
	</article>

	<article class="workspace-card ledger-card">
		<p class="app-card-label">{labels.claimCardEyebrow}</p>
		<h2>{labels.claimCardTitle}</h2>
		<p>{labels.claimCardBody}</p>

		<div class="card-actions">
			<a class="primary-action" href={claimHref}>{labels.claimOpenLabel}</a>
		</div>
	</article>
</section>

<RequestStatusDialog
	open={dialogOpen}
	state="success"
	title={dialogTitle}
	message={dialogMessage}
	primaryAction={dialogPrimaryAction}
	secondaryAction={dialogSecondaryAction}
	onClose={closeDialog}
/>

<style>
	.workspace-card {
		padding: 24px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 16px;
	}

	.ledger-context-card {
		gap: 14px;
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--ledger-accent) 12%, transparent), transparent 38%),
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 94%, white), var(--surface));
	}

	.ledger-context-head {
		display: flex;
		align-items: end;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	.ledger-context-copy h1,
	.ledger-card h2 {
		margin: 0;
		letter-spacing: -0.03em;
	}

	.ledger-context-copy {
		display: grid;
		gap: 8px;
	}

	.ledger-context-current,
	.ledger-context-stats,
	.workspace-meta,
	.ledger-card p,
	.workspace-error {
		margin: 0;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.workspace-error {
		color: #c43c3c;
	}

	.ledger-context-current strong {
		color: var(--text-main);
	}

	.ledger-context-stats {
		font-size: 0.95rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.workspace-field {
		display: grid;
		gap: 8px;
	}

	.workspace-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.ledger-context-field {
		margin-top: 2px;
	}

	.ledger-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 20px;
	}

	.ledger-card {
		align-content: start;
	}

	.card-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.primary-action,
	.secondary-action {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.primary-action {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--ledger-accent) 88%, white),
			color-mix(in srgb, var(--ledger-accent) 56%, white)
		);
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
		border: 1px solid color-mix(in srgb, var(--ledger-accent) 45%, var(--line));
	}

	.secondary-action {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
	}

	.primary-action:hover,
	.secondary-action:hover {
		transform: translateY(-1px);
	}

	@media (max-width: 980px) {
		.ledger-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.workspace-card {
			padding: 20px;
			border-radius: 22px;
		}

		.ledger-context-stats {
			white-space: normal;
		}
	}
</style>
