import test from 'node:test';
import assert from 'node:assert/strict';

import {
	ApiAdapter,
	createApiAdapter,
	getApiAdapter,
	resetApiAdapter,
} from '../../src/libs/api/adapters/api.adapter.ts';
import type { ApiClientLike } from '../../src/libs/api/services/api-client.ts';

function createMockClient() {
	const calls: Array<{ method: string; payload?: unknown }> = [];
	const response = <T>(method: string, payload?: unknown) => {
		calls.push({ method, payload });
		return Promise.resolve({ method, payload }) as Promise<T>;
	};

	const client: ApiClientLike = {
		getHealthz: () => response('getHealthz'),
		postAuthRegister: (payload) => response('postAuthRegister', payload),
		postAuthLogin: (payload) => response('postAuthLogin', payload),
		getAuthMe: () => response('getAuthMe'),
		patchAuthMe: (payload) => response('patchAuthMe', payload),
		getAuthUsersByUser: (payload) => response('getAuthUsersByUser', payload),
		postAuthLogout: () => response('postAuthLogout'),
		getAuthVerifyEmail: (payload) => response('getAuthVerifyEmail', payload),
		postAuthResendVerificationEmail: (payload) => response('postAuthResendVerificationEmail', payload),
		postAuthForgotPassword: (payload) => response('postAuthForgotPassword', payload),
		postAuthResetPassword: (payload) => response('postAuthResetPassword', payload),
		getAdminUsersPending: () => response('getAdminUsersPending'),
		getAdminUsersDisabled: (payload) => response('getAdminUsersDisabled', payload),
		getAdminUsersByUser: (payload) => response('getAdminUsersByUser', payload),
		deleteAdminUsersByUser: (payload) => response('deleteAdminUsersByUser', payload),
		patchAdminOrganizationsByOrganizationVanity: (payload) =>
			response('patchAdminOrganizationsByOrganizationVanity', payload),
		patchAdminUsersByUserVanity: (payload) => response('patchAdminUsersByUserVanity', payload),
		postAdminUsersByIdApprove: (payload) => response('postAdminUsersByIdApprove', payload),
		postAdminUsersByIdDisable: (payload) => response('postAdminUsersByIdDisable', payload),
		postAdminUsersByIdEnable: (payload) => response('postAdminUsersByIdEnable', payload),
		postAdminAssetsByAssetIdMerge: (payload) => response('postAdminAssetsByAssetIdMerge', payload),
		getOrganizationsGames: (payload) => response('getOrganizationsGames', payload),
		getOrganizations: (payload) => response('getOrganizations', payload),
		postOrganizations: (payload) => response('postOrganizations', payload),
		getOrganizationsMe: (payload) => response('getOrganizationsMe', payload),
		getOrganizationsByOrganization: (payload) => response('getOrganizationsByOrganization', payload),
		deleteOrganizationsByOrganization: (payload) => response('deleteOrganizationsByOrganization', payload),
		patchOrganizationsByOrganization: (payload) => response('patchOrganizationsByOrganization', payload),
		getOrganizationsByOrganizationCharacters: (payload) =>
			response('getOrganizationsByOrganizationCharacters', payload),
		postOrganizationsByOrganizationCharacters: (payload) =>
			response('postOrganizationsByOrganizationCharacters', payload),
		getOrganizationsByOrganizationCharactersSearch: (payload) =>
			response('getOrganizationsByOrganizationCharactersSearch', payload),
		getOrganizationsByOrganizationCharactersByCharacterId: (payload) =>
			response('getOrganizationsByOrganizationCharactersByCharacterId', payload),
		patchOrganizationsByOrganizationCharactersByCharacterId: (payload) =>
			response('patchOrganizationsByOrganizationCharactersByCharacterId', payload),
		deleteOrganizationsByOrganizationCharactersByCharacterId: (payload) =>
			response('deleteOrganizationsByOrganizationCharactersByCharacterId', payload),
		patchOrganizationsByOrganizationCharactersByCharacterIdClaim: (payload) =>
			response('patchOrganizationsByOrganizationCharactersByCharacterIdClaim', payload),
		postOrganizationsByOrganizationCharactersByCharacterIdClaimRequest: (payload) =>
			response('postOrganizationsByOrganizationCharactersByCharacterIdClaimRequest', payload),
		postOrganizationsByOrganizationCharactersByCharacterIdUnclaim: (payload) =>
			response('postOrganizationsByOrganizationCharactersByCharacterIdUnclaim', payload),
		getOrganizationsByOrganizationMembers: (payload) =>
			response('getOrganizationsByOrganizationMembers', payload),
		postOrganizationsByOrganizationMembers: (payload) =>
			response('postOrganizationsByOrganizationMembers', payload),
		getOrganizationsByOrganizationManagementCharacters: (payload) =>
			response('getOrganizationsByOrganizationManagementCharacters', payload),
		getOrganizationsByOrganizationManagementMembersActive: (payload) =>
			response('getOrganizationsByOrganizationManagementMembersActive', payload),
		getOrganizationsByOrganizationManagementMembersPending: (payload) =>
			response('getOrganizationsByOrganizationManagementMembersPending', payload),
		getOrganizationsByOrganizationCharactersAvailable: (payload) =>
			response('getOrganizationsByOrganizationCharactersAvailable', payload),
		postOrganizationsByOrganizationGames: (payload) =>
			response('postOrganizationsByOrganizationGames', payload),
		patchOrganizationsByOrganizationGamesByGameId: (payload) =>
			response('patchOrganizationsByOrganizationGamesByGameId', payload),
		patchOrganizationsByOrganizationGamesByGameIdPrimary: (payload) =>
			response('patchOrganizationsByOrganizationGamesByGameIdPrimary', payload),
		postOrganizationsByOrganizationMembersInvite: (payload) =>
			response('postOrganizationsByOrganizationMembersInvite', payload),
		postOrganizationsByOrganizationMembersApply: (payload) =>
			response('postOrganizationsByOrganizationMembersApply', payload),
		postOrganizationsByOrganizationMembersByMemberIdApprove: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdApprove', payload),
		postOrganizationsByOrganizationMembersByMemberIdReject: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdReject', payload),
		postOrganizationsByOrganizationMembersByMemberIdCancel: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdCancel', payload),
		postOrganizationsByOrganizationMembersByMemberIdLeave: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdLeave', payload),
		postOrganizationsByOrganizationMembersByMemberIdRemove: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdRemove', payload),
		postOrganizationsByOrganizationMembersByMemberIdAppointAdmin: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdAppointAdmin', payload),
		postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin', payload),
		postOrganizationsByOrganizationMembersByMemberIdAcceptInvite: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdAcceptInvite', payload),
		postOrganizationsByOrganizationMembersByMemberIdDeclineInvite: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdDeclineInvite', payload),
		getOrganizationsCurrent: () => response('getOrganizationsCurrent'),
		getOrganizationsCurrentMembers: () => response('getOrganizationsCurrentMembers'),
		postOrganizationsByOrganizationAssets: (payload) =>
			response('postOrganizationsByOrganizationAssets', payload),
		getOrganizationsByOrganizationAssetsSearch: (payload) =>
			response('getOrganizationsByOrganizationAssetsSearch', payload),
		getOrganizationsByOrganizationAssetsByAssetId: (payload) =>
			response('getOrganizationsByOrganizationAssetsByAssetId', payload),
		patchOrganizationsByOrganizationAssetsByAssetId: (payload) =>
			response('patchOrganizationsByOrganizationAssetsByAssetId', payload),
		postOrganizationsByOrganizationAssetsResolve: (payload) =>
			response('postOrganizationsByOrganizationAssetsResolve', payload),
		getOrganizationsByOrganizationLedgerEvents: (payload) =>
			response('getOrganizationsByOrganizationLedgerEvents', payload),
		postOrganizationsByOrganizationLedgerEvents: (payload) =>
			response('postOrganizationsByOrganizationLedgerEvents', payload),
		postOrganizationsByOrganizationLedgerEventsBatch: (payload) =>
			response('postOrganizationsByOrganizationLedgerEventsBatch', payload),
		getOrganizationsByOrganizationLedgerEventsByEventId: (payload) =>
			response('getOrganizationsByOrganizationLedgerEventsByEventId', payload),
		patchOrganizationsByOrganizationLedgerEventsByEventId: (payload) =>
			response('patchOrganizationsByOrganizationLedgerEventsByEventId', payload),
		getOrganizationsByOrganizationLedgerClaimableRecipients: (payload) =>
			response('getOrganizationsByOrganizationLedgerClaimableRecipients', payload),
		getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId: (payload) =>
			response('getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId', payload),
		getOrganizationsByOrganizationLedgerDashboardSummary: (payload) =>
			response('getOrganizationsByOrganizationLedgerDashboardSummary', payload),
		postOrganizationsByOrganizationLedgerDashboardCharacterSummariesQuery: (payload) =>
			response('postOrganizationsByOrganizationLedgerDashboardCharacterSummariesQuery', payload),
		getOrganizationsByOrganizationLedgerDashboardCharactersByCharacterId: (payload) =>
			response('getOrganizationsByOrganizationLedgerDashboardCharactersByCharacterId', payload),
		getOrganizationsByOrganizationLedgerSettlements: (payload) =>
			response('getOrganizationsByOrganizationLedgerSettlements', payload),
		patchOrganizationsByOrganizationLedgerEventsByEventIdStatus: (payload) =>
			response('patchOrganizationsByOrganizationLedgerEventsByEventIdStatus', payload),
		postOrganizationsByOrganizationLedgerSettlements: (payload) =>
			response('postOrganizationsByOrganizationLedgerSettlements', payload),
		getOrganizationsByOrganizationLedgerSettlementDefaults: (payload) =>
			response('getOrganizationsByOrganizationLedgerSettlementDefaults', payload),
		postOrganizationsByOrganizationLedgerClaimsBatch: (payload) =>
			response('postOrganizationsByOrganizationLedgerClaimsBatch', payload),
		postOrganizationsByOrganizationLedgerSettlementsBySettlementIdDisburse: (payload) =>
			response('postOrganizationsByOrganizationLedgerSettlementsBySettlementIdDisburse', payload),
		patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus: (payload) =>
			response('patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus', payload),
		postOrganizationsByOrganizationLedgerAllocations: (payload) =>
			response('postOrganizationsByOrganizationLedgerAllocations', payload),
		patchOrganizationsByOrganizationLedgerAllocationsByAllocationIdStatus: (payload) =>
			response('patchOrganizationsByOrganizationLedgerAllocationsByAllocationIdStatus', payload),
		postOrganizationsByOrganizationLedgerClaims: (payload) =>
			response('postOrganizationsByOrganizationLedgerClaims', payload),
		patchOrganizationsByOrganizationLedgerClaimsByClaimIdStatus: (payload) =>
			response('patchOrganizationsByOrganizationLedgerClaimsByClaimIdStatus', payload),
		getDashboardMe: () => response('getDashboardMe'),
		postNotionQuery: () => response('postNotionQuery'),
		postNotionMutate: () => response('postNotionMutate'),
	};

	return { client, calls };
}

