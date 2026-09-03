<script lang="ts">
	import { onMount } from 'svelte';

	import AccessNoticeCard from '../shared/AccessNoticeCard.svelte';
	import GamePicker from '../../shared/GamePicker.svelte';
	import SearchSelect from '../../shared/SearchSelect.svelte';
	import RequestStatusDialog from './RequestStatusDialog.svelte';
	import SensitiveActionConfirmModal from './SensitiveActionConfirmModal.svelte';
	import { getApiAdapter } from '../../../libs/api/adapters/api.adapter.ts';
	import { ensureAuthSession, getErrorMessage, isAuthenticatedSession, subscribeAuthSession, type AuthSession } from '../../../libs/api/auth/session.ts';
	import {
		clearOrganizationManageCache,
		ensureOrganizationManageCache,
		refreshOrganizationManageCache,
		type OrganizationManageCharacter,
		type OrganizationManageMember,
		type OrganizationManageSummary,
	} from '../../../libs/api/organizations/manage-workspace-cache.ts';
	import {
		ensureMyOrganizationsCache,
		refreshMyOrganizationsCache,
	} from '../../../libs/api/organizations/my-organizations-cache.ts';
	import {
		clearRecentCharacterClaimRequest,
		getRecentCharacterClaimRequestsByOrganization,
		loadRecentCharacterClaimRequests,
		recordRecentCharacterClaimRequest,
		type RecentCharacterClaimRequestEntry,
	} from '../../../libs/organizations/recent-character-claim-requests.ts';
	import {
		getOrganizationReference,
		resolveOrganizationQuery,
	} from '../../../libs/organizations/reference.ts';

	interface Labels {
		title: string;
		intro: string;
		loadingLabel: string;
		authRequiredTitle: string;
		authRequiredBody: string;
		loginLabel: string;
		homeLabel: string;
		missingOrgTitle: string;
		missingOrgBody: string;
		orgCardEditLabel: string;
		orgCardMembersLabel: string;
		orgCardCharactersLabel: string;
		orgCardSupportedLabel: string;
		orgCardVanityLabel: string;
		tabCharactersLabel: string;
		tabMembersLabel: string;
		charactersCreateLabel: string;
		charactersRefreshLabel: string;
		membersInviteLabel: string;
		membersPendingLabel: string;
		refreshCooldownLabel: string;
		refreshingLabel: string;
		inviteSearchFieldLabel: string;
		inviteSearchInputLabel: string;
		inviteSearchDisplayNameOption: string;
		inviteSearchEmailOption: string;
		inviteSearchPlaceholderDisplayName: string;
		inviteSearchPlaceholderEmail: string;
		inviteSearchValidationEmail: string;
		inviteSearchSubmitLabel: string;
		inviteSearchCancelLabel: string;
		editOrgTitle: string;
		editOrgNameLabel: string;
		editOrgDescriptionLabel: string;
		editOrgIconUrlLabel: string;
		editOrgSubmitLabel: string;
		editOrgCancelLabel: string;
		editCharacterTitle: string;
		editCharacterSubmitLabel: string;
		editCharacterCancelLabel: string;
		editCharacterActiveLabel: string;
		createCharacterTitle: string;
		createCharacterNameLabel: string;
		createCharacterDescriptionLabel: string;
		createCharacterGameLabel: string;
		createCharacterGameHint: string;
		createCharacterAssigneeLabel: string;
		createCharacterAssigneeHint: string;
		createCharacterSubmitLabel: string;
		createCharacterCancelLabel: string;
		characterNameColumn: string;
		characterClaimStateColumn: string;
		characterClaimByColumn: string;
		characterDescriptionColumn: string;
		characterActionsColumn: string;
		memberNameColumn: string;
		memberActionsColumn: string;
		claimStateClaimed: string;
		claimStateUnclaimed: string;
		claimStatePending: string;
		claimCharacterLabel: string;
		manageClaimLabel: string;
		claimCharacterTitle: string;
		claimCharacterTargetLabel: string;
		claimCharacterTargetHint: string;
		claimCharacterSearchPlaceholder: string;
		claimCharacterSearchEmpty: string;
		claimCharacterCurrentHolderLabel: string;
		claimCharacterPendingNote: string;
		claimCharacterRequestSubmitLabel: string;
		claimCharacterAssignSubmitLabel: string;
		claimCharacterTransferSubmitLabel: string;
		claimCharacterUnclaimLabel: string;
		claimCharacterRemovePendingLabel: string;
		editLabel: string;
		deleteLabel: string;
		removeMemberLabel: string;
		removeMemberPendingTitle: string;
		removeMemberPendingBody: string;
		removeMemberSuccessTitle: string;
		removeMemberErrorTitle: string;
		charactersGameScopeLabel: string;
		charactersGameScopeHint: string;
		charactersManageGameLabel: string;
		charactersAddGameLabel: string;
		charactersUnknownGameLabel: string;
		charactersEmptyForGameTitle: string;
		addGameComingSoonTitle: string;
		addGameComingSoonBody: string;
		pendingBadgeLabel: string;
		currentUserLabel: string;
		placeholderActionTitle: string;
		placeholderActionBody: string;
		savePendingTitle: string;
		savePendingBody: string;
		saveSuccessTitle: string;
		saveSuccessBody: string;
		saveErrorTitle: string;
		deletePendingTitle: string;
		deletePendingBody: string;
		deleteSuccessTitle: string;
		deleteSuccessBody: string;
		deleteErrorTitle: string;
		claimPendingTitle: string;
		claimPendingBody: string;
		claimSuccessTitle: string;
		claimSuccessBody: string;
		claimErrorTitle: string;
		claimValidationTargetRequired: string;
		createPendingTitle: string;
		createPendingBody: string;
		createSuccessTitle: string;
		createSuccessBody: string;
		createErrorTitle: string;
		createMissingGameBody: string;
		confirmLabel: string;
		closeLabel: string;
		sensitiveZoneTitle: string;
		sensitiveZoneBody: string;
		leaveGuildLabel: string;
		deleteGuildLabel: string;
		sensitiveConfirmBodyLeave: string;
		sensitiveConfirmBodyDeleteGuild: string;
		sensitiveConfirmBodyDeleteCharacter: string;
		sensitiveConfirmHintPrefix: string;
		sensitiveConfirmValidation: string;
		sensitiveCopyLabel: string;
		sensitiveWorkingLabel: string;
		leavePendingTitle: string;
		leavePendingBody: string;
		leaveSuccessTitle: string;
		leaveSuccessBody: string;
		leaveErrorTitle: string;
		deleteGuildPendingTitle: string;
		deleteGuildPendingBody: string;
		deleteGuildSuccessTitle: string;
		deleteGuildSuccessBody: string;
		deleteGuildErrorTitle: string;
		validationRequired: string;
		validationUrl: string;
		validationNameLength: string;
		validationDescriptionLength: string;
		emptyCharactersTitle: string;
		emptyMembersTitle: string;
	}

	type ActiveTab = 'characters' | 'members';
	type DialogState = 'pending' | 'success' | 'error';

	interface FieldErrors {
		name?: string;
		description?: string;
		iconUrl?: string;
		characterName?: string;
		characterDescription?: string;
		characterGame?: string;
		claimTarget?: string;
	}

	const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;
	const REFRESH_KEY_PREFIX = 'raid-ledger.org-manage-last-refresh';

	export let lang: string;
	export let orgVanity: string | null = null;
	export let labels: Labels;

	let session: AuthSession | null = null;
	let loading = true;
	let workspaceError = '';
	let organization: OrganizationManageSummary | null = null;
	let characters: OrganizationManageCharacter[] = [];
	let members: OrganizationManageMember[] = [];
	let activeTab: ActiveTab = 'characters';
	let refreshLockedUntil = 0;
	let isRefreshing = false;

	let editOrgOpen = false;
	let editName = '';
	let editDescription = '';
	let editIconUrl = '';

	let createCharacterOpen = false;
	let createCharacterName = '';
	let createCharacterDescription = '';
	let createCharacterGameId = '';

	let editCharacterOpen = false;
	let editingCharacterId: number | null = null;
	let editCharacterName = '';
	let editCharacterDescription = '';
	let editCharacterGameId = '';
	let editCharacterActive = true;

	let claimCharacterOpen = false;
	let claimCharacterId: number | null = null;
	let claimTargetMemberId = '';

	let inviteMemberOpen = false;
	let inviteSearchField: 'displayName' | 'email' = 'displayName';
	let inviteSearchQuery = '';
	let inviteSearchError = '';

	let fieldErrors: FieldErrors = {};
	let now = Date.now();

	let statusOpen = false;
	let statusState: DialogState = 'pending';
	let statusTitle = '';
	let statusMessage = '';
	let statusPrimaryAction: { label: string; onClick?: () => void; href?: string } | null = null;
	let sensitiveActionOpen = false;
	let sensitiveActionSubmitting = false;
	let currentMembershipRole: 'owner' | 'admin' | 'member' | null = null;
	let currentMembershipStatus: 'pending' | 'active' | null = null;
	let sensitiveAction:
		| {
				kind: 'delete-character' | 'leave-guild' | 'delete-guild';
				targetName: string;
		  }
		| null = null;

	let selectedCharacterGameId = '';
	let recentClaimRequests: RecentCharacterClaimRequestEntry[] = [];

	const toRefreshKey = (targetOrgVanity: string) => `${REFRESH_KEY_PREFIX}:${targetOrgVanity}`;

	const hydrateRefreshCooldown = () => {
		if (typeof window === 'undefined' || !orgVanity) {
			return;
		}

		const raw = window.sessionStorage.getItem(toRefreshKey(orgVanity));
		refreshLockedUntil = raw ? Number(raw) : 0;
	};

	const writeRefreshCooldown = () => {
		if (typeof window === 'undefined' || !orgVanity) {
			return;
		}

		refreshLockedUntil = Date.now() + MANUAL_REFRESH_COOLDOWN_MS;
		window.sessionStorage.setItem(toRefreshKey(orgVanity), String(refreshLockedUntil));
	};

	const isRefreshCoolingDown = () => refreshLockedUntil > now;

	const resetStatusDialog = () => {
		statusOpen = false;
		statusPrimaryAction = null;
	};

	const openStatus = (
		state: DialogState,
		title: string,
		message: string,
		primaryAction: { label: string; onClick?: () => void; href?: string } | null = null,
	) => {
		statusOpen = true;
		statusState = state;
		statusTitle = title;
		statusMessage = message;
		statusPrimaryAction = primaryAction;
	};

	const closeSensitiveAction = () => {
		if (sensitiveActionSubmitting) {
			return;
		}

		sensitiveActionOpen = false;
		sensitiveAction = null;
	};

	const fillEditForm = () => {
		if (!organization) {
			return;
		}

		editName = organization.name;
		editDescription = organization.description ?? '';
		editIconUrl = organization.iconUrl ?? '';
		fieldErrors = {};
	};

	const getMemberDisplayName = (member: OrganizationManageMember) => {
		if (member.displayName?.trim()) {
			return member.displayName;
		}

		if (isAuthenticatedSession(session) && session.user.id === member.userId) {
			return session.user.displayName?.trim() || `${labels.currentUserLabel} @${session.user.vanity ?? member.userId}`;
		}

		return member.vanity ? `@${member.vanity}` : `User #${member.userId}`;
	};

	const getCurrentMember = () => {
		if (!isAuthenticatedSession(session)) {
			return null;
		}

		return members.find((member) => member.userId === session.user.id) ?? null;
	};

	const getCurrentMembershipRoleFromSnapshot = async () => {
		if (!isAuthenticatedSession(session) || !organization) {
			currentMembershipRole = null;
			currentMembershipStatus = null;
			return;
		}

		try {
			const snapshot = await ensureMyOrganizationsCache();
			const matched = snapshot.organizations.find(
				(entry) =>
					entry.id === organization.id ||
					getOrganizationReference(entry) ===
						(organization.vanity?.trim() || String(organization.id)),
			);

			currentMembershipRole = matched?.membership?.role ?? null;
			currentMembershipStatus = matched?.membership?.status ?? null;
		} catch {
			currentMembershipRole = null;
			currentMembershipStatus = null;
		}
	};

	const getClaimStateLabel = (character: OrganizationManageCharacter) => {
		if (getPendingClaimRequest(character.id)) {
			return labels.claimStatePending;
		}

		if (character.isClaimed) {
			return labels.claimStateClaimed;
		}

		return labels.claimStateUnclaimed;
	};

	const getCharacterClaimDisplay = (character: OrganizationManageCharacter) => {
		const pendingRequest = getPendingClaimRequest(character.id);
		if (pendingRequest) {
			return `${getMemberDisplayNameByUserId(pendingRequest.targetUserId)} (${labels.claimStatePending})`;
		}

		if (!character.claimedBy) {
			return null;
		}

		if (character.claimedBy.displayName?.trim()) {
			return character.claimedBy.displayName;
		}

		if (character.claimedBy.vanity) {
			return `@${character.claimedBy.vanity}`;
		}

		return `User #${character.claimedBy.userId}`;
	};

	const getPrimaryManageGameId = () => {
		if (organization?.games.length) {
			const primaryGame = organization.games.find((game) => game.primary) ?? organization.games[0];
			return String(primaryGame.gameId);
		}

		const firstCharacterGameId = characters.find((character) => typeof character.gameId === 'number')?.gameId;
		return typeof firstCharacterGameId === 'number' ? String(firstCharacterGameId) : '';
	};

	const getMemberDisplayNameByUserId = (userId: number) => {
		const matchedMember = members.find((member) => member.userId === userId);
		if (matchedMember) {
			return getMemberDisplayName(matchedMember);
		}

		if (isAuthenticatedSession(session) && session.user.id === userId) {
			return session.user.displayName?.trim() || `${labels.currentUserLabel} @${session.user.vanity ?? userId}`;
		}

		return `User #${userId}`;
	};

	const getPendingClaimRequest = (characterId: number) =>
		currentOrganizationClaimRequests.find(
			(entry) => entry.characterId === characterId && entry.status === 'pending_confirmation',
		) ?? null;

	const getCharacterById = (characterId: number | null) =>
		characterId ? characters.find((character) => character.id === characterId) ?? null : null;

	const getClaimDisplayByCharacterId = (characterId: number | null) => {
		const character = getCharacterById(characterId);
		return character ? getCharacterClaimDisplay(character) : null;
	};

	const getGameLabel = (gameId: number | string | null | undefined) => {
		const normalizedGameId = Number(gameId);
		if (!Number.isFinite(normalizedGameId)) {
			return labels.charactersUnknownGameLabel;
		}

		const matchedGame = organization?.games.find((game) => game.gameId === normalizedGameId);
		if (matchedGame) {
			return matchedGame.displayName?.trim() || matchedGame.name;
		}

		const matchedCharacterGame = characters.find((character) => character.game?.gameId === normalizedGameId)?.game;
		if (matchedCharacterGame) {
			return matchedCharacterGame.displayName?.trim() || matchedCharacterGame.name;
		}

		return `${labels.charactersUnknownGameLabel} #${normalizedGameId}`;
	};

	$: availableCharacterGameIds = Array.from(
		new Set([
			...(organization?.games.map((game) => game.gameId) ?? []),
			...characters.map((character) => character.gameId).filter((gameId): gameId is number => typeof gameId === 'number'),
		]),
	);

	$: availableCharacterGames = availableCharacterGameIds.map((gameId) => ({
		gameId,
		name: getGameLabel(gameId),
		iconUrl: organization?.games.find((game) => game.gameId === gameId)?.iconUrl ?? null,
		officialSiteUrl: organization?.games.find((game) => game.gameId === gameId)?.officialSiteUrl ?? null,
		resolvedIconUrl: organization?.games.find((game) => game.gameId === gameId)?.resolvedIconUrl ?? null,
		primary: organization?.games.some((game) => game.gameId === gameId && game.primary) ?? false,
	}));

	$: currentOrganizationClaimRequests = orgVanity
		? getRecentCharacterClaimRequestsByOrganization(recentClaimRequests, orgVanity)
		: [];

	$: memberSearchItems = members.map((member) => ({
		value: String(member.memberId),
		label: getMemberDisplayName(member),
		metaLabel: member.role,
	}));

	$: currentMember = getCurrentMember();
	$: effectiveCurrentMembershipRole = currentMember?.role ?? currentMembershipRole;
	$: isCurrentMemberOwner = effectiveCurrentMembershipRole === 'owner';
	$: sensitiveActionTitle =
		sensitiveAction?.kind === 'delete-character'
			? labels.deleteLabel
			: sensitiveAction?.kind === 'delete-guild'
				? labels.deleteGuildLabel
				: labels.leaveGuildLabel;
	$: sensitiveActionBody =
		sensitiveAction?.kind === 'delete-character'
			? labels.sensitiveConfirmBodyDeleteCharacter
			: sensitiveAction?.kind === 'delete-guild'
				? labels.sensitiveConfirmBodyDeleteGuild
				: labels.sensitiveConfirmBodyLeave;
	$: sensitiveActionConfirmLabel =
		sensitiveAction?.kind === 'delete-character'
			? labels.deleteLabel
			: sensitiveAction?.kind === 'delete-guild'
				? labels.deleteGuildLabel
				: labels.leaveGuildLabel;
	$: sensitiveActionHelperLabel = sensitiveAction
		? `${labels.sensitiveConfirmHintPrefix} ${sensitiveAction.targetName}`
		: labels.sensitiveConfirmHintPrefix;

	const openAddGameComingSoon = () => {
		openStatus('success', labels.addGameComingSoonTitle, labels.addGameComingSoonBody, {
			label: labels.confirmLabel,
			onClick: resetStatusDialog,
		});
	};

	$: if (activeTab === 'characters' && availableCharacterGames.length > 0 && !selectedCharacterGameId) {
		selectedCharacterGameId = getPrimaryManageGameId();
	}

	$: if (
		selectedCharacterGameId &&
		!availableCharacterGames.some((game) => String(game.gameId) === selectedCharacterGameId)
	) {
		selectedCharacterGameId = getPrimaryManageGameId();
	}

	$: if (!createCharacterGameId && availableCharacterGames.length > 0) {
		createCharacterGameId = selectedCharacterGameId || getPrimaryManageGameId();
	}

	$: if (
		createCharacterGameId &&
		!availableCharacterGames.some((game) => String(game.gameId) === createCharacterGameId)
	) {
		createCharacterGameId = selectedCharacterGameId || getPrimaryManageGameId();
	}

	$: filteredCharacters =
		activeTab === 'characters' && selectedCharacterGameId
			? characters.filter((character) => String(character.gameId ?? '') === selectedCharacterGameId)
			: characters;

	const loadWorkspace = async (forceRefresh = false) => {
		if (!orgVanity || !isAuthenticatedSession(session)) {
			loading = false;
			return;
		}

		loading = true;
		workspaceError = '';

		try {
			const snapshot = forceRefresh
				? await refreshOrganizationManageCache(orgVanity)
				: await ensureOrganizationManageCache(orgVanity);
			organization = snapshot.organization;
			characters = snapshot.characters;
			members = snapshot.members;
			await getCurrentMembershipRoleFromSnapshot();
			selectedCharacterGameId = getPrimaryManageGameId();
			createCharacterGameId = selectedCharacterGameId;
			fillEditForm();
		} catch (error) {
			workspaceError = getErrorMessage(error, labels.saveErrorTitle);
		} finally {
			loading = false;
			isRefreshing = false;
		}
	};

	const validateOrganizationPatch = () => {
		const nextErrors: FieldErrors = {};

		if (!editName.trim()) {
			nextErrors.name = labels.validationRequired;
		} else if (editName.trim().length > 100) {
			nextErrors.name = labels.validationNameLength;
		}

		if (editDescription.trim().length > 500) {
			nextErrors.description = labels.validationDescriptionLength;
		}

		if (editIconUrl.trim()) {
			try {
				new URL(editIconUrl.trim());
			} catch {
				nextErrors.iconUrl = labels.validationUrl;
			}
		}

		fieldErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const submitOrganizationPatch = async () => {
		if (!orgVanity || !validateOrganizationPatch()) {
			return;
		}

		editOrgOpen = false;
		openStatus('pending', labels.savePendingTitle, labels.savePendingBody);

		try {
			await getApiAdapter().updateOrganization(orgVanity, {
				name: editName.trim(),
				description: editDescription.trim() || undefined,
				iconUrl: editIconUrl.trim() || undefined,
			});
			clearOrganizationManageCache(orgVanity);
			await refreshMyOrganizationsCache();
			await loadWorkspace(true);
			openStatus('success', labels.saveSuccessTitle, labels.saveSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.saveErrorTitle, getErrorMessage(error, labels.saveErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const validateCreateCharacter = () => {
		const nextErrors: FieldErrors = {};

		if (!createCharacterName.trim()) {
			nextErrors.characterName = labels.validationRequired;
		} else if (createCharacterName.trim().length > 100) {
			nextErrors.characterName = labels.validationNameLength;
		}

		if (createCharacterDescription.trim().length > 1000) {
			nextErrors.characterDescription = labels.validationDescriptionLength;
		}

		if (!createCharacterGameId) {
			nextErrors.characterGame = labels.validationRequired;
		}

		fieldErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const openEditCharacter = (character: OrganizationManageCharacter) => {
		editingCharacterId = character.id;
		editCharacterName = character.name;
		editCharacterDescription = character.description ?? '';
		editCharacterGameId = typeof character.gameId === 'number' ? String(character.gameId) : selectedCharacterGameId;
		editCharacterActive = true;
		fieldErrors = {};
		editCharacterOpen = true;
	};

	const validateEditCharacter = () => {
		const nextErrors: FieldErrors = {};

		if (!editCharacterName.trim()) {
			nextErrors.characterName = labels.validationRequired;
		} else if (editCharacterName.trim().length > 100) {
			nextErrors.characterName = labels.validationNameLength;
		}

		if (editCharacterDescription.trim().length > 1000) {
			nextErrors.characterDescription = labels.validationDescriptionLength;
		}

		if (!editCharacterGameId) {
			nextErrors.characterGame = labels.validationRequired;
		}

		fieldErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	};

	const submitEditCharacter = async () => {
		if (!orgVanity || !editingCharacterId || !validateEditCharacter()) {
			return;
		}

		editCharacterOpen = false;
		openStatus('pending', labels.savePendingTitle, labels.savePendingBody);

		try {
			await getApiAdapter().updateOrganizationCharacter(orgVanity, editingCharacterId, {
				name: editCharacterName.trim(),
				description: editCharacterDescription.trim() || undefined,
				notes: editCharacterDescription.trim() || undefined,
				gameId: Number(editCharacterGameId),
				isActive: editCharacterActive,
			});
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.saveSuccessTitle, labels.saveSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.saveErrorTitle, getErrorMessage(error, labels.saveErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const openClaimCharacter = (character: OrganizationManageCharacter) => {
		claimCharacterId = character.id;
		const currentHolder = members.find((member) => member.userId === character.claimedBy?.userId);
		const pendingRequest = getPendingClaimRequest(character.id);
		claimTargetMemberId = pendingRequest?.targetMemberId
			? String(pendingRequest.targetMemberId)
			: currentHolder
				? String(currentHolder.memberId)
				: '';
		fieldErrors = {};
		claimCharacterOpen = true;
	};

	const validateClaimTarget = () => {
		if (claimTargetMemberId) {
			fieldErrors = { ...fieldErrors, claimTarget: undefined };
			return true;
		}

		fieldErrors = { ...fieldErrors, claimTarget: labels.claimValidationTargetRequired };
		return false;
	};

	const clearLocalClaimRequest = (characterId: number) => {
		if (typeof window === 'undefined' || !orgVanity) {
			return;
		}

		recentClaimRequests = clearRecentCharacterClaimRequest(window.localStorage, orgVanity, characterId);
	};

	const recordLocalClaimRequest = (
		character: OrganizationManageCharacter,
		targetMember: OrganizationManageMember,
		claimRequest: {
			requestedByUserId: number;
			targetUserId: number;
			targetMemberId: number | null | unknown;
			status: 'pending_confirmation' | 'accepted' | 'declined' | 'cancelled';
			createdAt: string;
			updatedAt: string;
		},
	) => {
		if (typeof window === 'undefined' || !orgVanity) {
			return;
		}

		recentClaimRequests = recordRecentCharacterClaimRequest(window.localStorage, {
			organization: orgVanity,
			characterId: character.id,
			characterName: character.name,
			gameId: character.gameId,
			requestedByUserId: claimRequest.requestedByUserId,
			targetUserId: targetMember.userId,
			targetMemberId: typeof claimRequest.targetMemberId === 'number' ? claimRequest.targetMemberId : targetMember.memberId,
			status: claimRequest.status,
			createdAt: claimRequest.createdAt,
			updatedAt: claimRequest.updatedAt,
		});
	};

	const submitClaimRequest = async () => {
		if (!orgVanity || !claimCharacterId || !validateClaimTarget()) {
			return;
		}

		const character = characters.find((entry) => entry.id === claimCharacterId);
		const targetMember = members.find((member) => String(member.memberId) === claimTargetMemberId);
		if (!character || !targetMember) {
			fieldErrors = { ...fieldErrors, claimTarget: labels.claimValidationTargetRequired };
			return;
		}

		claimCharacterOpen = false;
		openStatus('pending', labels.claimPendingTitle, labels.claimPendingBody);

		try {
			const response = await getApiAdapter().createOrganizationCharacterClaimRequest(orgVanity, claimCharacterId, {
				memberId: targetMember.memberId,
				userId: targetMember.userId,
			});
			recordLocalClaimRequest(character, targetMember, response.claimRequest);
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.claimSuccessTitle, labels.claimSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.claimErrorTitle, getErrorMessage(error, labels.claimErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitDirectClaimAssignment = async () => {
		if (!orgVanity || !claimCharacterId || !validateClaimTarget()) {
			return;
		}

		const character = characters.find((entry) => entry.id === claimCharacterId);
		const targetMember = members.find((member) => String(member.memberId) === claimTargetMemberId);
		if (!character || !targetMember) {
			fieldErrors = { ...fieldErrors, claimTarget: labels.claimValidationTargetRequired };
			return;
		}

		claimCharacterOpen = false;
		openStatus('pending', labels.claimPendingTitle, labels.claimPendingBody);

		try {
			await getApiAdapter().updateOrganizationCharacterClaim(orgVanity, claimCharacterId, {
				memberId: targetMember.memberId,
				userId: targetMember.userId,
				mode: character.isClaimed ? 'transfer' : 'assign',
				status: 'claimed',
			});
			clearLocalClaimRequest(claimCharacterId);
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.claimSuccessTitle, labels.claimSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.claimErrorTitle, getErrorMessage(error, labels.claimErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitUnclaimCharacter = async () => {
		if (!orgVanity || !claimCharacterId) {
			return;
		}

		claimCharacterOpen = false;
		openStatus('pending', labels.claimPendingTitle, labels.claimPendingBody);

		try {
			await getApiAdapter().unclaimOrganizationCharacter(orgVanity, claimCharacterId);
			clearLocalClaimRequest(claimCharacterId);
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.claimSuccessTitle, labels.claimSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.claimErrorTitle, getErrorMessage(error, labels.claimErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const clearPendingClaim = async () => {
		if (!claimCharacterId) {
			return;
		}

		clearLocalClaimRequest(claimCharacterId);
		claimCharacterOpen = false;
		await loadWorkspace();
	};

	const openDeleteCharacterConfirmation = (character: OrganizationManageCharacter) => {
		sensitiveAction = {
			kind: 'delete-character',
			targetName: character.name,
		};
		sensitiveActionOpen = true;
	};

	const openLeaveGuildConfirmation = () => {
		if (!organization) {
			return;
		}

		sensitiveAction = {
			kind: 'leave-guild',
			targetName: organization.name,
		};
		sensitiveActionOpen = true;
	};

	const openDeleteGuildConfirmation = () => {
		if (!organization) {
			return;
		}

		sensitiveAction = {
			kind: 'delete-guild',
			targetName: organization.name,
		};
		sensitiveActionOpen = true;
	};

	const submitDeleteCharacter = async (characterName: string) => {
		if (!orgVanity) {
			return;
		}

		const character = characters.find((entry) => entry.name === characterName);
		if (!character) {
			closeSensitiveAction();
			openStatus('error', labels.deleteErrorTitle, labels.sensitiveConfirmValidation, {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
			return;
		}

		closeSensitiveAction();
		openStatus('pending', labels.deletePendingTitle, labels.deletePendingBody);

		try {
			await getApiAdapter().deleteOrganizationCharacter(orgVanity, character.id);
			clearLocalClaimRequest(character.id);
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.deleteSuccessTitle, labels.deleteSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.deleteErrorTitle, getErrorMessage(error, labels.deleteErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitLeaveGuild = async () => {
		if (!orgVanity || !isAuthenticatedSession(session)) {
			closeSensitiveAction();
			openStatus('error', labels.leaveErrorTitle, labels.sensitiveConfirmValidation, {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
			return;
		}

		closeSensitiveAction();
		openStatus('pending', labels.leavePendingTitle, labels.leavePendingBody);

		try {
			const directMemberId = currentMember?.memberId;
			const fallbackMember =
				directMemberId
					? null
					: (await getApiAdapter().listOrganizationMembers(orgVanity)).members.find(
							(member) => member.userId === session.user.id && member.status === 'active',
						) ?? null;
			const memberId = directMemberId ?? fallbackMember?.id;
			if (!memberId) {
				throw new Error(labels.leaveErrorTitle);
			}

			await getApiAdapter().leaveOrganization(orgVanity, memberId);
			clearOrganizationManageCache(orgVanity);
			await refreshMyOrganizationsCache();
			openStatus('success', labels.leaveSuccessTitle, labels.leaveSuccessBody, {
				label: labels.confirmLabel,
				href: `/${lang}/me/guilds`,
			});
		} catch (error) {
			openStatus('error', labels.leaveErrorTitle, getErrorMessage(error, labels.leaveErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitDeleteGuild = async () => {
		if (!orgVanity) {
			closeSensitiveAction();
			return;
		}

		closeSensitiveAction();
		openStatus('pending', labels.deleteGuildPendingTitle, labels.deleteGuildPendingBody);

		try {
			await getApiAdapter().deleteOrganization(orgVanity);
			clearOrganizationManageCache(orgVanity);
			await refreshMyOrganizationsCache();
			openStatus('success', labels.deleteGuildSuccessTitle, labels.deleteGuildSuccessBody, {
				label: labels.confirmLabel,
				href: `/${lang}/me/guilds`,
			});
		} catch (error) {
			openStatus('error', labels.deleteGuildErrorTitle, getErrorMessage(error, labels.deleteGuildErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitSensitiveAction = async () => {
		if (!sensitiveAction || sensitiveActionSubmitting) {
			return;
		}

		sensitiveActionSubmitting = true;

		try {
			if (sensitiveAction.kind === 'delete-character') {
				await submitDeleteCharacter(sensitiveAction.targetName);
			} else if (sensitiveAction.kind === 'delete-guild') {
				await submitDeleteGuild();
			} else {
				await submitLeaveGuild();
			}
		} finally {
			sensitiveActionSubmitting = false;
		}
	};

	const submitCreateCharacter = async () => {
		if (!orgVanity || !organization || !validateCreateCharacter()) {
			return;
		}

		let createGameId = createCharacterGameId ? Number(createCharacterGameId) : undefined;

		if (!Number.isFinite(createGameId)) {
			const primaryGameId = organization.games.find((game) => game.primary)?.gameId ?? organization.games[0]?.gameId;
			createGameId = primaryGameId;
		}

		if (!Number.isFinite(createGameId)) {
			try {
				const response = await getApiAdapter().listOrganizationCharacters(orgVanity);
				const fallbackCharacter = response.characters.find((character) => typeof character.gameId === 'number');
				createGameId = typeof fallbackCharacter?.gameId === 'number' ? fallbackCharacter.gameId : undefined;
			} catch {
				createGameId = undefined;
			}
		}

		if (!Number.isFinite(createGameId)) {
			openStatus('error', labels.createErrorTitle, labels.createMissingGameBody, {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
			return;
		}

		createCharacterOpen = false;
		openStatus('pending', labels.createPendingTitle, labels.createPendingBody);

		try {
			await getApiAdapter().createOrganizationCharacter(orgVanity, {
				gameId: Number(createGameId),
				name: createCharacterName.trim(),
				notes: createCharacterDescription.trim() || undefined,
			});
			createCharacterName = '';
			createCharacterDescription = '';
			createCharacterGameId = selectedCharacterGameId || getPrimaryManageGameId();
			clearOrganizationManageCache(orgVanity);
			await loadWorkspace(true);
			openStatus('success', labels.createSuccessTitle, labels.createSuccessBody, {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.createErrorTitle, getErrorMessage(error, labels.createErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitRemoveMember = async (member: OrganizationManageMember) => {
		if (!orgVanity) {
			return;
		}

		openStatus('pending', labels.removeMemberPendingTitle, labels.removeMemberPendingBody);

		try {
			await getApiAdapter().removeOrganizationMember(orgVanity, member.memberId);
			clearOrganizationManageCache(orgVanity);
			await refreshMyOrganizationsCache();
			await loadWorkspace(true);
			openStatus('success', labels.removeMemberSuccessTitle, getMemberDisplayName(member), {
				label: labels.confirmLabel,
				onClick: resetStatusDialog,
			});
		} catch (error) {
			openStatus('error', labels.removeMemberErrorTitle, getErrorMessage(error, labels.removeMemberErrorTitle), {
				label: labels.closeLabel,
				onClick: resetStatusDialog,
			});
		}
	};

	const submitInviteSearch = () => {
		const trimmed = inviteSearchQuery.trim();
		inviteSearchError = '';

		if (inviteSearchField === 'email' && trimmed) {
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailPattern.test(trimmed)) {
				inviteSearchError = labels.inviteSearchValidationEmail;
				return;
			}
		}

		inviteMemberOpen = false;
		openStatus('success', labels.placeholderActionTitle, labels.placeholderActionBody, {
			label: labels.confirmLabel,
			onClick: resetStatusDialog,
		});
	};

	const refreshWorkspace = async () => {
		if (!orgVanity || isRefreshing || isRefreshCoolingDown()) {
			return;
		}

		isRefreshing = true;
		writeRefreshCooldown();
		await loadWorkspace(true);
	};

	onMount(() => {
		orgVanity = resolveOrganizationQuery(orgVanity);
		void (async () => {
			session = await ensureAuthSession();
			if (typeof window !== 'undefined') {
				recentClaimRequests = loadRecentCharacterClaimRequests(window.localStorage);
			}
			hydrateRefreshCooldown();
			await loadWorkspace();
		})();

		const unsubscribe = subscribeAuthSession((nextSession) => {
			session = nextSession;
			void loadWorkspace();
		});
		const timer = window.setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => {
			unsubscribe();
			window.clearInterval(timer);
		};
	});
</script>

{#if loading && !isAuthenticatedSession(session)}
	<AccessNoticeCard title={labels.title} body={labels.loadingLabel} />
{:else if !isAuthenticatedSession(session)}
	<AccessNoticeCard
		title={labels.authRequiredTitle}
		body={labels.authRequiredBody}
		primaryAction={{ label: labels.loginLabel, href: `/${lang}/login`, variant: 'primary' }}
		secondaryAction={{ label: labels.homeLabel, href: `/${lang}/`, variant: 'secondary' }}
	/>
{:else if !orgVanity}
	<AccessNoticeCard title={labels.missingOrgTitle} body={labels.missingOrgBody} />
{:else}
	<section class="org-manage-shell">
		<div class="org-manage-head">
			<h1>{labels.title}</h1>
			<p>{labels.intro}</p>
		</div>

		{#if workspaceError}
			<AccessNoticeCard title={labels.saveErrorTitle} body={workspaceError} />
		{:else if loading || !organization}
			<AccessNoticeCard title={labels.title} body={labels.loadingLabel} />
		{:else}
			<article class="org-manage-card">
				<div class="org-manage-card-top">
					<div class="org-manage-card-brand">
						{#if organization.iconUrl}
							<img src={organization.iconUrl} alt="" class="org-manage-card-avatar-image" />
						{:else}
							<div class="org-manage-card-avatar" aria-hidden="true">
								{organization.name
									.split(/\s+/)
									.filter(Boolean)
									.slice(0, 2)
									.map((part) => part[0]?.toUpperCase() ?? '')
									.join('')
									.slice(0, 2) || 'OG'}
							</div>
						{/if}

						<div class="org-manage-card-copy">
							{#if organization.vanity}
								<p class="org-manage-card-slug">@{organization.vanity}</p>
							{/if}
							<h2>{organization.name}</h2>
						</div>
					</div>

					<button
						type="button"
						class="org-manage-edit-trigger"
						aria-label={labels.orgCardEditLabel}
						on:click={() => {
							fillEditForm();
							editOrgOpen = true;
						}}
					>
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<path d="M4 20h4l10-10-4-4L4 16v4Z" fill="currentColor"></path>
							<path d="m13 5 4 4" stroke="currentColor" stroke-width="1.5" fill="none"></path>
						</svg>
					</button>
				</div>

				{#if organization.description}
					<p class="org-manage-card-description">{organization.description}</p>
				{/if}

				{#if organization.games.length > 0}
					<div class="org-manage-card-games">
						{#each organization.games as game}
							<span class:primary={game.primary}>{game.name}</span>
						{/each}
					</div>
				{/if}

				<dl class="org-manage-card-stats">
					<div>
						<dt>{labels.orgCardMembersLabel}</dt>
						<dd>{organization.stats.memberCount}</dd>
					</div>
					<div>
						<dt>{labels.orgCardCharactersLabel}</dt>
						<dd>{organization.stats.characterCount}</dd>
					</div>
				</dl>

				{#if organization.vanity}
					<p class="org-manage-card-vanity">
						<strong>{labels.orgCardVanityLabel}:</strong> {organization.vanity}
					</p>
				{/if}
			</article>

			<section class="org-manage-panels">
				<div class="org-manage-panel-frame">
					<div class="org-manage-tabs" role="tablist" aria-label={labels.title}>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'characters' ? 'true' : 'false'}
						class:active={activeTab === 'characters'}
						on:click={() => {
							activeTab = 'characters';
						}}
					>
						{labels.tabCharactersLabel}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'members' ? 'true' : 'false'}
						class:active={activeTab === 'members'}
						on:click={() => {
							activeTab = 'members';
						}}
					>
						{labels.tabMembersLabel}
					</button>
					</div>

					<div class="org-manage-toolbar">
					{#if activeTab === 'characters'}
						<div class="org-manage-toolbar-actions">
							<button
								type="button"
								class="toolbar-primary"
								on:click={() => {
									fieldErrors = {};
									createCharacterGameId = selectedCharacterGameId || getPrimaryManageGameId();
									createCharacterOpen = true;
								}}
							>
								<span class="toolbar-primary-icon" aria-hidden="true">+</span>
								{labels.charactersCreateLabel}
							</button>
							<button
								type="button"
								class="toolbar-secondary"
								disabled={isRefreshing || isRefreshCoolingDown()}
								on:click={() => void refreshWorkspace()}
							>
								{isRefreshing ? labels.refreshingLabel : labels.charactersRefreshLabel}
							</button>
						</div>
					{:else}
						<div class="org-manage-toolbar-actions">
							<button
								type="button"
								class="toolbar-primary"
								on:click={() => {
									inviteSearchField = 'displayName';
									inviteSearchQuery = '';
									inviteSearchError = '';
									inviteMemberOpen = true;
								}}
							>
								{labels.membersInviteLabel}
							</button>
							<a
								class="toolbar-secondary toolbar-link"
								href={`/${lang}/guilds/manage/pending?orgVanity=${encodeURIComponent(orgVanity)}`}
							>
								{labels.membersPendingLabel}
							</a>
						</div>
					{/if}

					{#if activeTab === 'characters' && isRefreshCoolingDown()}
						<p class="org-manage-toolbar-note">{labels.refreshCooldownLabel}</p>
					{/if}
					</div>

					<div class="org-manage-table-shell">
					{#if activeTab === 'characters'}
						{#if availableCharacterGames.length > 0}
							<div class="org-manage-game-scope">
								<div class="org-manage-game-scope-copy">
									<p class="org-manage-game-scope-label">{labels.charactersGameScopeLabel}</p>
									<h3>{labels.charactersManageGameLabel}: {getGameLabel(selectedCharacterGameId)}</h3>
									<p>{labels.charactersGameScopeHint}</p>
								</div>
								<GamePicker
									variant="inline"
									bind:value={selectedCharacterGameId}
									ariaLabel={labels.charactersGameScopeLabel}
									items={availableCharacterGames.map((game) => ({
										value: String(game.gameId),
										label: game.name,
										iconUrl: game.iconUrl,
										officialSiteUrl: game.officialSiteUrl,
										resolvedIconUrl: game.resolvedIconUrl,
										metaLabel: game.primary ? 'Primary' : null,
									}))}
									action={{
										label: labels.charactersAddGameLabel,
										onClick: openAddGameComingSoon,
									}}
								/>
							</div>
						{/if}
						{#if characters.length === 0}
							<p class="org-manage-empty">{labels.emptyCharactersTitle}</p>
						{:else if filteredCharacters.length === 0}
							<p class="org-manage-empty">{labels.charactersEmptyForGameTitle}</p>
						{:else}
							<table class="org-manage-table">
								<thead>
									<tr>
										<th>{labels.characterNameColumn}</th>
										<th>{labels.characterClaimStateColumn}</th>
										<th>{labels.characterClaimByColumn}</th>
										<th>{labels.characterDescriptionColumn}</th>
										<th>{labels.characterActionsColumn}</th>
									</tr>
								</thead>
								<tbody>
									{#each filteredCharacters as character}
										<tr>
											<td>{character.name}</td>
											<td>
												<span class:claimed={character.isClaimed} class:pending={Boolean(getPendingClaimRequest(character.id))} class="claim-state">
													{#if getPendingClaimRequest(character.id)}
														…
													{:else}
														{character.isClaimed ? '✓' : '–'}
													{/if}
												</span>
												<span class="sr-only">{getClaimStateLabel(character)}</span>
											</td>
											<td>
												{#if getCharacterClaimDisplay(character)}
													<button type="button" class="table-text-action" on:click={() => openClaimCharacter(character)}>
														{getCharacterClaimDisplay(character)}
													</button>
												{:else}
													<button type="button" class="table-text-action" on:click={() => openClaimCharacter(character)}>
														{labels.claimCharacterLabel}
													</button>
												{/if}
											</td>
											<td>{character.description || '—'}</td>
											<td class="org-manage-actions-cell">
												<button type="button" class="table-chip-button" on:click={() => openEditCharacter(character)}>
													{labels.editLabel}
												</button>
												<button type="button" class="table-chip-button" on:click={() => openClaimCharacter(character)}>
													{labels.manageClaimLabel}
												</button>
												<button type="button" class="table-chip-button danger" on:click={() => openDeleteCharacterConfirmation(character)}>
													{labels.deleteLabel}
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{:else}
						{#if members.length === 0}
							<p class="org-manage-empty">{labels.emptyMembersTitle}</p>
						{:else}
							<table class="org-manage-table">
								<thead>
									<tr>
										<th>{labels.memberNameColumn}</th>
										<th>{labels.memberActionsColumn}</th>
									</tr>
								</thead>
								<tbody>
									{#each members as member}
										<tr>
											<td>
												<div class="member-cell">
													<span>{getMemberDisplayName(member)}</span>
													{#if member.status === 'pending'}
														<em>{labels.pendingBadgeLabel}</em>
													{/if}
												</div>
											</td>
											<td class="org-manage-actions-cell">
												{#if !isAuthenticatedSession(session) || session.user.id !== member.userId}
													<button type="button" class="table-chip-button danger" on:click={() => void submitRemoveMember(member)}>
														{labels.removeMemberLabel}
													</button>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					{/if}
					</div>
				</div>
			</section>

			{#if currentMember || effectiveCurrentMembershipRole}
				<section class="org-manage-danger-zone">
					<div class="org-manage-danger-copy">
						<h3>{labels.sensitiveZoneTitle}</h3>
						<p>{labels.sensitiveZoneBody}</p>
					</div>
					<button
						type="button"
						class="org-manage-danger-button"
						on:click={() => {
							if (isCurrentMemberOwner) {
								openDeleteGuildConfirmation();
								return;
							}

							openLeaveGuildConfirmation();
						}}
					>
						{isCurrentMemberOwner ? labels.deleteGuildLabel : labels.leaveGuildLabel}
					</button>
				</section>
			{/if}
		{/if}

		{#if editOrgOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.editOrgTitle}</h2>
						<label class="manage-field">
							<span>{labels.editOrgNameLabel}</span>
							<input bind:value={editName} class:error={Boolean(fieldErrors.name)} type="text" maxlength="100" />
							{#if fieldErrors.name}<em>{fieldErrors.name}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.editOrgDescriptionLabel}</span>
							<textarea bind:value={editDescription} class:error={Boolean(fieldErrors.description)} rows="4" maxlength="500"></textarea>
							{#if fieldErrors.description}<em>{fieldErrors.description}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.editOrgIconUrlLabel}</span>
							<input bind:value={editIconUrl} class:error={Boolean(fieldErrors.iconUrl)} type="url" />
							{#if fieldErrors.iconUrl}<em>{fieldErrors.iconUrl}</em>{/if}
						</label>
						<div class="manage-modal-actions">
							<button type="button" class="modal-secondary" on:click={() => (editOrgOpen = false)}>
								{labels.editOrgCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={() => void submitOrganizationPatch()}>
								{labels.editOrgSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if createCharacterOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.createCharacterTitle}</h2>
						<label class="manage-field">
							<span>{labels.createCharacterNameLabel}</span>
							<input bind:value={createCharacterName} class:error={Boolean(fieldErrors.characterName)} type="text" maxlength="100" />
							{#if fieldErrors.characterName}<em>{fieldErrors.characterName}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterDescriptionLabel}</span>
							<textarea
								bind:value={createCharacterDescription}
								class:error={Boolean(fieldErrors.characterDescription)}
								rows="4"
								maxlength="1000"
							></textarea>
							{#if fieldErrors.characterDescription}<em>{fieldErrors.characterDescription}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterGameLabel}</span>
							<GamePicker
								bind:value={createCharacterGameId}
								ariaLabel={labels.createCharacterGameLabel}
								placeholder={availableCharacterGames.length === 0
									? labels.createCharacterGameHint
									: labels.createCharacterGameLabel}
								disabled={availableCharacterGames.length === 0}
								items={availableCharacterGames.map((game) => ({
									value: String(game.gameId),
									label: game.name,
									iconUrl: game.iconUrl,
									officialSiteUrl: game.officialSiteUrl,
									resolvedIconUrl: game.resolvedIconUrl,
									metaLabel: game.primary ? 'Primary' : null,
								}))}
							/>
							{#if fieldErrors.characterGame}<em>{fieldErrors.characterGame}</em>{/if}
							{#if !availableCharacterGames.length}<em>{labels.createCharacterGameHint}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterAssigneeLabel}</span>
							<select disabled>
								<option>{labels.createCharacterAssigneeHint}</option>
							</select>
						</label>
						<div class="manage-modal-actions">
							<button type="button" class="modal-secondary" on:click={() => (createCharacterOpen = false)}>
								{labels.createCharacterCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={() => void submitCreateCharacter()}>
								{labels.createCharacterSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if editCharacterOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.editCharacterTitle}</h2>
						<label class="manage-field">
							<span>{labels.createCharacterNameLabel}</span>
							<input bind:value={editCharacterName} class:error={Boolean(fieldErrors.characterName)} type="text" maxlength="100" />
							{#if fieldErrors.characterName}<em>{fieldErrors.characterName}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterDescriptionLabel}</span>
							<textarea
								bind:value={editCharacterDescription}
								class:error={Boolean(fieldErrors.characterDescription)}
								rows="4"
								maxlength="1000"
							></textarea>
							{#if fieldErrors.characterDescription}<em>{fieldErrors.characterDescription}</em>{/if}
						</label>
						<label class="manage-field">
							<span>{labels.createCharacterGameLabel}</span>
							<GamePicker
								bind:value={editCharacterGameId}
								ariaLabel={labels.createCharacterGameLabel}
								placeholder={labels.createCharacterGameLabel}
								items={availableCharacterGames.map((game) => ({
									value: String(game.gameId),
									label: game.name,
									iconUrl: game.iconUrl,
									officialSiteUrl: game.officialSiteUrl,
									resolvedIconUrl: game.resolvedIconUrl,
									metaLabel: game.primary ? 'Primary' : null,
								}))}
							/>
							{#if fieldErrors.characterGame}<em>{fieldErrors.characterGame}</em>{/if}
						</label>
						<label class="manage-checkbox">
							<input bind:checked={editCharacterActive} type="checkbox" />
							<span>{labels.editCharacterActiveLabel}</span>
						</label>
						<div class="manage-modal-actions">
							<button type="button" class="modal-secondary" on:click={() => (editCharacterOpen = false)}>
								{labels.editCharacterCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={() => void submitEditCharacter()}>
								{labels.editCharacterSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if claimCharacterOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.claimCharacterTitle}</h2>
						{#if getCharacterById(claimCharacterId)}
							<p class="manage-modal-note">
								<strong>{getCharacterById(claimCharacterId)?.name}</strong>
								<span> · {getGameLabel(getCharacterById(claimCharacterId)?.gameId)}</span>
							</p>
						{/if}
						{#if claimCharacterId && getPendingClaimRequest(claimCharacterId)}
							<p class="manage-modal-note">{labels.claimCharacterPendingNote}</p>
						{/if}
						{#if getCharacterById(claimCharacterId)?.claimedBy}
							<p class="manage-modal-note">
								{labels.claimCharacterCurrentHolderLabel}: {getClaimDisplayByCharacterId(claimCharacterId)}
							</p>
						{/if}
						<label class="manage-field">
							<span>{labels.claimCharacterTargetLabel}</span>
							<SearchSelect
								items={memberSearchItems}
								value={claimTargetMemberId}
								placeholder={labels.claimCharacterSearchPlaceholder}
								emptyLabel={labels.claimCharacterSearchEmpty}
								error={Boolean(fieldErrors.claimTarget)}
								ariaLabel={labels.claimCharacterTargetLabel}
								on:change={(event) => {
									claimTargetMemberId = event.detail.value;
									fieldErrors = { ...fieldErrors, claimTarget: undefined };
								}}
							/>
							{#if fieldErrors.claimTarget}<em>{fieldErrors.claimTarget}</em>{/if}
							<em>{labels.claimCharacterTargetHint}</em>
						</label>
						<div class="manage-modal-actions">
							<button type="button" class="modal-secondary" on:click={() => (claimCharacterOpen = false)}>
								{labels.closeLabel}
							</button>
							{#if claimCharacterId && getPendingClaimRequest(claimCharacterId)}
								<button type="button" class="modal-secondary" on:click={() => void clearPendingClaim()}>
									{labels.claimCharacterRemovePendingLabel}
								</button>
							{/if}
							{#if getCharacterById(claimCharacterId)?.isClaimed}
								<button type="button" class="modal-secondary" on:click={() => void submitUnclaimCharacter()}>
									{labels.claimCharacterUnclaimLabel}
								</button>
							{/if}
							<button type="button" class="modal-secondary" on:click={() => void submitClaimRequest()}>
								{labels.claimCharacterRequestSubmitLabel}
							</button>
							<button type="button" class="modal-primary" on:click={() => void submitDirectClaimAssignment()}>
								{#if getCharacterById(claimCharacterId)?.isClaimed}
									{labels.claimCharacterTransferSubmitLabel}
								{:else}
									{labels.claimCharacterAssignSubmitLabel}
								{/if}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		{#if inviteMemberOpen}
			<div class="manage-modal-backdrop" role="presentation">
				<section class="manage-modal" role="dialog" aria-modal="true">
					<div class="manage-modal-card">
						<h2>{labels.membersInviteLabel}</h2>
						<label class="manage-field">
							<span>{labels.inviteSearchFieldLabel}</span>
							<select bind:value={inviteSearchField}>
								<option value="displayName">{labels.inviteSearchDisplayNameOption}</option>
								<option value="email">{labels.inviteSearchEmailOption}</option>
							</select>
						</label>
						<label class="manage-field">
							<span>{labels.inviteSearchInputLabel}</span>
							<input
								type={inviteSearchField === 'email' ? 'email' : 'search'}
								bind:value={inviteSearchQuery}
								class:error={Boolean(inviteSearchError)}
								placeholder={inviteSearchField === 'email'
									? labels.inviteSearchPlaceholderEmail
									: labels.inviteSearchPlaceholderDisplayName}
							/>
							{#if inviteSearchError}<em>{inviteSearchError}</em>{/if}
						</label>
						<div class="manage-modal-actions">
							<button
								type="button"
								class="modal-secondary"
								on:click={() => {
									inviteMemberOpen = false;
								}}
							>
								{labels.inviteSearchCancelLabel}
							</button>
							<button type="button" class="modal-primary" on:click={submitInviteSearch}>
								{labels.inviteSearchSubmitLabel}
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}

		<RequestStatusDialog
			open={statusOpen}
			state={statusState}
			title={statusTitle}
			message={statusMessage}
			primaryAction={statusPrimaryAction}
			onClose={resetStatusDialog}
		/>
		<SensitiveActionConfirmModal
			open={sensitiveActionOpen && Boolean(sensitiveAction)}
			title={sensitiveActionTitle}
			body={sensitiveActionBody}
			helperLabel={sensitiveActionHelperLabel}
			matchText={sensitiveAction?.targetName ?? ''}
			cancelLabel={labels.editOrgCancelLabel}
			confirmLabel={sensitiveActionConfirmLabel}
			workingLabel={labels.sensitiveWorkingLabel}
			copyLabel={labels.sensitiveCopyLabel}
			validationMessage={labels.sensitiveConfirmValidation}
			submitting={sensitiveActionSubmitting}
			on:close={closeSensitiveAction}
			on:confirm={() => void submitSensitiveAction()}
		/>
	</section>
{/if}

<style>
	.org-manage-shell {
		width: min(var(--content-width), 100%);
		margin: 28px auto 0;
		display: grid;
		gap: 20px;
	}

	.org-manage-head,
	.org-manage-card,
	.org-manage-panels,
	.org-manage-danger-zone {
		padding: 28px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 28px;
		background: var(--surface);
		box-shadow: var(--shadow);
		backdrop-filter: blur(16px);
	}

	.org-manage-head h1,
	.org-manage-head p,
	.org-manage-card h2,
	.org-manage-card p,
	.org-manage-empty {
		margin: 0;
	}

	.org-manage-head p,
	.org-manage-card-description,
	.org-manage-empty,
	.org-manage-toolbar-note,
	.org-manage-card-vanity,
	.org-manage-danger-copy p {
		margin-top: 12px;
		line-height: 1.7;
		color: var(--text-soft);
	}

	.org-manage-card {
		display: grid;
		gap: 18px;
		background:
			radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 10%, transparent), transparent 32%),
			linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white) 0%, var(--surface-strong) 100%);
	}

	.org-manage-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.org-manage-card-brand {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.org-manage-card-avatar,
	.org-manage-card-avatar-image {
		width: 58px;
		height: 58px;
		border-radius: 18px;
		flex: 0 0 auto;
	}

	.org-manage-card-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 54%, white) 100%);
		color: white;
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}

	.org-manage-card-avatar-image {
		object-fit: cover;
	}

	.org-manage-card-copy {
		min-width: 0;
	}

	.org-manage-card-slug {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--accent) 72%, var(--text-soft));
	}

	.org-manage-card-copy h2 {
		margin-top: 6px;
		font-size: 1.3rem;
	}

	.org-manage-edit-trigger {
		width: 40px;
		height: 40px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: color-mix(in srgb, var(--surface-strong) 84%, white);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.org-manage-edit-trigger svg {
		width: 16px;
		height: 16px;
	}

	.org-manage-card-games,
	.org-manage-tabs,
	.org-manage-game-switcher,
	.org-manage-toolbar-actions,
	.manage-modal-actions,
	.org-manage-actions-cell {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.org-manage-card-games span,
	.org-manage-tabs button,
	.toolbar-primary,
	.toolbar-secondary,
	.table-chip-button {
		min-height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
	}

	.org-manage-panel-frame {
		position: relative;
		padding-top: 4px;
	}

	.org-manage-card-games span {
		display: inline-flex;
		align-items: center;
		background: color-mix(in srgb, var(--surface-soft) 84%, white);
	}

	.org-manage-card-games span.primary {
		background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
		color: var(--accent-deep);
	}

	.org-manage-card-stats {
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.org-manage-card-stats div {
		padding: 16px;
		border: 1px solid color-mix(in srgb, var(--line) 78%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--surface-strong) 74%, white);
	}

	.org-manage-card-stats dt {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.org-manage-card-stats dd {
		margin: 8px 0 0;
		font-size: 1.1rem;
		font-weight: 800;
	}

	.org-manage-tabs button,
	.toolbar-primary,
	.toolbar-secondary,
	.table-chip-button,
	.table-text-action,
	.modal-primary,
	.modal-secondary {
		cursor: pointer;
	}

	.org-manage-tabs button {
		position: relative;
		min-height: 44px;
		padding: 0 18px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-bottom-color: color-mix(in srgb, var(--line) 72%, transparent);
		border-radius: 18px 18px 0 0;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--surface-strong) 88%, white),
			color-mix(in srgb, var(--surface) 94%, white)
		);
		color: var(--text-soft);
		transform: translateY(1px);
		z-index: 0;
	}

	.org-manage-tabs {
		position: relative;
		gap: 8px;
		align-items: end;
	}

	.org-manage-tabs::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 88%, white);
		pointer-events: none;
	}

	.org-manage-tabs button.active {
		border-color: color-mix(in srgb, var(--ledger-accent) 42%, var(--line));
		border-bottom-color: transparent;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--ledger-accent) 22%, white) 0%,
			color-mix(in srgb, var(--ledger-accent) 10%, transparent) 52%,
			var(--surface) 100%
		);
		color: color-mix(in srgb, var(--ledger-accent-deep) 90%, var(--text-main));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.42),
			0 -1px 0 color-mix(in srgb, var(--ledger-accent) 18%, transparent);
		transform: translateY(0);
		z-index: 1;
	}

	.toolbar-primary,
	.modal-primary {
		border: 1px solid transparent;
		background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
		color: white;
		box-shadow: 0 16px 30px -22px rgba(37, 99, 235, 0.95);
	}

	.toolbar-secondary,
	.table-chip-button,
	.modal-secondary,
	.toolbar-link {
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--surface-strong) 78%, white);
		color: var(--text-main);
	}

	.toolbar-link {
		min-height: 36px;
		padding: 0 14px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.org-manage-table-shell {
		margin-top: 16px;
	}

	.org-manage-game-scope {
		margin-bottom: 18px;
		padding: 18px;
		border: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		border-radius: 22px;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--ledger-accent) 10%, white), transparent 58%),
			color-mix(in srgb, var(--surface-strong) 76%, white);
		display: grid;
		gap: 14px;
	}

	:root[data-theme='dark'] .org-manage-game-scope {
		border-color: color-mix(in srgb, var(--ledger-accent) 18%, var(--line));
		background:
			radial-gradient(
				circle at top left,
				color-mix(in srgb, var(--ledger-accent) 18%, rgba(255, 255, 255, 0.06)) 0%,
				transparent 52%
			),
			linear-gradient(
				135deg,
				color-mix(in srgb, var(--surface-strong) 94%, rgba(255, 255, 255, 0.03)) 0%,
				color-mix(in srgb, var(--surface) 88%, rgba(44, 120, 79, 0.12)) 100%
			);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.org-manage-game-scope-copy h3,
	.org-manage-game-scope-copy p {
		margin: 0;
	}

	.org-manage-game-scope-copy h3 {
		margin-top: 6px;
		font-size: 1.05rem;
		color: var(--text-main);
	}

	.org-manage-game-scope-copy p {
		color: var(--text-soft);
		line-height: 1.6;
	}

	.org-manage-game-scope-label {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--ledger-accent-deep) 74%, var(--text-soft));
	}

	:root[data-theme='dark'] .org-manage-game-scope-label {
		color: color-mix(in srgb, var(--ledger-accent) 42%, white);
	}

	.org-manage-toolbar {
		margin-top: 18px;
	}

	.org-manage-toolbar-actions {
		gap: 12px;
	}

	.toolbar-primary {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	.toolbar-primary:hover,
	.modal-primary:hover {
		background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
		box-shadow: 0 20px 32px -22px rgba(29, 78, 216, 1);
	}

	.toolbar-primary-icon {
		width: 20px;
		height: 20px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.18);
		font-size: 1rem;
		line-height: 1;
		font-weight: 800;
	}

	.org-manage-table {
		width: 100%;
		border-collapse: collapse;
	}

	.org-manage-table th,
	.org-manage-table td {
		padding: 14px 12px;
		border-bottom: 1px solid color-mix(in srgb, var(--line) 82%, transparent);
		text-align: left;
		vertical-align: middle;
	}

	.org-manage-table th {
		font-size: 0.84rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-soft);
	}

	.claim-state {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		color: var(--text-soft);
		font-weight: 800;
	}

	.claim-state.claimed {
		color: #188f59;
	}

	.claim-state.pending {
		color: #b67717;
	}

	.table-text-action {
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-deep);
		font: inherit;
		font-weight: 700;
	}

	.table-chip-button {
		min-height: 32px;
	}

	.table-chip-button.danger {
		color: #b24a4a;
	}

	.member-cell {
		display: inline-flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
	}

	.member-cell em {
		min-height: 28px;
		padding: 0 10px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		background: color-mix(in srgb, #f0b429 16%, var(--surface-soft));
		color: #8f6508;
		font-style: normal;
		font-size: 0.82rem;
		font-weight: 700;
	}

	.org-manage-danger-zone {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		border-color: color-mix(in srgb, #dc2626 28%, var(--line));
		background:
			linear-gradient(135deg, color-mix(in srgb, #fee2e2 72%, white), transparent 58%),
			var(--surface);
	}

	.org-manage-danger-copy h3,
	.org-manage-danger-copy p {
		margin: 0;
	}

	.org-manage-danger-button {
		min-height: 44px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, #dc2626 42%, var(--line));
		background: color-mix(in srgb, #fee2e2 78%, white);
		color: #991b1b;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
		white-space: nowrap;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease;
	}

	.org-manage-danger-button:hover {
		transform: translateY(-1px);
	}

	.manage-modal-backdrop {
		position: fixed;
		inset: 0;
		padding: 20px;
		background: rgba(8, 10, 16, 0.36);
		backdrop-filter: blur(8px);
		display: grid;
		place-items: center;
		z-index: 60;
	}

	.manage-modal {
		width: min(560px, 100%);
	}

	.manage-modal-card {
		padding: 26px;
		border: 1px solid color-mix(in srgb, var(--line) 92%, white);
		border-radius: 26px;
		background: var(--surface);
		box-shadow: var(--shadow);
		display: grid;
		gap: 14px;
	}

	.manage-modal-card h2 {
		margin: 0;
	}

	.manage-modal-actions {
		margin-top: 10px;
		gap: 12px;
		justify-content: flex-end;
	}

	.manage-field {
		display: grid;
		gap: 8px;
	}

	.manage-field span {
		font-size: 0.94rem;
		font-weight: 700;
	}

	.manage-field input,
	.manage-field textarea,
	.manage-field select {
		width: 100%;
		min-height: 46px;
		padding: 10px 14px;
		border-radius: 14px;
		border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--line));
		background: color-mix(in srgb, var(--surface-strong) 80%, white);
		font: inherit;
		color: var(--text-main);
	}

	.manage-field textarea {
		resize: vertical;
	}

	.manage-field input.error,
	.manage-field textarea.error {
		border-color: rgba(203, 80, 80, 0.8);
		box-shadow: 0 0 0 1px rgba(203, 80, 80, 0.14);
	}

	.manage-field em {
		font-style: normal;
		font-size: 0.92rem;
		color: #c24e4e;
	}

	.manage-checkbox {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-weight: 700;
	}

	.manage-checkbox input {
		width: 18px;
		height: 18px;
	}

	.manage-modal-note {
		margin: 0;
		line-height: 1.6;
		color: var(--text-soft);
	}

	.modal-primary,
	.modal-secondary {
		min-height: 46px;
		padding: 0 18px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 0.95rem;
		font-weight: 700;
		white-space: nowrap;
		transition:
			transform 0.18s ease,
			background 0.18s ease,
			border-color 0.18s ease,
			box-shadow 0.18s ease,
			opacity 0.18s ease;
	}

	.modal-secondary:hover {
		transform: translateY(-1px);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 720px) {
		.org-manage-head,
		.org-manage-card,
		.org-manage-panels,
		.org-manage-danger-zone,
		.manage-modal-card {
			padding: 22px;
			border-radius: 22px;
		}

		.org-manage-card-top {
			flex-direction: column;
			align-items: stretch;
		}

		.org-manage-card-stats {
			grid-template-columns: 1fr;
		}

		.org-manage-table {
			display: block;
			overflow-x: auto;
		}

		.org-manage-game-switcher button,
		.org-manage-game-add-button {
			width: 100%;
			justify-content: space-between;
		}

		.manage-modal-actions {
			flex-direction: column-reverse;
		}

		.modal-primary,
		.modal-secondary {
			width: 100%;
			min-height: 48px;
		}

		.org-manage-danger-zone {
			flex-direction: column;
			align-items: stretch;
		}

		.org-manage-danger-button {
			width: 100%;
		}
	}
</style>
