<script lang="ts">
	import SearchSelect, { type SearchSelectItem } from '../../shared/SearchSelect.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import {
		ensureAuthSession,
		getErrorMessage,
		isAuthenticatedSession,
		type AuthSession,
	} from '../../../libs/api/auth/session.ts';
	import { refreshMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';
	import { writeCachedOrganizationMembershipRecord } from '../../../libs/organizations/membership-record-cache.ts';

	interface Labels {
		applyLabel: string;
		applyingLabel: string;
		appliedLabel: string;
		errorTitle: string;
		loginLabel: string;
		dialogTitle: string;
		dialogIntro: string;
		dialogChooseTabLabel: string;
		dialogCreateTabLabel: string;
		dialogCancelLabel: string;
		dialogSubmitLabel: string;
		dialogLoadingLabel: string;
		dialogRoleFieldLabel: string;
		dialogRolePlaceholder: string;
		dialogRoleEmptyLabel: string;
		dialogRoleHint: string;
		dialogRoleRequiredError: string;
		dialogNewRoleFieldLabel: string;
		dialogNewRolePlaceholder: string;
		dialogNewRoleHint: string;
		dialogNewRoleRequiredError: string;
		dialogNoRolesBody: string;
		dialogGameHintPrefix: string;
		dialogMissingGameBody: string;
	}

	type ApplyMode = 'select' | 'create';

	export let lang: string;
	export let organization: string;
	export let membershipStatus: 'pending' | 'active' | null = null;
	export let labels: Labels;
	export let onApplied: (() => void) | null = null;

	let session: AuthSession | null = null;
	let applying = false;
	let loadingContext = false;
	let errorMessage = '';
	let dialogError = '';
	let modalOpen = false;
	let mode: ApplyMode = 'select';
	let selectedCharacterId = '';
	let newCharacterName = '';
	let fieldError = '';
	let localMembershipStatus: 'pending' | 'active' | null = membershipStatus;
	let roleItems: SearchSelectItem[] = [];
	let primaryGameId: number | null = null;
	let primaryGameName = '';

	function setPrimaryGame(
		game:
			| {
					gameId?: unknown;
					gameName?: unknown;
					displayName?: unknown;
			  }
			| null
			| undefined,
	) {
		if (!game || typeof game.gameId !== 'number') {
			return false;
		}

		primaryGameId = game.gameId;
		primaryGameName =
			(typeof game.displayName === 'string' && game.displayName.trim()) ||
			(typeof game.gameName === 'string' && game.gameName.trim()) ||
			'';
		return true;
	}

	function buildFallbackRoleItems(
		characters: Array<{
			id: number;
			name: string;
			claimedByUserId?: unknown;
			gameId?: unknown;
			game?: { gameId?: unknown; gameName?: unknown; displayName?: unknown } | null;
			isActive?: boolean;
		}>,
	) {
		return characters
			.filter(
				(character) =>
					character.isActive !== false &&
					(character.claimedByUserId === null || typeof character.claimedByUserId === 'undefined') &&
					typeof character.id === 'number',
			)
			.map((character) => ({
				value: String(character.id),
				label: character.name,
				metaLabel:
					(typeof character.game?.displayName === 'string' && character.game.displayName.trim()) ||
					(typeof character.game?.gameName === 'string' && character.game.gameName.trim()) ||
					null,
			}));
	}

	$: localMembershipStatus = membershipStatus ?? localMembershipStatus;
	$: isHidden = localMembershipStatus === 'pending' || localMembershipStatus === 'active';

	function resetDialogState() {
		dialogError = '';
		fieldError = '';
		selectedCharacterId = '';
		newCharacterName = '';
		mode = 'select';
	}

	function closeModal() {
		if (applying) {
			return;
		}

		modalOpen = false;
		resetDialogState();
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.currentTarget === event.target) {
			closeModal();
		}
	}

	async function loadApplyContext() {
		loadingContext = true;
		dialogError = '';
		roleItems = [];
		primaryGameId = null;
		primaryGameName = '';

		try {
			const [availableCharactersResult, organizationResult, charactersResult] = await Promise.allSettled([
				getApiAdapter().listOrganizationAvailableCharacters(organization),
				getApiAdapter().getOrganization(organization),
				getApiAdapter().listOrganizationCharacters(organization),
			]);

			if (availableCharactersResult.status === 'fulfilled') {
				roleItems = availableCharactersResult.value.characters
					.filter((character) => typeof character.characterId === 'number')
					.map((character) => ({
						value: String(character.characterId),
						label: character.name,
						metaLabel:
							(typeof character.game.displayName === 'string' && character.game.displayName.trim()) ||
							character.game.gameName,
					}));

				const firstAvailableGame = availableCharactersResult.value.characters.find(
					(character) => typeof character.game?.gameId === 'number',
				)?.game;
				setPrimaryGame(firstAvailableGame);
			}

			if (organizationResult.status === 'fulfilled') {
				const primaryGame =
					organizationResult.value.organization.games.find((game) => game.isPrimary) ??
					organizationResult.value.organization.games[0] ??
					null;
				setPrimaryGame(primaryGame);
			}

			if (charactersResult.status === 'fulfilled') {
				if (roleItems.length === 0) {
					roleItems = buildFallbackRoleItems(charactersResult.value.characters);
				}

				const fallbackGame =
					charactersResult.value.characters.find((character) => typeof character.gameId === 'number')?.game ??
					charactersResult.value.characters.find((character) => typeof character.game?.gameId === 'number')?.game ??
					null;
				setPrimaryGame(fallbackGame);
			}

			if (roleItems.length === 0 && availableCharactersResult.status === 'rejected' && charactersResult.status === 'rejected') {
				dialogError = getErrorMessage(availableCharactersResult.reason, labels.errorTitle);
			}
		} finally {
			loadingContext = false;
		}
	}

	async function handleOpen() {
		if (applying || isHidden) {
			return;
		}

		session = await ensureAuthSession();
		if (!isAuthenticatedSession(session)) {
			window.location.href = `/${lang}/login`;
			return;
		}

		modalOpen = true;
		resetDialogState();
		await loadApplyContext();
	}

	function selectMode(nextMode: ApplyMode) {
		mode = nextMode;
		fieldError = '';
		dialogError = '';
	}

	async function handleApply() {
		if (applying || isHidden) {
			return;
		}

		session = await ensureAuthSession();
		if (!isAuthenticatedSession(session)) {
			window.location.href = `/${lang}/login`;
			return;
		}

		fieldError = '';
		dialogError = '';

		if (mode === 'select') {
			const parsedCharacterId = Number(selectedCharacterId);
			if (!selectedCharacterId || !Number.isFinite(parsedCharacterId) || parsedCharacterId <= 0) {
				fieldError = labels.dialogRoleRequiredError;
				return;
			}
		} else {
			if (!newCharacterName.trim()) {
				fieldError = labels.dialogNewRoleRequiredError;
				return;
			}

			if (!primaryGameId) {
				dialogError = labels.dialogMissingGameBody;
				return;
			}
		}

		applying = true;
		errorMessage = '';

		try {
			const payload =
				mode === 'select'
					? { characterId: Number(selectedCharacterId) }
					: {
							newCharacter: {
								gameId: primaryGameId as number,
								name: newCharacterName.trim(),
							},
						};
			const response = await getApiAdapter().applyToOrganization(organization, payload);
			localMembershipStatus = 'pending';
			if (typeof window !== 'undefined' && isAuthenticatedSession(session)) {
				writeCachedOrganizationMembershipRecord(window.localStorage, {
					organization,
					userId: session.user.id,
					memberId: response.member.id,
					status: response.member.status,
				});
			}
			await refreshMyOrganizationsCache();
			closeModal();
			onApplied?.();
		} catch (error) {
			dialogError = getErrorMessage(error, labels.errorTitle);
			errorMessage = dialogError;
		} finally {
			applying = false;
		}
	}
