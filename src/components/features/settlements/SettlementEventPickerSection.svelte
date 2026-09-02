<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	import GuildOptionPicker, {
		type GuildOptionPickerItem,
	} from '../../shared/GuildOptionPicker.svelte';
	import GamePicker, { type GamePickerItem } from '../../shared/GamePicker.svelte';
	import TimeSelector from '../../shared/TimeSelector.svelte';

	interface EventTableRow {
		id: number;
		title: string;
		occurredAtLabel: string;
		holderLabel: string;
		assetLabel: string;
		isPicked: boolean;
		isPending: boolean;
	}

	interface Labels {
		contextTitle: string;
		contextBody: string;
		contextSelectLabel: string;
		contextSelectPlaceholder: string;
		contextSelectEmpty: string;
		gameSelectLabel: string;
		gameSelectPlaceholder: string;
		gameSelectEmpty: string;
		eventSectionTitle: string;
		eventSectionBody: string;
		eventRefreshLabel: string;
		eventFilterFromLabel: string;
		eventFilterToLabel: string;
		eventFilterApplyLabel: string;
		eventLoadingLabel: string;
		eventEmptyTitle: string;
		eventEmptyBody: string;
		eventEmptyActionLabel: string;
		eventEmptyRefreshHint: string;
		eventPagePreviousLabel: string;
		eventPageNextLabel: string;
		eventPageSummaryLabel: string;
		eventPageSizeLabel: string;
		eventTableNameLabel: string;
		eventTableOccurredAtLabel: string;
		eventTableHolderLabel: string;
		eventTableAssetLabel: string;
		eventTableActionLabel: string;
		eventTablePickLabel: string;
		eventTablePickPendingLabel: string;
		eventTablePickedLabel: string;
		optionalHint: string;
	}

	const dispatch = createEventDispatcher<{
		change: { value: string };
		gamechange: { value: string };
		rangechange: { start: string; end: string };
		applyfilters: void;
		refresh: void;
		pagesizechange: { value: number };
		previouspage: void;
		nextpage: void;
		pick: { eventId: number };
	}>();

	export let lang: string;
	export let organization = '';
	export let organizationName = '';
	export let organizationOptions: GuildOptionPickerItem[] = [];
	export let gameId = '';
	export let gameOptions: GamePickerItem[] = [];
	export let rangeStart = '';
	export let rangeEnd = '';
	export let eventsLoading = false;
	export let eventsError = '';
	export let hasAnyEvents = false;
	export let eventRows: EventTableRow[] = [];
	export let page = 1;
	export let pageSize = 5;
	export let hasPreviousPage = false;
	export let hasNextPage = false;
	export let pendingPickEventId: number | null = null;
	export let labels: Labels;

	function pageSummary() {
		return labels.eventPageSummaryLabel.replace('{page}', String(page));
	}
</script>

