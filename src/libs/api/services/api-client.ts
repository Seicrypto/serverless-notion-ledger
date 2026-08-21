import { OpenApiClient } from '../openapi/generated/client.ts';
import { createApiRuntimeConfig, type ApiRuntimeConfig } from '../runtime/api-config.ts';

export interface ApiClientLike {
	getHealthz: OpenApiClient['getHealthz'];
	postAuthRegister: OpenApiClient['postAuthRegister'];
	postAuthLogin: OpenApiClient['postAuthLogin'];
	postAuthLogout: OpenApiClient['postAuthLogout'];
	getAuthVerifyEmail: OpenApiClient['getAuthVerifyEmail'];
	postAuthForgotPassword: OpenApiClient['postAuthForgotPassword'];
	postAuthResetPassword: OpenApiClient['postAuthResetPassword'];
	getAdminUsersPending: OpenApiClient['getAdminUsersPending'];
	postAdminUsersByIdApprove: OpenApiClient['postAdminUsersByIdApprove'];
	postAdminUsersByIdDisable: OpenApiClient['postAdminUsersByIdDisable'];
	postAdminUsersByIdEnable: OpenApiClient['postAdminUsersByIdEnable'];
	getOrganizationsCurrent: OpenApiClient['getOrganizationsCurrent'];
	getOrganizationsCurrentMembers: OpenApiClient['getOrganizationsCurrentMembers'];
	getDashboardMe: OpenApiClient['getDashboardMe'];
	postNotionQuery: OpenApiClient['postNotionQuery'];
	postNotionMutate: OpenApiClient['postNotionMutate'];
}

let clientSingleton: OpenApiClient | null = null;

export function createApiClient(config: Partial<ApiRuntimeConfig> = {}) {
	const runtimeConfig = createApiRuntimeConfig(config);

	return new OpenApiClient({
		baseUrl: runtimeConfig.baseUrl,
		getHeaders: runtimeConfig.getHeaders,
		fetch: runtimeConfig.fetch,
	});
}

export function getApiClient(config: Partial<ApiRuntimeConfig> = {}) {
	if (!clientSingleton) {
		clientSingleton = createApiClient(config);
	}

	return clientSingleton as ApiClientLike;
}

export function resetApiClient() {
	clientSingleton = null;
}