</script>

{#if !isHidden}
	<div class="apply-org-action">
		<button type="button" class="apply-org-button" on:click={() => void handleOpen()} disabled={applying}>
			{applying ? labels.applyingLabel : labels.applyLabel}
		</button>
		{#if errorMessage}
			<p class="apply-org-error">{labels.errorTitle}: {errorMessage}</p>
		{/if}
	</div>

	{#if modalOpen}
		<div class="apply-modal-backdrop" role="presentation" on:click={handleBackdropClick}>
			<section class="apply-modal" role="dialog" aria-modal="true" aria-labelledby="apply-org-dialog-title">
				<div class="apply-modal-card">
					<h2 id="apply-org-dialog-title">{labels.dialogTitle}</h2>
					<p>{labels.dialogIntro}</p>

					<div class="apply-mode-switch">
						<button
							type="button"
							class:active={mode === 'select'}
							class="apply-mode-button"
							on:click={() => selectMode('select')}
						>
							{labels.dialogChooseTabLabel}
						</button>
						<button
							type="button"
							class:active={mode === 'create'}
							class="apply-mode-button"
							on:click={() => selectMode('create')}
						>
							{labels.dialogCreateTabLabel}
						</button>
					</div>

					{#if loadingContext}
						<p class="apply-modal-note">{labels.dialogLoadingLabel}</p>
					{:else if mode === 'select'}
						<label class="apply-field">
							<span>{labels.dialogRoleFieldLabel}</span>
							<SearchSelect
								items={roleItems}
								value={selectedCharacterId}
								placeholder={labels.dialogRolePlaceholder}
								emptyLabel={labels.dialogRoleEmptyLabel}
								error={Boolean(fieldError)}
								ariaLabel={labels.dialogRoleFieldLabel}
								on:change={(event) => {
									selectedCharacterId = event.detail.value;
									fieldError = '';
								}}
							/>
							{#if fieldError}<em>{fieldError}</em>{/if}
							<em>{roleItems.length > 0 ? labels.dialogRoleHint : labels.dialogNoRolesBody}</em>
						</label>
					{:else}
						<label class="apply-field">
							<span>{labels.dialogNewRoleFieldLabel}</span>
							<input
								type="text"
								bind:value={newCharacterName}
								class:error={Boolean(fieldError)}
								placeholder={labels.dialogNewRolePlaceholder}
								autocomplete="off"
								on:input={() => {
									fieldError = '';
								}}
							/>
							{#if fieldError}<em>{fieldError}</em>{/if}
							<em>{labels.dialogNewRoleHint}</em>
							{#if primaryGameName}
								<em>{labels.dialogGameHintPrefix}: {primaryGameName}</em>
							{/if}
						</label>
					{/if}

					{#if dialogError}
						<p class="apply-org-error">{labels.errorTitle}: {dialogError}</p>
					{/if}

					<div class="apply-modal-actions">
						<button type="button" class="apply-modal-secondary" on:click={closeModal} disabled={applying}>
							{labels.dialogCancelLabel}
						</button>
						<button
							type="button"
							class="apply-modal-primary"
							on:click={() => void handleApply()}
							disabled={applying || loadingContext}
						>
							{applying ? labels.applyingLabel : labels.dialogSubmitLabel}
						</button>
					</div>
				</div>
			</section>
		</div>
	{/if}
{/if}

<style>
	.apply-org-action {
		display: grid;
		gap: 8px;
	}

	.apply-org-button,
	.apply-modal-primary,
	.apply-modal-secondary,
	.apply-mode-button,
	.apply-field input {
		font: inherit;
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

	.apply-org-button:hover:not(:disabled),
	.apply-modal-primary:hover:not(:disabled),
	.apply-modal-secondary:hover:not(:disabled),
	.apply-mode-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.apply-org-button:disabled,
	.apply-modal-primary:disabled,
	.apply-modal-secondary:disabled {
		cursor: progress;
		opacity: 0.78;
	}

	.apply-org-error {
		margin: 0;
		font-size: 0.84rem;
		line-height: 1.55;
		color: #b91c1c;
	}

	.apply-modal-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.apply-modal {
		width: min(560px, 100%);
	}

	.apply-modal-card {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 16px;
	}

	.apply-modal-card h2,
	.apply-modal-card p {
		margin: 0;
	}

	.apply-modal-card p,
	.apply-modal-note,
	.apply-field em {
		line-height: 1.7;
		color: var(--text-soft);
	}

	.apply-mode-switch {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.apply-mode-button {
		min-height: 46px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
		font-weight: 700;
		cursor: pointer;
	}

	.apply-mode-button.active {
		border-color: color-mix(in srgb, var(--ledger-accent) 45%, var(--line));
		background: color-mix(in srgb, var(--ledger-accent) 18%, white);
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	:root[data-theme='dark'] .apply-mode-button.active {
		border-color: color-mix(in srgb, var(--ledger-accent) 42%, var(--line));
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--ledger-accent) 30%, rgba(255, 255, 255, 0.08)) 0%,
			color-mix(in srgb, var(--surface-strong) 94%, rgba(44, 120, 79, 0.18)) 100%
		);
		color: color-mix(in srgb, white 92%, var(--ledger-accent));
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.apply-field {
		display: grid;
		gap: 8px;
	}

	.apply-field span {
		font-size: 0.92rem;
		font-weight: 700;
	}

	.apply-field input {
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		color: var(--text-main);
	}

	.apply-field input.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.apply-field em {
		font-style: normal;
		font-size: 0.82rem;
	}

	.apply-field em:has(+ em) {
		margin-bottom: -2px;
	}

	.apply-modal-actions {
		margin-top: 8px;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.apply-modal-primary,
	.apply-modal-secondary {
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

	.apply-modal-primary {
		border: 1px solid color-mix(in srgb, var(--ledger-accent) 45%, var(--line));
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--ledger-accent) 88%, white),
			color-mix(in srgb, var(--ledger-accent) 56%, white)
		);
		color: color-mix(in srgb, var(--ledger-accent-deep) 88%, var(--text-main));
	}

	.apply-modal-secondary {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 82%, white);
		color: var(--text-main);
	}

	@media (max-width: 720px) {
		.apply-org-button {
			width: 100%;
		}

		.apply-modal-card {
			padding: 22px;
			border-radius: 22px;
		}

		.apply-mode-switch,
		.apply-modal-actions {
			grid-template-columns: 1fr;
			flex-direction: column-reverse;
		}

		.apply-modal-primary,
		.apply-modal-secondary {
			width: 100%;
		}
	}
</style>