test('ApiAdapter maps auth operations to generated client methods', async () => {
	const { client, calls } = createMockClient();
	const adapter = new ApiAdapter(client);

	await adapter.register({ email: 'demo@example.com', password: 'password123', lang: 'zh-tw' });
	await adapter.login({ email: 'demo@example.com', password: 'password123' });
	await adapter.getCurrentUser();
	await adapter.updateDisplayName({ displayName: 'Demo User' });
	await adapter.getPublicUser('demo-user');
	await adapter.logout();
	await adapter.verifyEmail({ key: 'verify-key', token: 'verify-token' });
	await adapter.resendVerificationEmail({ email: 'demo@example.com' });

	assert.deepEqual(calls, [
		{
			method: 'postAuthRegister',
			payload: { body: { email: 'demo@example.com', password: 'password123', lang: 'zh-tw' } },
		},
		{
			method: 'postAuthLogin',
			payload: { body: { email: 'demo@example.com', password: 'password123' } },
		},
		{ method: 'getAuthMe', payload: undefined },
		{ method: 'patchAuthMe', payload: { body: { displayName: 'Demo User' } } },
		{ method: 'getAuthUsersByUser', payload: { pathParams: { user: 'demo-user' } } },
		{ method: 'postAuthLogout', payload: undefined },
		{
			method: 'getAuthVerifyEmail',
			payload: { query: { key: 'verify-key', token: 'verify-token' } },
		},
		{
			method: 'postAuthResendVerificationEmail',
			payload: { body: { email: 'demo@example.com' } },
		},
	]);
});

