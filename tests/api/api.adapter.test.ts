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
		postAuthLogout: () => response('postAuthLogout'),
		getAuthVerifyEmail: (payload) => response('getAuthVerifyEmail', payload),
		postAuthResendVerificationEmail: (payload) => response('postAuthResendVerificationEmail', payload),
		postAuthForgotPassword: (payload) => response('postAuthForgotPassword', payload),
		postAuthResetPassword: (payload) => response('postAuthResetPassword', payload),
		getAdminUsersPending: () => response('getAdminUsersPending'),
		postAdminUsersByIdApprove: (payload) => response('postAdminUsersByIdApprove', payload),
		postAdminUsersByIdDisable: (payload) => response('postAdminUsersByIdDisable', payload),
		postAdminUsersByIdEnable: (payload) => response('postAdminUsersByIdEnable', payload),
		getOrganizationsGames: () => response('getOrganizationsGames'),
		getOrganizations: () => response('getOrganizations'),
		postOrganizations: (payload) => response('postOrganizations', payload),
		getOrganizationsMe: () => response('getOrganizationsMe'),
		getOrganizationsById: (payload) => response('getOrganizationsById', payload),
		deleteOrganizationsById: (payload) => response('deleteOrganizationsById', payload),
		patchOrganizationsById: (payload) => response('patchOrganizationsById', payload),
		getOrganizationsByIdCharacters: (payload) => response('getOrganizationsByIdCharacters', payload),
		postOrganizationsByIdCharacters: (payload) => response('postOrganizationsByIdCharacters', payload),
		getOrganizationsByIdMembers: (payload) => response('getOrganizationsByIdMembers', payload),
		postOrganizationsByIdMembers: (payload) => response('postOrganizationsByIdMembers', payload),
		postOrganizationsByIdMembersApply: (payload) => response('postOrganizationsByIdMembersApply', payload),
		postOrganizationsByIdMembersByMemberIdApprove: (payload) =>
			response('postOrganizationsByIdMembersByMemberIdApprove', payload),
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
	await adapter.logout();
	await adapter.verifyEmail({ key: 'verify-key', token: 'verify-token' });
	await adapter.resendVerificationEmail({ email: 'demo@example.com' });

	assert.deepEqual(calls, [
		{
			method: 'postAuthLogin',
			payload: { body: { email: 'demo@example.com', password: 'password123' } },
		},
		{ method: 'getAuthMe', payload: undefined },
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

	await adapter.approveUser(7);
	await adapter.disableUser(8);
	await adapter.enableUser(9);

	assert.deepEqual(calls, [
		{ method: 'postAdminUsersByIdApprove', payload: { pathParams: { id: 7 } } },
		{ method: 'postAdminUsersByIdDisable', payload: { pathParams: { id: 8 } } },
		{ method: 'postAdminUsersByIdEnable', payload: { pathParams: { id: 9 } } },
	]);
});

test('ApiAdapter maps organization operations to generated client methods', async () => {
	const { client, calls } = createMockClient();
	const adapter = new ApiAdapter(client);

	await adapter.listOrganizationGames();
	await adapter.listOrganizations();
	await adapter.createOrganization({
		name: 'Demo Guild',
		slug: 'demo-guild',
		initialCharacter: { gameId: 100, name: 'Tank Main' },
	});
	await adapter.listMyOrganizations();
	await adapter.getOrganization(10);
	await adapter.updateOrganization(10, { name: 'Renamed Guild' });
	await adapter.listOrganizationCharacters(10);
	await adapter.createOrganizationCharacter(10, { gameId: 100, name: 'Healer Alt' });
	await adapter.listOrganizationMembers(10);
	await adapter.addOrganizationMember(10, { userId: 42, characterId: 7, role: 'admin' });
	await adapter.applyToOrganization(10, { characterId: 9 });
	await adapter.approveOrganizationMember(10, 88);
	await adapter.deleteOrganization(10);

	assert.deepEqual(calls, [
		{ method: 'getOrganizationsGames', payload: undefined },
		{ method: 'getOrganizations', payload: undefined },
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
		{ method: 'getOrganizationsMe', payload: undefined },
		{ method: 'getOrganizationsById', payload: { pathParams: { id: 10 } } },
		{
			method: 'patchOrganizationsById',
			payload: { pathParams: { id: 10 }, body: { name: 'Renamed Guild' } },
		},
		{
			method: 'getOrganizationsByIdCharacters',
			payload: { pathParams: { id: 10 } },
		},
		{
			method: 'postOrganizationsByIdCharacters',
			payload: {
				pathParams: { id: 10 },
				body: { gameId: 100, name: 'Healer Alt' },
			},
		},
		{
			method: 'getOrganizationsByIdMembers',
			payload: { pathParams: { id: 10 } },
		},
		{
			method: 'postOrganizationsByIdMembers',
			payload: {
				pathParams: { id: 10 },
				body: { userId: 42, characterId: 7, role: 'admin' },
			},
		},
		{
			method: 'postOrganizationsByIdMembersApply',
			payload: {
				pathParams: { id: 10 },
				body: { characterId: 9 },
			},
		},
		{
			method: 'postOrganizationsByIdMembersByMemberIdApprove',
			payload: { pathParams: { id: 10, memberId: 88 } },
		},
		{ method: 'deleteOrganizationsById', payload: { pathParams: { id: 10 } } },
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
