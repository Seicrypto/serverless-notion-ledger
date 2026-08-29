<script lang="ts">
	import { onMount } from 'svelte';

	import RequestStatusDialog from './RequestStatusDialog.svelte';
	import GamePicker from '../../shared/GamePicker.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { getErrorMessage } from '../../../libs/api/auth/session.ts';
	import { refreshMyOrganizationsCache } from '../../../libs/api/organizations/my-organizations-cache.ts';

interface GameOption {
	id: number;
	name: string;
	iconUrl: string | null;
	officialSiteUrl: string | null;
	resolvedIconUrl: string | null;
}

	interface Labels {
		nameLabel: string;
		descriptionLabel: string;
		iconUrlLabel: string;
		gameLabel: string;
		characterNameLabel: string;
		characterSlugLabel: string;
		characterNotesLabel: string;
		requiredHint: string;
		optionalHint: string;
		submitLabel: string;
		namePlaceholder: string;
		descriptionPlaceholder: string;
		iconUrlPlaceholder: string;
		characterNamePlaceholder: string;
		characterSlugPlaceholder: string;
		characterNotesPlaceholder: string;
		validationRequired: string;
		validationSlug: string;
		validationUrl: string;
		validationNameLength: string;
		validationSlugLength: string;
		validationDescriptionLength: string;
		validationNotesLength: string;
		validationGameRequired: string;
		loadingGames: string;
		loadingCreateTitle: string;
		loadingCreateBody: string;
		errorCreateTitle: string;
		errorTimeoutBody: string;
		errorRetryLabel: string;
		successCreateTitle: string;
		successCreateBodyPrefix: string;
		goHomeLabel: string;
		goManageLabelPrefix: string;
	}

