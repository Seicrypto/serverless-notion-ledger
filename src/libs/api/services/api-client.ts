import { OpenApiClient } from '../openapi/generated/client.ts';
import { createApiRuntimeConfig, type ApiRuntimeConfig } from '../runtime/api-config.ts';

export interface ApiClientLike {
	getHealthz: OpenApiClient['getHealthz'];
	postAuthRegister: OpenApiClient['postAuthRegister'];
	postAuthLogin: OpenApiClient['postAuthLogin'];
	getAuthMe: OpenApiClient['getAuthMe'];
	patchAuthMe: OpenApiClient['patchAuthMe'];
	getAuthUsersByUser: OpenApiClient['getAuthUsersByUser'];
	postAuthLogout: OpenApiClient['postAuthLogout'];
	getAuthVerifyEmail: OpenApiClient['getAuthVerifyEmail'];
	postAuthResendVerificationEmail: OpenApiClient['postAuthResendVerificationEmail'];
	postAuthForgotPassword: OpenApiClient['postAuthForgotPassword'];
	postAuthResetPassword: OpenApiClient['postAuthResetPassword'];
	getAdminUsersPending: OpenApiClient['getAdminUsersPending'];
	getAdminUsersDisabled: OpenApiClient['getAdminUsersDisabled'];
	getAdminUsersByUser: OpenApiClient['getAdminUsersByUser'];
	patchAdminOrganizationsByOrganizationVanity: OpenApiClient['patchAdminOrganizationsByOrganizationVanity'];
	patchAdminUsersByUserVanity: OpenApiClient['patchAdminUsersByUserVanity'];
	postAdminUsersByIdApprove: OpenApiClient['postAdminUsersByIdApprove'];
	postAdminUsersByIdDisable: OpenApiClient['postAdminUsersByIdDisable'];
	postAdminUsersByIdEnable: OpenApiClient['postAdminUsersByIdEnable'];
	postAdminAssetsByAssetIdMerge: OpenApiClient['postAdminAssetsByAssetIdMerge'];
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
	postOrganizationsByOrganizationAssets: OpenApiClient['postOrganizationsByOrganizationAssets'];
	getOrganizationsByOrganizationLedgerEvents: OpenApiClient['getOrganizationsByOrganizationLedgerEvents'];
	postOrganizationsByOrganizationLedgerEvents: OpenApiClient['postOrganizationsByOrganizationLedgerEvents'];
	getOrganizationsByOrganizationLedgerEventsByEventId:
		OpenApiClient['getOrganizationsByOrganizationLedgerEventsByEventId'];
	getOrganizationsByOrganizationLedgerClaimableRecipients:
		OpenApiClient['getOrganizationsByOrganizationLedgerClaimableRecipients'];
	getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId:
		OpenApiClient['getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId'];
	getOrganizationsByOrganizationLedgerSettlements: OpenApiClient['getOrganizationsByOrganizationLedgerSettlements'];
	patchOrganizationsByOrganizationLedgerEventsByEventIdStatus:
		OpenApiClient['patchOrganizationsByOrganizationLedgerEventsByEventIdStatus'];
	postOrganizationsByOrganizationLedgerSettlements: OpenApiClient['postOrganizationsByOrganizationLedgerSettlements'];
	getOrganizationsByOrganizationLedgerSettlementDefaults:
		OpenApiClient['getOrganizationsByOrganizationLedgerSettlementDefaults'];
	postOrganizationsByOrganizationLedgerClaimsBatch:
		OpenApiClient['postOrganizationsByOrganizationLedgerClaimsBatch'];
	postOrganizationsByOrganizationLedgerSettlementsBySettlementIdDisburse:
		OpenApiClient['postOrganizationsByOrganizationLedgerSettlementsBySettlementIdDisburse'];
	patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus:
		OpenApiClient['patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus'];
	postOrganizationsByOrganizationLedgerAllocations: OpenApiClient['postOrganizationsByOrganizationLedgerAllocations'];
	patchOrganizationsByOrganizationLedgerAllocationsByAllocationIdStatus:
		OpenApiClient['patchOrganizationsByOrganizationLedgerAllocationsByAllocationIdStatus'];
	postOrganizationsByOrganizationLedgerClaims: OpenApiClient['postOrganizationsByOrganizationLedgerClaims'];
	patchOrganizationsByOrganizationLedgerClaimsByClaimIdStatus:
		OpenApiClient['patchOrganizationsByOrganizationLedgerClaimsByClaimIdStatus'];
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
