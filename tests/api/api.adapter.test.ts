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