type FieldErrors = Record<string, string>;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CREATE_TIMEOUT_MS = 15000;

	export let lang: string;
	export let labels: Labels;

	let games: GameOption[] = [];
	let gamesLoading = true;
	let gamesError = '';

	let name = '';
	let description = '';
	let iconUrl = '';
	let gameId = '';
	let initialCharacterName = '';
	let initialCharacterSlug = '';
	let initialCharacterNotes = '';

	let errors: FieldErrors = {};
	let isSubmitting = false;

	let dialogOpen = false;
	let dialogState: 'pending' | 'success' | 'error' = 'pending';
	let dialogTitle = '';
	let dialogMessage = '';
	let dialogPrimaryAction: { label: string; href?: string; onClick?: () => void } | null = null;
	let dialogSecondaryAction: { label: string; href?: string; onClick?: () => void } | null = null;

	const openPendingDialog = () => {
		dialogOpen = true;
		dialogState = 'pending';
		dialogTitle = labels.loadingCreateTitle;
		dialogMessage = labels.loadingCreateBody;
		dialogPrimaryAction = null;
		dialogSecondaryAction = null;
	};

	const openErrorDialog = (message: string) => {
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
		dialogSecondaryAction = {
			label: labels.goHomeLabel,
			href: `/${lang}/`,
		};
	};

	const openSuccessDialog = (orgName: string, organizationReference: string) => {
		dialogOpen = true;
		dialogState = 'success';
		dialogTitle = labels.successCreateTitle;
		dialogMessage = `${labels.successCreateBodyPrefix} ${orgName}`;
		dialogSecondaryAction = {
			label: labels.goHomeLabel,
			href: `/${lang}/`,
		};
		dialogPrimaryAction = {
			label: `${labels.goManageLabelPrefix} ${orgName}`,
			href: `/${lang}/guilds/manage?orgVanity=${encodeURIComponent(organizationReference)}`,
		};
	};

	const validate = () => {
		const nextErrors: FieldErrors = {};

		if (!name.trim()) {
			nextErrors.name = labels.validationRequired;
		} else if (name.trim().length > 100) {
			nextErrors.name = labels.validationNameLength;
		}

		if (description.trim().length > 500) {
			nextErrors.description = labels.validationDescriptionLength;
		}

		if (iconUrl.trim()) {
			try {
				new URL(iconUrl.trim());
			} catch {
				nextErrors.iconUrl = labels.validationUrl;
			}
		}

		if (!gameId) {
			nextErrors.gameId = labels.validationGameRequired;
		}

		if (!initialCharacterName.trim()) {
			nextErrors.initialCharacterName = labels.validationRequired;
		} else if (initialCharacterName.trim().length > 100) {
			nextErrors.initialCharacterName = labels.validationNameLength;
		}

		const normalizedCharacterSlug = initialCharacterSlug.trim();
		if (normalizedCharacterSlug) {
			if (normalizedCharacterSlug.length < 2 || normalizedCharacterSlug.length > 80) {
				nextErrors.initialCharacterSlug = labels.validationSlugLength;
			} else if (!SLUG_PATTERN.test(normalizedCharacterSlug)) {
				nextErrors.initialCharacterSlug = labels.validationSlug;
			}
		}

		if (initialCharacterNotes.trim().length > 1000) {
			nextErrors.initialCharacterNotes = labels.validationNotesLength;
		}

		errors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const loadGames = async () => {
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
			if (!gameId && games[0]) {
				gameId = String(games[0].id);
			}
		} catch (error) {
			gamesError = getErrorMessage(error, labels.errorCreateTitle);
		} finally {
			gamesLoading = false;
		}
	};

	const resetForm = () => {
		name = '';
		description = '';
		iconUrl = '';
		initialCharacterName = '';
		initialCharacterSlug = '';
		initialCharacterNotes = '';
		errors = {};
	};

	const submit = async () => {
		if (isSubmitting || !validate()) {
			return;
		}

		isSubmitting = true;
		openPendingDialog();

		let timedOut = false;
		const timeoutId = window.setTimeout(() => {
			timedOut = true;
			openErrorDialog(labels.errorTimeoutBody);
		}, CREATE_TIMEOUT_MS);

		try {
			const response = await getApiAdapter().createOrganization({
				name: name.trim(),
				description: description.trim() || undefined,
				iconUrl: iconUrl.trim() || undefined,
				initialCharacter: {
					gameId: Number(gameId),
					name: initialCharacterName.trim(),
					slug: initialCharacterSlug.trim() || undefined,
					notes: initialCharacterNotes.trim() || undefined,
				},
			});

			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			resetForm();
			try {
				await refreshMyOrganizationsCache();
			} catch {
				// Ignore cache refresh failures after creation succeeds.
			}
			openSuccessDialog(
				response.organization.name,
				(typeof response.organization.vanity === 'string' ? response.organization.vanity : '') ||
					String(response.organization.id),
			);
		} catch (error) {
			if (timedOut) {
				return;
			}

			window.clearTimeout(timeoutId);
			openErrorDialog(getErrorMessage(error, labels.errorCreateTitle));
		} finally {
			isSubmitting = false;
		}
	};

	onMount(() => {
		void loadGames();
	});
</script>