test('ApiAdapter maps admin operations to generated client path params', async () => {
	const { client, calls } = createMockClient();
	const adapter = new ApiAdapter(client);

	await adapter.listDisabledUsers({ displayName: 'mika', limit: 10, offset: 0 });
	await adapter.getManagedUser('demo-user');
	await adapter.deleteUserData('demo-user');
	await adapter.updateOrganizationVanity('demo-guild', { vanity: 'demo' });
	await adapter.updateUserVanity('demo-user', { vanity: 'mika-demo' });
	await adapter.approveUser(7);
	await adapter.disableUser(8);
	await adapter.enableUser(9);
	await adapter.mergeAsset(11, { targetAssetId: 12 });

	assert.deepEqual(calls, [
		{
			method: 'getAdminUsersDisabled',
			payload: { query: { displayName: 'mika', limit: 10, offset: 0 } },
		},
		{
			method: 'getAdminUsersByUser',
			payload: { pathParams: { user: 'demo-user' } },
		},
		{
			method: 'deleteAdminUsersByUser',
			payload: { pathParams: { user: 'demo-user' } },
		},
		{
			method: 'patchAdminOrganizationsByOrganizationVanity',
			payload: { pathParams: { organization: 'demo-guild' }, body: { vanity: 'demo' } },
		},
		{
			method: 'patchAdminUsersByUserVanity',
			payload: { pathParams: { user: 'demo-user' }, body: { vanity: 'mika-demo' } },
		},
		{ method: 'postAdminUsersByIdApprove', payload: { pathParams: { id: 7 } } },
		{ method: 'postAdminUsersByIdDisable', payload: { pathParams: { id: 8 } } },
		{ method: 'postAdminUsersByIdEnable', payload: { pathParams: { id: 9 } } },
		{
			method: 'postAdminAssetsByAssetIdMerge',
			payload: { pathParams: { assetId: 11 }, body: { targetAssetId: 12 } },
		},
	]);
});