<section class="settlement-card settlement-context-card">
	<div class="settlement-card-head settlement-context-head">
		<div>
			<h2>{labels.contextTitle}</h2>
			<p>
				{labels.contextBody}
				{#if organizationName}
					<strong>{organizationName}</strong>
				{/if}
			</p>
		</div>
	</div>

	<label class="settlement-field">
		<span>{labels.contextSelectLabel}</span>
		<GuildOptionPicker
			value={organization}
			ariaLabel={labels.contextSelectLabel}
			placeholder={labels.contextSelectPlaceholder}
			searchPlaceholder={labels.contextSelectPlaceholder}
			emptyLabel={labels.contextSelectEmpty}
			items={organizationOptions}
			disabled={eventsLoading || pendingPickEventId !== null}
			on:change={(event) => dispatch('change', event.detail)}
		/>
	</label>

	<label class="settlement-field">
		<span>{labels.gameSelectLabel}</span>
		<GamePicker
			value={gameId}
			ariaLabel={labels.gameSelectLabel}
			placeholder={labels.gameSelectPlaceholder}
			items={gameOptions}
			disabled={gameOptions.length === 0 || eventsLoading || pendingPickEventId !== null}
			on:change={(event) => dispatch('gamechange', event.detail)}
		/>
		<small>{labels.optionalHint}</small>
	</label>

	<div class="settlement-form-grid settlement-form-grid-context">
		<label class="settlement-field settlement-field-wide">
			<span>{labels.eventFilterFromLabel} / {labels.eventFilterToLabel}</span>
			<TimeSelector
				mode="range"
				inputType="date"
				start={rangeStart}
				end={rangeEnd}
				startAriaLabel={labels.eventFilterFromLabel}
				endAriaLabel={labels.eventFilterToLabel}
				on:change={(event) => dispatch('rangechange', event.detail)}
			/>
			<small>{labels.optionalHint}</small>
		</label>

		<div class="settlement-field settlement-field-actions">
			<button
				type="button"
				class="secondary-button"
				disabled={eventsLoading || pendingPickEventId !== null}
				on:click={() => dispatch('applyfilters')}
			>
				{labels.eventFilterApplyLabel}
			</button>
		</div>
	</div>
</section>

<section class="settlement-card">
	<div class="settlement-card-head">
		<div>
			<h2>{labels.eventSectionTitle}</h2>
			<p>{labels.eventSectionBody}</p>
		</div>
		<div class="settlement-card-toolbar">
			<div class="page-size-toggle" role="group" aria-label={labels.eventPageSizeLabel}>
				<button
					type="button"
					class:active={pageSize === 5}
					disabled={eventsLoading || pendingPickEventId !== null}
					on:click={() => dispatch('pagesizechange', { value: 5 })}
				>
					5
				</button>
				<button
					type="button"
					class:active={pageSize === 10}
					disabled={eventsLoading || pendingPickEventId !== null}
					on:click={() => dispatch('pagesizechange', { value: 10 })}
				>
					10
				</button>
			</div>
			<button
				type="button"
				class="secondary-button"
				disabled={eventsLoading || pendingPickEventId !== null}
				on:click={() => dispatch('refresh')}
			>
				{labels.eventRefreshLabel}
			</button>
		</div>
	</div>

	{#if eventsError}
		<p class="error-text">{eventsError}</p>
	{/if}

	{#if eventsLoading}
		<p class="muted-text">{labels.eventLoadingLabel}</p>
	{:else if eventRows.length === 0}
		<div class="settlement-empty">
			<h3>{labels.eventEmptyTitle}</h3>
			<p>{labels.eventEmptyBody}</p>
			{#if hasAnyEvents}
				<p class="settlement-empty-note">{labels.eventEmptyRefreshHint}</p>
			{:else}
				<a
					class="primary-button workflow-action settlement-empty-action"
					href={`/${lang}/guilds/events/new?orgVanity=${encodeURIComponent(organization)}`}
				>
					{labels.eventEmptyActionLabel}
				</a>
			{/if}
		</div>
	{:else}
		<div class="event-table-shell">
			<div class="event-table-scroll">
				<table class="event-table">
					<thead>
						<tr>
							<th>{labels.eventTableNameLabel}</th>
							<th>{labels.eventTableOccurredAtLabel}</th>
							<th>{labels.eventTableHolderLabel}</th>
							<th>{labels.eventTableAssetLabel}</th>
							<th>{labels.eventTableActionLabel}</th>
						</tr>
					</thead>
					<tbody>
						{#each eventRows as row}
							<tr class:is-picked={row.isPicked}>
								<td>{row.title}</td>
								<td>{row.occurredAtLabel}</td>
								<td>{row.holderLabel}</td>
								<td>{row.assetLabel}</td>
								<td>
									<button
										type="button"
										class="pick-button"
										disabled={pendingPickEventId !== null}
										on:click={() => dispatch('pick', { eventId: row.id })}
									>
										{#if row.isPending}
											{labels.eventTablePickPendingLabel}
										{:else if row.isPicked}
											{labels.eventTablePickedLabel}
										{:else}
											{labels.eventTablePickLabel}
										{/if}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="settlement-actions">
				<button
					type="button"
					class="secondary-button"
					disabled={!hasPreviousPage || eventsLoading || pendingPickEventId !== null}
					on:click={() => dispatch('previouspage')}
				>
					{labels.eventPagePreviousLabel}
				</button>
				<p class="muted-text">{pageSummary()}</p>
				<button
					type="button"
					class="secondary-button"
					disabled={!hasNextPage || eventsLoading || pendingPickEventId !== null}
					on:click={() => dispatch('nextpage')}
				>
					{labels.eventPageNextLabel}
				</button>
			</div>
		</div>
	{/if}
</section>

<style>
	.settlement-context-card,
	.settlement-card {
		display: grid;
		gap: 18px;
	}

	.settlement-card-head,
	.settlement-context-head {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 16px;
	}

	.settlement-card-head h2,
	.settlement-context-head h2,
	.settlement-empty h3 {
		margin: 0;
	}

	.settlement-card-head p,
	.settlement-context-head p,
	.settlement-empty p,
	.settlement-empty-note,
	.muted-text {
		margin: 0;
		color: var(--text-soft);
	}

	.settlement-field {
		display: grid;
		gap: 10px;
	}

	.settlement-field > span {
		font-weight: 700;
	}

	.settlement-field > small {
		color: var(--text-soft);
	}

	.settlement-form-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.settlement-form-grid-context {
		align-items: end;
	}

	.settlement-field-wide {
		grid-column: 1 / -1;
	}

	.settlement-field-actions {
		align-self: end;
	}

	.settlement-card-toolbar,
	.settlement-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.page-size-toggle {
		display: inline-flex;
		padding: 4px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-strong) 85%, white);
		border: 1px solid color-mix(in srgb, var(--line) 88%, white);
	}

	.page-size-toggle button {
		border: 0;
		background: transparent;
		padding: 8px 12px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		color: var(--text-soft);
		cursor: pointer;
		transition:
			background-color 140ms ease,
			color 140ms ease,
			transform 140ms ease,
			box-shadow 140ms ease;
	}

	.page-size-toggle button.active {
		background: color-mix(in srgb, var(--accent) 18%, white);
		color: var(--text-main);
	}

	.page-size-toggle button:hover:not(:disabled) {
		color: var(--text-main);
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
	}

	.secondary-button {
		min-height: 44px;
		padding: 0 16px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--line));
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--surface) 92%, white),
				color-mix(in srgb, var(--surface-strong) 90%, white)
			);
		color: var(--text-main);
		font: inherit;
		font-weight: 700;
		letter-spacing: 0.01em;
		cursor: pointer;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.35) inset,
			0 8px 18px rgba(18, 26, 44, 0.08);
		transition:
			transform 140ms ease,
			box-shadow 140ms ease,
			border-color 140ms ease,
			background-color 140ms ease;
	}

	.secondary-button:hover:not(:disabled) {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--accent) 34%, var(--line));
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.42) inset,
			0 12px 22px rgba(18, 26, 44, 0.14);
	}

	.secondary-button:active:not(:disabled) {
		transform: translateY(0);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.28) inset,
			0 6px 14px rgba(18, 26, 44, 0.12);
	}

	.event-table-shell {
		display: grid;
		gap: 16px;
	}

	.event-table-scroll {
		overflow-x: auto;
		border: 1px solid color-mix(in srgb, var(--line) 88%, white);
		border-radius: 20px;
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
	}

	.event-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 720px;
	}

	.event-table th,
	.event-table td {
		padding: 14px 16px;
		text-align: left;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 90%, white);
		vertical-align: middle;
	}

	.event-table th {
		font-size: 0.94rem;
		color: var(--text-soft);
	}

	.event-table tbody tr:last-child td {
		border-bottom: 0;
	}

	.event-table tbody tr.is-picked {
		background: color-mix(in srgb, var(--accent) 9%, white);
	}

	.pick-button {
		min-height: 40px;
		padding: 0 14px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--line));
		background: color-mix(in srgb, var(--surface) 92%, white);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.pick-button:disabled,
	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:root[data-theme='dark'] .page-size-toggle {
		background: color-mix(in srgb, var(--surface-strong) 92%, black);
		border-color: color-mix(in srgb, var(--line) 92%, black);
	}

	:root[data-theme='dark'] .page-size-toggle button {
		color: color-mix(in srgb, var(--text-soft) 92%, white);
	}

	:root[data-theme='dark'] .page-size-toggle button.active {
		background: color-mix(in srgb, var(--accent) 24%, #1a2233);
		color: #f4f7ff;
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent) inset;
	}

	:root[data-theme='dark'] .page-size-toggle button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--accent) 14%, #151b28);
		color: #f4f7ff;
	}

	:root[data-theme='dark'] .secondary-button {
		border-color: color-mix(in srgb, var(--accent) 26%, var(--line));
		background:
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--surface) 86%, #1b2333),
				color-mix(in srgb, var(--surface-strong) 92%, #111723)
			);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 10px 22px rgba(0, 0, 0, 0.28);
	}

	.error-text {
		margin: 0;
		color: #b74a4a;
	}

	@media (max-width: 720px) {
		.settlement-form-grid {
			grid-template-columns: 1fr;
		}

		.settlement-card-head,
		.settlement-context-head {
			flex-direction: column;
		}
	}
</style>