<section class="create-org-shell">
	<form
		class="create-org-form"
		on:submit|preventDefault={() => {
			void submit();
		}}
	>
		<div class="create-org-grid">
			<label class="create-org-field">
				<span>{labels.nameLabel}</span>
				<input class:error={Boolean(errors.name)} bind:value={name} type="text" maxlength="100" placeholder={labels.namePlaceholder} />
				<small>{labels.requiredHint}</small>
				{#if errors.name}<em>{errors.name}</em>{/if}
			</label>

			<label class="create-org-field create-org-field-wide">
				<span>{labels.descriptionLabel}</span>
				<textarea class:error={Boolean(errors.description)} bind:value={description} rows="4" maxlength="500" placeholder={labels.descriptionPlaceholder}></textarea>
				<small>{labels.optionalHint}</small>
				{#if errors.description}<em>{errors.description}</em>{/if}
			</label>

			<label class="create-org-field create-org-field-wide">
				<span>{labels.iconUrlLabel}</span>
				<input class:error={Boolean(errors.iconUrl)} bind:value={iconUrl} type="url" maxlength="2048" placeholder={labels.iconUrlPlaceholder} />
				<small>{labels.optionalHint}</small>
				{#if errors.iconUrl}<em>{errors.iconUrl}</em>{/if}
			</label>

			<label class="create-org-field">
				<span>{labels.gameLabel}</span>
				<GamePicker
					bind:value={gameId}
					ariaLabel={labels.gameLabel}
					placeholder={gamesLoading ? labels.loadingGames : labels.gameLabel}
					disabled={gamesLoading || games.length === 0}
					error={Boolean(errors.gameId)}
					items={games.map((game) => ({
						value: String(game.id),
						label: game.name,
						iconUrl: game.iconUrl,
						officialSiteUrl: game.officialSiteUrl,
						resolvedIconUrl: game.resolvedIconUrl,
					}))}
				/>
				<small>{labels.requiredHint}</small>
				{#if errors.gameId}<em>{errors.gameId}</em>{/if}
				{#if gamesError}<em>{gamesError}</em>{/if}
			</label>

			<label class="create-org-field">
				<span>{labels.characterNameLabel}</span>
				<input class:error={Boolean(errors.initialCharacterName)} bind:value={initialCharacterName} type="text" maxlength="100" placeholder={labels.characterNamePlaceholder} />
				<small>{labels.requiredHint}</small>
				{#if errors.initialCharacterName}<em>{errors.initialCharacterName}</em>{/if}
			</label>

			<label class="create-org-field">
				<span>{labels.characterSlugLabel}</span>
				<input class:error={Boolean(errors.initialCharacterSlug)} bind:value={initialCharacterSlug} type="text" maxlength="80" placeholder={labels.characterSlugPlaceholder} />
				<small>{labels.optionalHint}</small>
				{#if errors.initialCharacterSlug}<em>{errors.initialCharacterSlug}</em>{/if}
			</label>

			<label class="create-org-field create-org-field-wide">
				<span>{labels.characterNotesLabel}</span>
				<textarea class:error={Boolean(errors.initialCharacterNotes)} bind:value={initialCharacterNotes} rows="4" maxlength="1000" placeholder={labels.characterNotesPlaceholder}></textarea>
				<small>{labels.optionalHint}</small>
				{#if errors.initialCharacterNotes}<em>{errors.initialCharacterNotes}</em>{/if}
			</label>
		</div>

		<div class="create-org-actions">
			<button class="create-org-submit" type="submit" disabled={isSubmitting || gamesLoading}>
				{labels.submitLabel}
			</button>
		</div>
	</form>

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
	.create-org-shell {
		width: min(960px, 100%);
		margin: 24px auto 0;
	}

	.create-org-form {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.create-org-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.create-org-field {
		display: grid;
		gap: 8px;
	}

	.create-org-field-wide {
		grid-column: 1 / -1;
	}

	.create-org-field span {
		font-size: 0.94rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.create-org-field input,
	.create-org-field textarea {
		width: 100%;
		min-height: 48px;
		padding: 0 16px;
		border-radius: 16px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.create-org-field textarea {
		min-height: 120px;
		padding: 14px 16px;
		resize: vertical;
	}

	.create-org-field input.error,
	.create-org-field textarea.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.create-org-field small {
		color: var(--text-soft);
		line-height: 1.5;
	}

	.create-org-field em {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.create-org-actions {
		margin-top: 22px;
		display: flex;
		justify-content: flex-end;
	}

	.create-org-submit {
		min-height: 48px;
		padding: 0 20px;
		border: 1px solid transparent;
		border-radius: 999px;
		background: var(--text-main);
		color: var(--surface-strong);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			opacity 0.18s ease;
	}

	.create-org-submit:hover {
		transform: translateY(-1px);
		background: color-mix(in srgb, var(--text-main) 88%, black);
	}

	.create-org-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	@media (max-width: 720px) {
		.create-org-form {
			padding: 22px;
			border-radius: 22px;
		}

		.create-org-grid {
			grid-template-columns: 1fr;
		}

		.create-org-actions {
			justify-content: stretch;
		}

		.create-org-submit {
			width: 100%;
		}
	}
</style>
