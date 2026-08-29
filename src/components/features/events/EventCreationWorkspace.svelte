<script lang="ts">
	import { onMount } from 'svelte';

	import RequestStatusDialog from '../org/RequestStatusDialog.svelte';
	import GamePicker from '../../shared/GamePicker.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { getErrorMessage } from '../../../libs/api/auth/session.ts';
	import {
		getOrganizationRecentEventCreations,
		loadRecentEventCreations,
		recordRecentEventCreations,
		type RecentEventCreationEntry,
	} from '../../../libs/events/recent-event-creations.ts';
	import { resolveOrganizationQuery } from '../../../libs/organizations/reference.ts';
	import type { CreateLedgerEventRequest } from '../../../libs/api/openapi/generated/schema';

	interface GameOption {
		id: number;
		name: string;
		iconUrl: string | null;
		officialSiteUrl: string | null;
		resolvedIconUrl: string | null;
	}

	interface AssetInputRow {
		id: string;
		value: string;
	}

	interface Labels {
		eyebrow: string;
		title: string;
		intro: string;
		sessionTitle: string;
		sessionBody: string;
		sessionCountLabel: string;
		quickCreateLabel: string;
		quickCreateEmpty: string;
		quickCreateTitle: string;
		quickCreateBody: string;
		quickCreateSelectLabel: string;
		quickCreateConfirmLabel: string;
		quickCreateCancelLabel: string;
		quickCreateCloseLabel: string;
		quickCreateDefaultPrefix: string;
		yesterdayPrefix: string;
		orgRequiredTitle: string;
		orgRequiredBody: string;
		titleLabel: string;
		titlePlaceholder: string;
		occurredAtLabel: string;
		eventTypeLabel: string;
		sourceTypeLabel: string;
		gameIdLabel: string;
		gameOptionalHint: string;
		holderTypeLabel: string;
		holderRefLabel: string;
		holderRefPlaceholder: string;
		notesLabel: string;
		notesPlaceholder: string;
		assetSectionLabel: string;
		assetSectionBody: string;
		assetIdLabel: string;
		assetIdPlaceholder: string;
		addAssetLabel: string;
		removeAssetLabel: string;
		submitLabel: string;
		requiredHint: string;
		optionalHint: string;
		validationRequired: string;
		validationDate: string;
		validationNumber: string;
		loadingGames: string;
		eventTypeLoot: string;
		eventTypeRaid: string;
		eventTypeActivity: string;
		eventTypeBonus: string;
		eventTypeSalary: string;
		eventTypeGuildEvent: string;
		eventTypeOther: string;
		sourceTypeManual: string;
		sourceTypeApi: string;
		sourceTypeImport: string;
		holderTypeCharacter: string;
		holderTypeOrgTreasury: string;
		holderTypeMarket: string;
		holderTypeExternal: string;
		holderTypeCustom: string;
		loadingCreateTitle: string;
		loadingCreateSingleBody: string;
		loadingCreateBatchPrefix: string;
		errorCreateTitle: string;
		errorTimeoutBody: string;
		errorRetryLabel: string;
		errorPartialPrefix: string;
		successCreateTitle: string;
		successCreateSingleBody: string;
		successCreateBatchPrefix: string;
		successCreateSuffix: string;
		successCloseLabel: string;
	}

	type FieldErrors = Record<string, string>;
	type EventType = NonNullable<CreateLedgerEventRequest['eventType']>;
	type SourceType = NonNullable<CreateLedgerEventRequest['sourceType']>;
	type HolderType = NonNullable<CreateLedgerEventRequest['holderType']>;

	const CREATE_TIMEOUT_MS = 20000;

	const eventTypeOptions: Array<{ value: EventType; labelKey: keyof Labels }> = [
		{ value: 'loot', labelKey: 'eventTypeLoot' },
		{ value: 'raid', labelKey: 'eventTypeRaid' },
		{ value: 'activity', labelKey: 'eventTypeActivity' },
		{ value: 'bonus', labelKey: 'eventTypeBonus' },
		{ value: 'salary', labelKey: 'eventTypeSalary' },
		{ value: 'guild_event', labelKey: 'eventTypeGuildEvent' },
		{ value: 'other', labelKey: 'eventTypeOther' },
	];

	const sourceTypeOptions: Array<{ value: SourceType; labelKey: keyof Labels }> = [
		{ value: 'manual', labelKey: 'sourceTypeManual' },
		{ value: 'api', labelKey: 'sourceTypeApi' },
		{ value: 'import', labelKey: 'sourceTypeImport' },
	];

	const holderTypeOptions: Array<{ value: HolderType; labelKey: keyof Labels }> = [
		{ value: 'character', labelKey: 'holderTypeCharacter' },
		{ value: 'org_treasury', labelKey: 'holderTypeOrgTreasury' },
		{ value: 'market', labelKey: 'holderTypeMarket' },
		{ value: 'external', labelKey: 'holderTypeExternal' },
		{ value: 'custom', labelKey: 'holderTypeCustom' },
	];

	export let organization: string | null = null;
	export let quickCreateId: string | null = null;
	export let labels: Labels;

	let games: GameOption[] = [];
	let gamesLoading = true;
	let gamesError = '';

	let title = '';
	let occurredAt = '';
	let eventType: EventType = 'loot';
	let sourceType: SourceType = 'manual';
	let gameId = '';
	let holderType: HolderType = 'character';
	let holderRef = '';
	let notes = '';
	let assetRows: AssetInputRow[] = [createAssetRow()];

	let errors: FieldErrors = {};
	let isSubmitting = false;

	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; onClick?: () => void } | null = null;
	let dialogSecondaryAction: { label: string; onClick?: () => void } | null = null;

	let recentEntries: RecentEventCreationEntry[] = [];
	let quickCreateOpen = false;
	let selectedRecentId = '';

	function createAssetRow(value = ''): AssetInputRow {
		return {
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			value,
		};
	}

	function toLocalDateTimeValue(date: Date) {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		const hours = `${date.getHours()}`.padStart(2, '0');
		const minutes = `${date.getMinutes()}`.padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	function getCurrentRecentEntries() {
		return organization ? getOrganizationRecentEventCreations(recentEntries, organization) : [];
	}

	function refreshRecentEntries() {
		if (typeof window === 'undefined') {
			return;
		}

		recentEntries = loadRecentEventCreations(window.localStorage);
		const currentEntries = getCurrentRecentEntries();
		if (!selectedRecentId && currentEntries[0]) {
			selectedRecentId = currentEntries[0].id;
		}
	}

	function getSelectedRecentEntry() {
		return getCurrentRecentEntries().find((entry) => entry.id === selectedRecentId) ?? null;
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
		return `${entry.payload.title} - ${prefix}${timeLabel}`;
	}

	function openPendingDialog(totalEvents: number) {
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.loadingCreateTitle;
		dialogMessage =
			totalEvents > 1
				? `${labels.loadingCreateBatchPrefix} ${totalEvents} ${labels.successCreateSuffix}`
				: labels.loadingCreateSingleBody;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
	}

	function openErrorDialog(message: string) {
		dialogOpen = true;
		dialogState = 'error';
		dialogTitle = labels.errorCreateTitle;
		dialogMessage = message;
		dialogPrimaryAction = {
			label: labels.errorRetryLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
		dialogSecondaryAction = null;
	}

	function openSuccessDialog(totalEvents: number) {
		dialogOpen = true;
		dialogState = 'success';
		dialogTitle = labels.successCreateTitle;
		dialogMessage =
			totalEvents > 1
				? `${labels.successCreateBatchPrefix} ${totalEvents} ${labels.successCreateSuffix}`
				: labels.successCreateSingleBody;
		dialogPrimaryAction = {
			label: labels.successCloseLabel,
			onClick: () => {
				dialogOpen = false;
			},
		};
		dialogSecondaryAction = null;
	}

	function addAssetRow() {
		assetRows = [...assetRows, createAssetRow()];
	}

	function updateAssetRow(rowId: string, value: string) {
		assetRows = assetRows.map((row) => (row.id === rowId ? { ...row, value } : row));
	}

	function removeAssetRow(rowId: string) {
		if (assetRows.length === 1) {
			assetRows = [createAssetRow()];
			return;
		}

		assetRows = assetRows.filter((row) => row.id !== rowId);
	}

	function getNormalizedAssetIds() {
		const values: number[] = [];

		for (const row of assetRows) {
			const trimmed = row.value.trim();
			if (!trimmed) {
				continue;
			}

			const parsed = Number(trimmed);
			if (!Number.isInteger(parsed) || parsed <= 0) {
				return null;
			}

			values.push(parsed);
		}

		return values;
	}

	function validate() {
		const nextErrors: FieldErrors = {};

		if (!organization) {
			nextErrors.organization = labels.validationRequired;
		}

		if (!title.trim()) {
			nextErrors.title = labels.validationRequired;
		}

		if (!occurredAt.trim()) {
			nextErrors.occurredAt = labels.validationRequired;
		} else if (!Number.isFinite(new Date(occurredAt).getTime())) {
			nextErrors.occurredAt = labels.validationDate;
		}

		const assetIds = getNormalizedAssetIds();
		if (assetIds === null) {
			nextErrors.assetIds = labels.validationNumber;
		}

		if (gameId.trim()) {
			const parsedGameId = Number(gameId);
			if (!Number.isInteger(parsedGameId) || parsedGameId <= 0) {
				nextErrors.gameId = labels.validationNumber;
			}
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	function applyRecentEntry(entry: RecentEventCreationEntry) {
		title = entry.payload.title;
		occurredAt = toLocalDateTimeValue(new Date(entry.payload.occurredAt));
		eventType = entry.payload.eventType ?? 'loot';
		sourceType = entry.payload.sourceType ?? 'manual';
		gameId =
			typeof entry.payload.gameId === 'number' && Number.isFinite(entry.payload.gameId)
				? String(entry.payload.gameId)
				: '';
		holderType = entry.payload.holderType ?? 'character';
		holderRef = typeof entry.payload.holderRef === 'string' ? entry.payload.holderRef : '';
		notes = typeof entry.payload.notes === 'string' ? entry.payload.notes : '';
		assetRows =
			typeof entry.payload.assetId === 'number' && Number.isFinite(entry.payload.assetId)
				? [createAssetRow(String(entry.payload.assetId))]
				: [createAssetRow()];
		errors = {};
	}

	function confirmQuickCreate() {
		const entry = getSelectedRecentEntry();
		if (!entry) {
			return;
		}

		applyRecentEntry(entry);
		quickCreateOpen = false;
	}

	function buildBasePayload(): Omit<CreateLedgerEventRequest, 'assetId'> {
		const payload: Omit<CreateLedgerEventRequest, 'assetId'> = {
			title: title.trim(),
			occurredAt: new Date(occurredAt).toISOString(),
			eventType,
			sourceType,
			holderType,
		};

		if (gameId.trim()) {
			payload.gameId = Number(gameId);
		}

		if (holderRef.trim()) {
			payload.holderRef = holderRef.trim();
		}

		if (notes.trim()) {
			payload.notes = notes.trim();
		}

		return payload;
	}

	async function loadGames() {
		gamesLoading = true;
		gamesError = '';

		try {
			const response = await getApiAdapter().listOrganizationGames();
			games = response.games
				.filter((game) => game.type === 'game' && game.isActive)
				.map((game) => ({
					id: game.id,
					name: game.name,
					iconUrl: typeof game.iconUrl === 'string' ? game.iconUrl : null,
					officialSiteUrl: typeof game.officialSiteUrl === 'string' ? game.officialSiteUrl : null,
					resolvedIconUrl: typeof game.resolvedIconUrl === 'string' ? game.resolvedIconUrl : null,
				}));
		} catch (error) {
			gamesError = getErrorMessage(error, labels.errorCreateTitle);
		} finally {
			gamesLoading = false;
		}
	}

	async function submit() {
		if (isSubmitting || !validate() || !organization) {
			return;
		}

		const assetIds = getNormalizedAssetIds() ?? [];
		const basePayload = buildBasePayload();
		const payloads: CreateLedgerEventRequest[] =
			assetIds.length > 0
				? assetIds.map((assetId) => ({ ...basePayload, assetId }))
				: [{ ...basePayload }];

		isSubmitting = true;
		openPendingDialog(payloads.length);

		let timedOut = false;
		let createdCount = 0;
		const timeoutId = window.setTimeout(() => {
			timedOut = true;
			openErrorDialog(labels.errorTimeoutBody);
		}, CREATE_TIMEOUT_MS);

		try {
			for (const payload of payloads) {
				await getApiAdapter().createOrganizationLedgerEvent(organization, payload);
				createdCount += 1;
			}

			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			if (typeof window !== 'undefined') {
				recentEntries = recordRecentEventCreations(
					window.localStorage,
					organization,
					payloads,
					new Date().toISOString(),
				);
				selectedRecentId = getCurrentRecentEntries()[0]?.id ?? '';
			}
			openSuccessDialog(payloads.length);
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			const baseMessage = getErrorMessage(error, labels.errorCreateTitle);
			openErrorDialog(
				createdCount > 0 ? `${baseMessage} ${labels.errorPartialPrefix} ${createdCount}.` : baseMessage,
			);
		} finally {
			isSubmitting = false;
		}
	}

	onMount(() => {
		organization = resolveOrganizationQuery(organization);
		occurredAt = toLocalDateTimeValue(new Date());
		refreshRecentEntries();
		if (quickCreateId) {
			selectedRecentId = quickCreateId;
			const entry = getSelectedRecentEntry();
			if (entry) {
				applyRecentEntry(entry);
			}
		}
		void loadGames();
	});
</script>

<section class="event-workspace-shell">
	<div class="event-workspace-header">
		<div>
			<p class="event-eyebrow">{labels.eyebrow}</p>
			<h1>{labels.title}</h1>
			<p class="event-intro">{labels.intro}</p>
		</div>

		<div class="event-session-card">
			<h2>{labels.sessionTitle}</h2>
			<p>{labels.sessionBody}</p>
			<div class="event-session-meta">
				<span>{labels.sessionCountLabel}</span>
				<strong>{getCurrentRecentEntries().length}</strong>
			</div>
			{#if getCurrentRecentEntries().length > 0}
				<button
					type="button"
					class="event-session-button"
					on:click={() => {
						selectedRecentId = getCurrentRecentEntries()[0]?.id ?? '';
						quickCreateOpen = true;
					}}
				>
					{labels.quickCreateLabel}
				</button>
			{:else}
				<p class="event-session-empty">{labels.quickCreateEmpty}</p>
			{/if}
		</div>
	</div>

	{#if !organization}
		<section class="event-org-required">
			<h2>{labels.orgRequiredTitle}</h2>
			<p>{labels.orgRequiredBody}</p>
		</section>
	{/if}

	<form
		class="event-form"
		on:submit|preventDefault={() => {
			void submit();
		}}
	>
		<div class="event-grid">
			<label class="event-field event-field-wide">
				<span>{labels.titleLabel}</span>
				<input class:error={Boolean(errors.title)} bind:value={title} type="text" maxlength="200" placeholder={labels.titlePlaceholder} disabled={!organization} />
				<small>{labels.requiredHint}</small>
				{#if errors.title}<em>{errors.title}</em>{/if}
			</label>

			<label class="event-field">
				<span>{labels.occurredAtLabel}</span>
				<input class:error={Boolean(errors.occurredAt)} bind:value={occurredAt} type="datetime-local" disabled={!organization} />
				<small>{labels.requiredHint}</small>
				{#if errors.occurredAt}<em>{errors.occurredAt}</em>{/if}
			</label>

			<label class="event-field">
				<span>{labels.eventTypeLabel}</span>
				<select bind:value={eventType} disabled={!organization}>
					{#each eventTypeOptions as option}
						<option value={option.value}>{labels[option.labelKey]}</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<label class="event-field">
				<span>{labels.sourceTypeLabel}</span>
				<select bind:value={sourceType} disabled={!organization}>
					{#each sourceTypeOptions as option}
						<option value={option.value}>{labels[option.labelKey]}</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<label class="event-field">
				<span>{labels.gameIdLabel}</span>
				<GamePicker
					bind:value={gameId}
					ariaLabel={labels.gameIdLabel}
					placeholder={gamesLoading ? labels.loadingGames : labels.gameOptionalHint}
					disabled={!organization || gamesLoading}
					error={Boolean(errors.gameId)}
					items={games.map((game) => ({
						value: String(game.id),
						label: game.name,
						iconUrl: game.iconUrl,
						officialSiteUrl: game.officialSiteUrl,
						resolvedIconUrl: game.resolvedIconUrl,
					}))}
				/>
				<small>{labels.optionalHint}</small>
				{#if errors.gameId}<em>{errors.gameId}</em>{/if}
				{#if gamesError}<em>{gamesError}</em>{/if}
			</label>

			<label class="event-field">
				<span>{labels.holderTypeLabel}</span>
				<select bind:value={holderType} disabled={!organization}>
					{#each holderTypeOptions as option}
						<option value={option.value}>{labels[option.labelKey]}</option>
					{/each}
				</select>
				<small>{labels.requiredHint}</small>
			</label>

			<label class="event-field event-field-wide">
				<span>{labels.holderRefLabel}</span>
				<input bind:value={holderRef} type="text" maxlength="120" placeholder={labels.holderRefPlaceholder} disabled={!organization} />
				<small>{labels.optionalHint}</small>
			</label>

			<label class="event-field event-field-wide">
				<span>{labels.notesLabel}</span>
				<textarea bind:value={notes} rows="4" maxlength="1000" placeholder={labels.notesPlaceholder} disabled={!organization}></textarea>
				<small>{labels.optionalHint}</small>
			</label>
		</div>

		<section class="event-assets-card">
			<div class="event-assets-copy">
				<h2>{labels.assetSectionLabel}</h2>
				<p>{labels.assetSectionBody}</p>
			</div>

			<div class="event-assets-list">
				{#each assetRows as row, index (row.id)}
					<div class="event-asset-row">
						<label class="event-field">
							<span>{labels.assetIdLabel} #{index + 1}</span>
							<input
								class:error={Boolean(errors.assetIds)}
								type="number"
								min="1"
								step="1"
								inputmode="numeric"
								value={row.value}
								placeholder={labels.assetIdPlaceholder}
								disabled={!organization}
								on:input={(event) => {
									const target = event.currentTarget;
									if (target instanceof HTMLInputElement) {
										updateAssetRow(row.id, target.value);
									}
								}}
							/>
						</label>
						<button type="button" class="event-asset-remove" on:click={() => removeAssetRow(row.id)} disabled={!organization}>
							{labels.removeAssetLabel}
						</button>
					</div>
				{/each}
				{#if errors.assetIds}<em class="event-assets-error">{errors.assetIds}</em>{/if}
			</div>

			<div class="event-assets-actions">
				<button type="button" class="event-asset-add" on:click={addAssetRow} disabled={!organization}>
					{labels.addAssetLabel}
				</button>
			</div>
		</section>

		<div class="event-actions">
			<button class="event-submit" type="submit" disabled={!organization || isSubmitting}>
				{labels.submitLabel}
			</button>
		</div>
	</form>

	{#if quickCreateOpen}
		<div class="quick-create-backdrop" role="presentation">
			<div class="quick-create-modal" role="dialog" aria-modal="true" aria-labelledby="quick-create-title">
				<button
					type="button"
					class="quick-create-close"
					aria-label={labels.quickCreateCloseLabel}
					on:click={() => {
						quickCreateOpen = false;
					}}
				>
					<span></span>
					<span></span>
				</button>

				<h2 id="quick-create-title">{labels.quickCreateTitle}</h2>
				<p>{labels.quickCreateBody}</p>

				{#if getCurrentRecentEntries().length > 0}
					<label class="event-field">
						<span>{labels.quickCreateSelectLabel}</span>
						<select bind:value={selectedRecentId}>
							{#each getCurrentRecentEntries() as entry, index}
								<option value={entry.id}>
									{index === 0 ? `${labels.quickCreateDefaultPrefix} ${formatRecentEntryLabel(entry)}` : formatRecentEntryLabel(entry)}
								</option>
							{/each}
						</select>
					</label>
				{/if}

				<div class="quick-create-actions">
					<button type="button" class="quick-create-cancel" on:click={() => (quickCreateOpen = false)}>
						{labels.quickCreateCancelLabel}
					</button>
					<button type="button" class="quick-create-confirm" on:click={confirmQuickCreate}>
						{labels.quickCreateConfirmLabel}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<RequestStatusDialog
		open={dialogOpen}
		state={dialogState}
		title={dialogTitle}
		message={dialogMessage}
		primaryAction={dialogPrimaryAction}
		secondaryAction={dialogSecondaryAction}
		onClose={() => {
			dialogOpen = false;
		}}
	/>
</section>

<style>
	.event-workspace-shell {
		width: min(1080px, 100%);
		margin: 24px auto 0;
		display: grid;
		gap: 24px;
	}

	.event-workspace-header {
		display: grid;
		grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
		gap: 20px;
		align-items: start;
	}

	.event-eyebrow,
	.event-session-card h2,
	.event-assets-copy h2,
	.event-org-required h2 {
		margin: 0;
	}

	.event-eyebrow {
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.event-workspace-header h1 {
		margin: 10px 0 0;
		font-size: clamp(2rem, 4vw, 3.25rem);
		line-height: 1.05;
		letter-spacing: -0.05em;
	}

	.event-intro {
		max-width: 64ch;
		margin: 16px 0 0;
		color: var(--text-soft);
		line-height: 1.8;
	}

	.event-session-card,
	.event-form,
	.event-org-required,
	.quick-create-modal {
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.event-session-card {
		padding: 24px;
		display: grid;
		gap: 14px;
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 12%, transparent), transparent 48%),
			var(--surface);
	}

	.event-session-card p,
	.event-org-required p,
	.event-assets-copy p {
		margin: 0;
		color: var(--text-soft);
		line-height: 1.7;
	}

	.event-session-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 88%, white);
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
	}

	.event-session-meta strong {
		font-size: 1.15rem;
	}

	.event-session-button,
	.event-submit,
	.event-asset-add,
	.quick-create-confirm,
	.quick-create-cancel,
	.event-asset-remove {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease,
			opacity 0.18s ease;
	}

	.event-session-button,
	.event-submit,
	.quick-create-confirm {
		border: 1px solid transparent;
		background: var(--accent);
		color: white;
	}

	.event-submit {
		background: var(--text-main);
		color: var(--surface-strong);
	}

	.event-asset-add,
	.quick-create-cancel,
	.event-asset-remove {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
	}

	.event-session-button:hover,
	.event-submit:hover,
	.event-asset-add:hover,
	.quick-create-confirm:hover,
	.quick-create-cancel:hover,
	.event-asset-remove:hover {
		transform: translateY(-1px);
	}

	.event-session-empty {
		font-size: 0.94rem;
	}

	.event-org-required {
		padding: 24px;
	}

	.event-form {
		padding: 28px;
		display: grid;
		gap: 22px;
	}

	.event-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.event-field {
		display: grid;
		gap: 8px;
	}

	.event-field-wide {
		grid-column: 1 / -1;
	}

	.event-field span {
		font-size: 0.94rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.event-field input,
	.event-field textarea,
	.event-field select {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.event-field textarea {
		min-height: 120px;
		padding: 14px 16px;
		resize: vertical;
	}

	.event-field input.error,
	.event-field select.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.event-field small {
		color: var(--text-soft);
		line-height: 1.5;
	}

	.event-field em,
	.event-assets-error {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.event-assets-card {
		padding: 22px;
		border-radius: 24px;
		border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--line));
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, transparent), transparent 44%),
			color-mix(in srgb, var(--surface-strong) 84%, white);
		display: grid;
		gap: 18px;
	}

	.event-assets-list {
		display: grid;
		gap: 14px;
	}

	.event-asset-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px;
		align-items: end;
	}

	.event-assets-actions,
	.event-actions,
	.quick-create-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.quick-create-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 55;
	}

	.quick-create-modal {
		position: relative;
		width: min(560px, 100%);
		padding: 28px;
		display: grid;
		gap: 18px;
	}

	.quick-create-modal h2,
	.quick-create-modal p {
		margin: 0;
	}

	.quick-create-modal p {
		color: var(--text-soft);
		line-height: 1.7;
	}

	.quick-create-close {
		position: absolute;
		top: 18px;
		right: 18px;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		cursor: pointer;
	}

	.quick-create-close span {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 16px;
		height: 2px;
		background: var(--text-main);
		border-radius: 999px;
	}

	.quick-create-close span:first-child {
		transform: translate(-50%, -50%) rotate(45deg);
	}

	.quick-create-close span:last-child {
		transform: translate(-50%, -50%) rotate(-45deg);
	}

	.event-session-button:disabled,
	.event-submit:disabled,
	.event-asset-add:disabled,
	.quick-create-confirm:disabled,
	.quick-create-cancel:disabled,
	.event-asset-remove:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	@media (max-width: 820px) {
		.event-workspace-header {
			grid-template-columns: 1fr;
		}

		.event-grid,
		.event-asset-row {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.event-form,
		.event-session-card,
		.event-org-required,
		.quick-create-modal {
			padding: 22px;
			border-radius: 22px;
		}

		.event-assets-card {
			padding: 18px;
			border-radius: 20px;
		}

		.event-assets-actions,
		.event-actions,
		.quick-create-actions {
			flex-direction: column-reverse;
		}

		.event-session-button,
		.event-submit,
		.event-asset-add,
		.quick-create-confirm,
		.quick-create-cancel,
		.event-asset-remove {
			width: 100%;
		}
	}
</style>
