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
		postAuthLogout: () => response('postAuthLogout'),
		getAuthVerifyEmail: (payload) => response('getAuthVerifyEmail', payload),
		postAuthResendVerificationEmail: (payload) => response('postAuthResendVerificationEmail', payload),
		postAuthForgotPassword: (payload) => response('postAuthForgotPassword', payload),
		postAuthResetPassword: (payload) => response('postAuthResetPassword', payload),
		getAdminUsersPending: () => response('getAdminUsersPending'),
		getAdminUsersDisabled: (payload) => response('getAdminUsersDisabled', payload),
		postAdminUsersByIdApprove: (payload) => response('postAdminUsersByIdApprove', payload),
		postAdminUsersByIdDisable: (payload) => response('postAdminUsersByIdDisable', payload),
		postAdminUsersByIdEnable: (payload) => response('postAdminUsersByIdEnable', payload),
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
		postOrganizationsByOrganizationMembersInvite: (payload) =>
			response('postOrganizationsByOrganizationMembersInvite', payload),
		postOrganizationsByOrganizationMembersApply: (payload) =>
			response('postOrganizationsByOrganizationMembersApply', payload),
		postOrganizationsByOrganizationMembersByMemberIdApprove: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdApprove', payload),
		postOrganizationsByOrganizationMembersByMemberIdReject: (payload) =>
			response('postOrganizationsByOrganizationMembersByMemberIdReject', payload),
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
		getDashboardMe: () => response('getDashboardMe'),
		postNotionQuery: () => response('postNotionQuery'),
		postNotionMutate: () => response('postNotionMutate'),
	};

	return { client, calls };
}

test('ApiAdapter maps auth operations to generated client methods', async () => {
	const { client, calls } = createMockClient();
	const adapter = new ApiAdapter(client);

	await adapter.login({ email: 'demo@example.com', password: 'password123' });
	await adapter.getCurrentUser();
	await adapter.updateDisplayName({ displayName: 'Demo User' });
	await adapter.logout();
	await adapter.verifyEmail({ key: 'verify-key', token: 'verify-token' });
	await adapter.resendVerificationEmail({ email: 'demo@example.com' });

	assert.deepEqual(calls, [
		{
			method: 'postAuthLogin',
			payload: { body: { email: 'demo@example.com', password: 'password123' } },
		},
		{ method: 'getAuthMe', payload: undefined },
		{ method: 'patchAuthMe', payload: { body: { displayName: 'Demo User' } } },
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
	await adapter.approveUser(7);
	await adapter.disableUser(8);
	await adapter.enableUser(9);

	assert.deepEqual(calls, [
		{
			method: 'getAdminUsersDisabled',
			payload: { query: { displayName: 'mika', limit: 10, offset: 0 } },
		},
		{ method: 'postAdminUsersByIdApprove', payload: { pathParams: { id: 7 } } },
		{ method: 'postAdminUsersByIdDisable', payload: { pathParams: { id: 8 } } },
		{ method: 'postAdminUsersByIdEnable', payload: { pathParams: { id: 9 } } },
	]);
});

test('ApiAdapter maps organization operations to generated client methods', async () => {
	const { client, calls } = createMockClient();
	const adapter = new ApiAdapter(client);

	await adapter.listOrganizationGames({ includeInactive: true });
	await adapter.listOrganizations({ limit: 20, offset: 40, q: 'moon', gameSlug: 'wow' });
	await adapter.createOrganization({
		name: 'Demo Guild',
		slug: 'demo-guild',
		initialCharacter: { gameId: 100, name: 'Tank Main' },
	});
	await adapter.listMyOrganizations({ limit: 10, offset: 10 });
	await adapter.getOrganization('demo-guild');
	await adapter.updateOrganization('demo-guild', { name: 'Renamed Guild' });
	await adapter.listOrganizationCharacters('demo-guild');
	await adapter.createOrganizationCharacter('demo-guild', { gameId: 100, name: 'Healer Alt' });
	await adapter.listOrganizationMembers('demo-guild');
	await adapter.addOrganizationMember('demo-guild', { userId: 42, characterId: 7, role: 'admin' });
	await adapter.listOrganizationManagementCharacters('demo-guild');
	await adapter.listOrganizationActiveMembers('demo-guild');
	await adapter.listOrganizationPendingMembers('demo-guild');
	await adapter.listOrganizationAvailableCharacters('demo-guild');
	await adapter.inviteOrganizationMember('demo-guild', { userVanity: 'teammate', role: 'member' });
	await adapter.applyToOrganization('demo-guild', {
		newCharacter: { gameId: 100, name: 'Fresh Alt' },
	});
	await adapter.approveOrganizationMember('demo-guild', 88);
	await adapter.rejectOrganizationMember('demo-guild', 89);
	await adapter.appointOrganizationMemberAdmin('demo-guild', 90);
	await adapter.removeOrganizationMemberAdmin('demo-guild', 91);
	await adapter.acceptOrganizationInvite('demo-guild', 92);
	await adapter.declineOrganizationInvite('demo-guild', 93);
	await adapter.deleteOrganization('demo-guild');

	assert.deepEqual(calls, [
		{
			method: 'getOrganizationsGames',
			payload: { query: { includeInactive: 'true' } },
		},
		{
			method: 'getOrganizations',
			payload: { query: { limit: 20, offset: 40, q: 'moon', gameSlug: 'wow' } },
		},
		{
			method: 'postOrganizations',
			payload: {
				body: {
					name: 'Demo Guild',
					slug: 'demo-guild',
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
