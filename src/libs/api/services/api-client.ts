import { OpenApiClient } from '../openapi/generated/client.ts';
import { createApiRuntimeConfig, type ApiRuntimeConfig } from '../runtime/api-config.ts';

export interface ApiClientLike {
	getHealthz: OpenApiClient['getHealthz'];
	postAuthRegister: OpenApiClient['postAuthRegister'];
	postAuthLogin: OpenApiClient['postAuthLogin'];
	getAuthMe: OpenApiClient['getAuthMe'];
	patchAuthMe: OpenApiClient['patchAuthMe'];
	postAuthLogout: OpenApiClient['postAuthLogout'];
	getAuthVerifyEmail: OpenApiClient['getAuthVerifyEmail'];
	postAuthResendVerificationEmail: OpenApiClient['postAuthResendVerificationEmail'];
	postAuthForgotPassword: OpenApiClient['postAuthForgotPassword'];
	postAuthResetPassword: OpenApiClient['postAuthResetPassword'];
	getAdminUsersPending: OpenApiClient['getAdminUsersPending'];
	getAdminUsersDisabled: OpenApiClient['getAdminUsersDisabled'];
	postAdminUsersByIdApprove: OpenApiClient['postAdminUsersByIdApprove'];
	postAdminUsersByIdDisable: OpenApiClient['postAdminUsersByIdDisable'];
	postAdminUsersByIdEnable: OpenApiClient['postAdminUsersByIdEnable'];
	getOrganizationsGames: OpenApiClient['getOrganizationsGames'];
	getOrganizations: OpenApiClient['getOrganizations'];
	postOrganizations: OpenApiClient['postOrganizations'];
	getOrganizationsMe: OpenApiClient['getOrganizationsMe'];
	getOrganizationsByOrganization: OpenApiClient['getOrganizationsByOrganization'];
	deleteOrganizationsByOrganization: OpenApiClient['deleteOrganizationsByOrganization'];
	patchOrganizationsByOrganization: OpenApiClient['patchOrganizationsByOrganization'];
	getOrganizationsByOrganizationCharacters: OpenApiClient['getOrganizationsByOrganizationCharacters'];
	postOrganizationsByOrganizationCharacters: OpenApiClient['postOrganizationsByOrganizationCharacters'];
	getOrganizationsByOrganizationMembers: OpenApiClient['getOrganizationsByOrganizationMembers'];
	postOrganizationsByOrganizationMembers: OpenApiClient['postOrganizationsByOrganizationMembers'];
	getOrganizationsByOrganizationManagementCharacters: OpenApiClient['getOrganizationsByOrganizationManagementCharacters'];
	getOrganizationsByOrganizationManagementMembersActive: OpenApiClient['getOrganizationsByOrganizationManagementMembersActive'];
	getOrganizationsByOrganizationManagementMembersPending: OpenApiClient['getOrganizationsByOrganizationManagementMembersPending'];
	getOrganizationsByOrganizationCharactersAvailable: OpenApiClient['getOrganizationsByOrganizationCharactersAvailable'];
	postOrganizationsByOrganizationMembersInvite: OpenApiClient['postOrganizationsByOrganizationMembersInvite'];
	postOrganizationsByOrganizationMembersApply: OpenApiClient['postOrganizationsByOrganizationMembersApply'];
	postOrganizationsByOrganizationMembersByMemberIdApprove: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdApprove'];
	postOrganizationsByOrganizationMembersByMemberIdReject: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdReject'];
	postOrganizationsByOrganizationMembersByMemberIdAppointAdmin: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdAppointAdmin'];
	postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin'];
	postOrganizationsByOrganizationMembersByMemberIdAcceptInvite: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdAcceptInvite'];
	postOrganizationsByOrganizationMembersByMemberIdDeclineInvite: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdDeclineInvite'];
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