test('ApiAdapter maps organization operations to generated client methods', async () => {
	const { client, calls } = createMockClient();
	const adapter = new ApiAdapter(client);

	await adapter.listOrganizationGames({ includeInactive: true });
	await adapter.listOrganizations({
		displayName: 'Moon Raiders',
		limit: 20,
		offset: 40,
		q: 'moon',
		gameSlug: 'wow',
	});
	await adapter.createOrganization({
		name: 'Demo Guild',
		initialCharacter: { gameId: 100, name: 'Tank Main' },
	});
	await adapter.listMyOrganizations({ limit: 10, offset: 10 });
	await adapter.getOrganization('demo-guild');
	await adapter.updateOrganization('demo-guild', { name: 'Renamed Guild' });
	await adapter.listOrganizationCharacters('demo-guild');
	await adapter.createOrganizationCharacter('demo-guild', { gameId: 100, name: 'Healer Alt' });
	await adapter.searchOrganizationCharacters('demo-guild', { q: 'heal', isActive: true, limit: 5, offset: 0 });
	await adapter.getOrganizationCharacter('demo-guild', 501);
	await adapter.updateOrganizationCharacter('demo-guild', 501, { name: 'Healer Main', notes: 'Updated' });
	await adapter.deleteOrganizationCharacter('demo-guild', 502);
	await adapter.updateOrganizationCharacterClaim('demo-guild', 501, { userId: 42, mode: 'assign', status: 'claimed' });
	await adapter.createOrganizationCharacterClaimRequest('demo-guild', 503, { memberId: 88 });
	await adapter.unclaimOrganizationCharacter('demo-guild', 504);
	await adapter.listOrganizationMembers('demo-guild');
	await adapter.addOrganizationMember('demo-guild', { userId: 42, characterId: 7, role: 'admin' });
	await adapter.listOrganizationManagementCharacters('demo-guild');
	await adapter.listOrganizationActiveMembers('demo-guild');
	await adapter.listOrganizationPendingMembers('demo-guild');
	await adapter.listOrganizationAvailableCharacters('demo-guild');
	await adapter.addOrganizationGame('demo-guild', { gameId: 100, isPrimary: true });
	await adapter.updateOrganizationGame('demo-guild', 100, { displayName: 'WOW Main' });
	await adapter.setPrimaryOrganizationGame('demo-guild', 100);
	await adapter.inviteOrganizationMember('demo-guild', { userVanity: 'teammate', role: 'member' });
	await adapter.applyToOrganization('demo-guild', {
		newCharacter: { gameId: 100, name: 'Fresh Alt' },
	});
	await adapter.approveOrganizationMember('demo-guild', 88);
	await adapter.rejectOrganizationMember('demo-guild', 89);
	await adapter.cancelOrganizationMember('demo-guild', 94);
	await adapter.leaveOrganization('demo-guild', 95);
	await adapter.removeOrganizationMember('demo-guild', 96);
	await adapter.appointOrganizationMemberAdmin('demo-guild', 90);
	await adapter.removeOrganizationMemberAdmin('demo-guild', 91);
	await adapter.acceptOrganizationInvite('demo-guild', 92);
	await adapter.declineOrganizationInvite('demo-guild', 93);
	await adapter.deleteOrganization('demo-guild');
	await adapter.createOrganizationAsset('demo-guild', { name: 'Epic Sword', assetType: 'item' });
	await adapter.searchOrganizationAssets('demo-guild', { q: 'epic', gameId: 100, assetType: 'item', limit: 10, offset: 0 });
	await adapter.getOrganizationAsset('demo-guild', 601);
	await adapter.updateOrganizationAsset('demo-guild', 601, { name: 'Epic Sword +1', status: 'active' });
	await adapter.resolveOrganizationAsset('demo-guild', { gameId: 100, name: 'Epic Sword' });
	await adapter.listOrganizationLedgerEvents('demo-guild', {
		statusGroup: 'settleable',
		limit: 20,
		sortBy: 'occurredAt',
		sortOrder: 'desc',
	});
	await adapter.getOrganizationLedgerEvent('demo-guild', 101);
	await adapter.createOrganizationLedgerEvent('demo-guild', {
		title: 'Weekly Raid',
		occurredAt: '2026-08-27T12:00:00.000Z',
	});
	await adapter.createOrganizationLedgerEventsBatch('demo-guild', {
		events: [{ title: 'Weekly Raid 2', occurredAt: '2026-08-27T12:10:00.000Z' }],
	});
	await adapter.updateOrganizationLedgerEvent('demo-guild', 101, {
		title: 'Weekly Raid Updated',
		holderType: 'character',
		holderRef: 'Tank Main',
	});
	await adapter.updateOrganizationLedgerEventStatus('demo-guild', 101, { status: 'cancelled' });
	await adapter.listOrganizationLedgerSettlements('demo-guild', {
		status: 'draft',
		limit: 10,
		sortBy: 'createdAt',
		sortOrder: 'desc',
	});
	await adapter.getOrganizationLedgerSettlementDefaults('demo-guild', { gameId: 100 });
	await adapter.listOrganizationClaimableRecipients('demo-guild');
	await adapter.getOrganizationClaimableRecipientDetail('demo-guild', 501, {
		includeSiblingCharacters: true,
	});
	await adapter.getOrganizationLedgerDashboardSummary('demo-guild');
	await adapter.queryOrganizationCharacterLedgerDashboardSummaries('demo-guild', {
		characterIds: [501, 502],
	});
	await adapter.getOrganizationCharacterLedgerDashboardDetail('demo-guild', 501);
	await adapter.createOrganizationLedgerSettlement('demo-guild', {
		title: 'Raid Sale',
		decidedAt: '2026-08-27T12:00:00.000Z',
		grossAmount: 1000,
		netAmount: 900,
	});
	await adapter.updateOrganizationLedgerSettlementStatus('demo-guild', 102, { status: 'paid' });
	await adapter.createOrganizationLedgerAllocation('demo-guild', {
		settlementId: 102,
		amount: 450,
	});
	await adapter.updateOrganizationLedgerAllocationStatus('demo-guild', 103, { status: 'waived' });
	await adapter.createOrganizationLedgerClaim('demo-guild', {
		settlementAllocationId: 103,
		amount: 450,
		claimedAt: '2026-08-27T12:00:00.000Z',
	});
	await adapter.createOrganizationLedgerBatchClaims('demo-guild', {
		claimedAt: '2026-08-27T12:00:00.000Z',
		items: [{ settlementAllocationId: 103, amount: 450, claimedByCharacterId: 501 }],
		method: 'trade',
	});
	await adapter.updateOrganizationLedgerClaimStatus('demo-guild', 104, { status: 'confirmed' });

	assert.deepEqual(calls, [
		{
			method: 'getOrganizationsGames',
			payload: { query: { includeInactive: 'true' } },
		},
		{
			method: 'getOrganizations',
			payload: {
				query: { displayName: 'Moon Raiders', limit: 20, offset: 40, q: 'moon', gameSlug: 'wow' },
			},
		},
		{
			method: 'postOrganizations',
			payload: {
				body: {
					name: 'Demo Guild',
					initialCharacter: { gameId: 100, name: 'Tank Main' },
				},
			},
		},
		{
			method: 'getOrganizationsMe',
			payload: { query: { limit: 10, offset: 10 } },
		},
		{
			method: 'getOrganizationsByOrganization',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'patchOrganizationsByOrganization',
			payload: { pathParams: { organization: 'demo-guild' }, body: { name: 'Renamed Guild' } },
		},
		{
			method: 'getOrganizationsByOrganizationCharacters',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'postOrganizationsByOrganizationCharacters',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { gameId: 100, name: 'Healer Alt' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationCharactersSearch',
			payload: {
				pathParams: { organization: 'demo-guild' },
				query: { q: 'heal', isActive: 'true', limit: 5, offset: 0 },
			},
		},
		{
			method: 'getOrganizationsByOrganizationCharactersByCharacterId',
			payload: { pathParams: { organization: 'demo-guild', characterId: 501 } },
		},
		{
			method: 'patchOrganizationsByOrganizationCharactersByCharacterId',
			payload: {
				pathParams: { organization: 'demo-guild', characterId: 501 },
				body: { name: 'Healer Main', notes: 'Updated' },
			},
		},
		{
			method: 'deleteOrganizationsByOrganizationCharactersByCharacterId',
			payload: { pathParams: { organization: 'demo-guild', characterId: 502 } },
		},
		{
			method: 'patchOrganizationsByOrganizationCharactersByCharacterIdClaim',
			payload: {
				pathParams: { organization: 'demo-guild', characterId: 501 },
				body: { userId: 42, mode: 'assign', status: 'claimed' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationCharactersByCharacterIdClaimRequest',
			payload: {
				pathParams: { organization: 'demo-guild', characterId: 503 },
				body: { memberId: 88 },
			},
		},
		{
			method: 'postOrganizationsByOrganizationCharactersByCharacterIdUnclaim',
			payload: { pathParams: { organization: 'demo-guild', characterId: 504 } },
		},
		{
			method: 'getOrganizationsByOrganizationMembers',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'postOrganizationsByOrganizationMembers',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { userId: 42, characterId: 7, role: 'admin' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationManagementCharacters',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'getOrganizationsByOrganizationManagementMembersActive',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'getOrganizationsByOrganizationManagementMembersPending',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'getOrganizationsByOrganizationCharactersAvailable',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'postOrganizationsByOrganizationGames',
			payload: { pathParams: { organization: 'demo-guild' }, body: { gameId: 100, isPrimary: true } },
		},
		{
			method: 'patchOrganizationsByOrganizationGamesByGameId',
			payload: {
				pathParams: { organization: 'demo-guild', gameId: 100 },
				body: { displayName: 'WOW Main' },
			},
		},
		{
			method: 'patchOrganizationsByOrganizationGamesByGameIdPrimary',
			payload: { pathParams: { organization: 'demo-guild', gameId: 100 }, body: {} },
		},
		{
			method: 'postOrganizationsByOrganizationMembersInvite',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { userVanity: 'teammate', role: 'member' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationMembersApply',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { newCharacter: { gameId: 100, name: 'Fresh Alt' } },
			},
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdApprove',
			payload: { pathParams: { organization: 'demo-guild', memberId: 88 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdReject',
			payload: { pathParams: { organization: 'demo-guild', memberId: 89 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdCancel',
			payload: { pathParams: { organization: 'demo-guild', memberId: 94 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdLeave',
			payload: { pathParams: { organization: 'demo-guild', memberId: 95 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdRemove',
			payload: { pathParams: { organization: 'demo-guild', memberId: 96 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdAppointAdmin',
			payload: { pathParams: { organization: 'demo-guild', memberId: 90 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin',
			payload: { pathParams: { organization: 'demo-guild', memberId: 91 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdAcceptInvite',
			payload: { pathParams: { organization: 'demo-guild', memberId: 92 } },
		},
		{
			method: 'postOrganizationsByOrganizationMembersByMemberIdDeclineInvite',
			payload: { pathParams: { organization: 'demo-guild', memberId: 93 } },
		},
		{
			method: 'deleteOrganizationsByOrganization',
			payload: { pathParams: { organization: 'demo-guild' } },
		},
		{
			method: 'postOrganizationsByOrganizationAssets',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { name: 'Epic Sword', assetType: 'item' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationAssetsSearch',
			payload: {
				pathParams: { organization: 'demo-guild' },
				query: { q: 'epic', gameId: 100, assetType: 'item', limit: 10, offset: 0 },
			},
		},
		{
			method: 'getOrganizationsByOrganizationAssetsByAssetId',
			payload: { pathParams: { organization: 'demo-guild', assetId: 601 } },
		},
		{
			method: 'patchOrganizationsByOrganizationAssetsByAssetId',
			payload: {
				pathParams: { organization: 'demo-guild', assetId: 601 },
				body: { name: 'Epic Sword +1', status: 'active' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationAssetsResolve',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { gameId: 100, name: 'Epic Sword' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerEvents',
			payload: {
				pathParams: { organization: 'demo-guild' },
				query: {
					statusGroup: 'settleable',
					limit: 20,
					sortBy: 'occurredAt',
					sortOrder: 'desc',
				},
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerEventsByEventId',
			payload: {
				pathParams: { organization: 'demo-guild', eventId: 101 },
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerEvents',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { title: 'Weekly Raid', occurredAt: '2026-08-27T12:00:00.000Z' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerEventsBatch',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { events: [{ title: 'Weekly Raid 2', occurredAt: '2026-08-27T12:10:00.000Z' }] },
			},
		},
		{
			method: 'patchOrganizationsByOrganizationLedgerEventsByEventId',
			payload: {
				pathParams: { organization: 'demo-guild', eventId: 101 },
				body: { title: 'Weekly Raid Updated', holderType: 'character', holderRef: 'Tank Main' },
			},
		},
		{
			method: 'patchOrganizationsByOrganizationLedgerEventsByEventIdStatus',
			payload: {
				pathParams: { organization: 'demo-guild', eventId: 101 },
				body: { status: 'cancelled' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerSettlements',
			payload: {
				pathParams: { organization: 'demo-guild' },
				query: { status: 'draft', limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerSettlementDefaults',
			payload: {
				pathParams: { organization: 'demo-guild' },
				query: { gameId: 100 },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerClaimableRecipients',
			payload: {
				pathParams: { organization: 'demo-guild' },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId',
			payload: {
				pathParams: { organization: 'demo-guild', characterId: 501 },
				query: { includeSiblingCharacters: true },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerDashboardSummary',
			payload: {
				pathParams: { organization: 'demo-guild' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerDashboardCharacterSummariesQuery',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { characterIds: [501, 502] },
			},
		},
		{
			method: 'getOrganizationsByOrganizationLedgerDashboardCharactersByCharacterId',
			payload: {
				pathParams: { organization: 'demo-guild', characterId: 501 },
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerSettlements',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: {
					title: 'Raid Sale',
					decidedAt: '2026-08-27T12:00:00.000Z',
					grossAmount: 1000,
					netAmount: 900,
				},
			},
		},
		{
			method: 'patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus',
			payload: {
				pathParams: { organization: 'demo-guild', settlementId: 102 },
				body: { status: 'paid' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerAllocations',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: { settlementId: 102, amount: 450 },
			},
		},
		{
			method: 'patchOrganizationsByOrganizationLedgerAllocationsByAllocationIdStatus',
			payload: {
				pathParams: { organization: 'demo-guild', allocationId: 103 },
				body: { status: 'waived' },
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerClaims',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: {
					settlementAllocationId: 103,
					amount: 450,
					claimedAt: '2026-08-27T12:00:00.000Z',
				},
			},
		},
		{
			method: 'postOrganizationsByOrganizationLedgerClaimsBatch',
			payload: {
				pathParams: { organization: 'demo-guild' },
				body: {
					claimedAt: '2026-08-27T12:00:00.000Z',
					items: [{ settlementAllocationId: 103, amount: 450, claimedByCharacterId: 501 }],
					method: 'trade',
				},
			},
		},
		{
			method: 'patchOrganizationsByOrganizationLedgerClaimsByClaimIdStatus',
			payload: {
				pathParams: { organization: 'demo-guild', claimId: 104 },
				body: { status: 'confirmed' },
			},
		},
	]);
});

test('getApiAdapter returns a singleton instance and resetApiAdapter clears it', () => {
	resetApiAdapter();
	const first = getApiAdapter({ client: createMockClient().client });
	const second = getApiAdapter({ client: createMockClient().client });

	assert.equal(first, second);

	resetApiAdapter();
	const third = getApiAdapter({ client: createMockClient().client });
	assert.notEqual(first, third);
});

test('createApiAdapter returns a fresh adapter instance', () => {
	const first = createApiAdapter({ client: createMockClient().client });
	const second = createApiAdapter({ client: createMockClient().client });

	assert.notEqual(first, second);
});
