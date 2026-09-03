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
	deleteAdminUsersByUser: OpenApiClient['deleteAdminUsersByUser'];
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
	getOrganizationsByOrganizationCharactersSearch: OpenApiClient['getOrganizationsByOrganizationCharactersSearch'];
	getOrganizationsByOrganizationCharactersByCharacterId:
		OpenApiClient['getOrganizationsByOrganizationCharactersByCharacterId'];
	patchOrganizationsByOrganizationCharactersByCharacterId:
		OpenApiClient['patchOrganizationsByOrganizationCharactersByCharacterId'];
	deleteOrganizationsByOrganizationCharactersByCharacterId:
		OpenApiClient['deleteOrganizationsByOrganizationCharactersByCharacterId'];
	patchOrganizationsByOrganizationCharactersByCharacterIdClaim:
		OpenApiClient['patchOrganizationsByOrganizationCharactersByCharacterIdClaim'];
	postOrganizationsByOrganizationCharactersByCharacterIdClaimRequest:
		OpenApiClient['postOrganizationsByOrganizationCharactersByCharacterIdClaimRequest'];
	postOrganizationsByOrganizationCharactersByCharacterIdUnclaim:
		OpenApiClient['postOrganizationsByOrganizationCharactersByCharacterIdUnclaim'];
	getOrganizationsByOrganizationMembers: OpenApiClient['getOrganizationsByOrganizationMembers'];
	postOrganizationsByOrganizationMembers: OpenApiClient['postOrganizationsByOrganizationMembers'];
	getOrganizationsByOrganizationManagementCharacters: OpenApiClient['getOrganizationsByOrganizationManagementCharacters'];
	getOrganizationsByOrganizationManagementMembersActive: OpenApiClient['getOrganizationsByOrganizationManagementMembersActive'];
	getOrganizationsByOrganizationManagementMembersPending: OpenApiClient['getOrganizationsByOrganizationManagementMembersPending'];
	getOrganizationsByOrganizationCharactersAvailable: OpenApiClient['getOrganizationsByOrganizationCharactersAvailable'];
	postOrganizationsByOrganizationGames: OpenApiClient['postOrganizationsByOrganizationGames'];
	patchOrganizationsByOrganizationGamesByGameId: OpenApiClient['patchOrganizationsByOrganizationGamesByGameId'];
	patchOrganizationsByOrganizationGamesByGameIdPrimary:
		OpenApiClient['patchOrganizationsByOrganizationGamesByGameIdPrimary'];
	postOrganizationsByOrganizationMembersInvite: OpenApiClient['postOrganizationsByOrganizationMembersInvite'];
	postOrganizationsByOrganizationMembersApply: OpenApiClient['postOrganizationsByOrganizationMembersApply'];
	postOrganizationsByOrganizationMembersByMemberIdApprove: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdApprove'];
	postOrganizationsByOrganizationMembersByMemberIdReject: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdReject'];
	postOrganizationsByOrganizationMembersByMemberIdCancel: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdCancel'];
	postOrganizationsByOrganizationMembersByMemberIdLeave: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdLeave'];
	postOrganizationsByOrganizationMembersByMemberIdRemove: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdRemove'];
	postOrganizationsByOrganizationMembersByMemberIdAppointAdmin: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdAppointAdmin'];
	postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin'];
	postOrganizationsByOrganizationMembersByMemberIdAcceptInvite: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdAcceptInvite'];
	postOrganizationsByOrganizationMembersByMemberIdDeclineInvite: OpenApiClient['postOrganizationsByOrganizationMembersByMemberIdDeclineInvite'];
	getOrganizationsCurrent: OpenApiClient['getOrganizationsCurrent'];
	getOrganizationsCurrentMembers: OpenApiClient['getOrganizationsCurrentMembers'];
	postOrganizationsByOrganizationAssets: OpenApiClient['postOrganizationsByOrganizationAssets'];
	getOrganizationsByOrganizationAssets: OpenApiClient['getOrganizationsByOrganizationAssets'];
	getOrganizationsByOrganizationAssetsSearch: OpenApiClient['getOrganizationsByOrganizationAssetsSearch'];
	getOrganizationsByOrganizationAssetsByAssetId: OpenApiClient['getOrganizationsByOrganizationAssetsByAssetId'];
	patchOrganizationsByOrganizationAssetsByAssetId:
		OpenApiClient['patchOrganizationsByOrganizationAssetsByAssetId'];
	postOrganizationsByOrganizationAssetsResolve: OpenApiClient['postOrganizationsByOrganizationAssetsResolve'];
	getOrganizationsByOrganizationLedgerEvents: OpenApiClient['getOrganizationsByOrganizationLedgerEvents'];
	postOrganizationsByOrganizationLedgerEvents: OpenApiClient['postOrganizationsByOrganizationLedgerEvents'];
	postOrganizationsByOrganizationLedgerEventsBatch:
		OpenApiClient['postOrganizationsByOrganizationLedgerEventsBatch'];
	getOrganizationsByOrganizationLedgerEventsByEventId:
		OpenApiClient['getOrganizationsByOrganizationLedgerEventsByEventId'];
	patchOrganizationsByOrganizationLedgerEventsByEventId:
		OpenApiClient['patchOrganizationsByOrganizationLedgerEventsByEventId'];
	getOrganizationsByOrganizationLedgerClaimableRecipients:
		OpenApiClient['getOrganizationsByOrganizationLedgerClaimableRecipients'];
	getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId:
		OpenApiClient['getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId'];
	getOrganizationsByOrganizationLedgerDashboardSummary:
		OpenApiClient['getOrganizationsByOrganizationLedgerDashboardSummary'];
	postOrganizationsByOrganizationLedgerDashboardCharacterSummariesQuery:
		OpenApiClient['postOrganizationsByOrganizationLedgerDashboardCharacterSummariesQuery'];
	getOrganizationsByOrganizationLedgerDashboardCharactersByCharacterId:
		OpenApiClient['getOrganizationsByOrganizationLedgerDashboardCharactersByCharacterId'];
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
	postOrganizationsByOrganizationLedgerEventsByEventIdSettle:
		OpenApiClient['postOrganizationsByOrganizationLedgerEventsByEventIdSettle'];
	patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus:
		OpenApiClient['patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus'];
	patchOrganizationsByOrganizationLedgerSettlementsBySettlementId:
		OpenApiClient['patchOrganizationsByOrganizationLedgerSettlementsBySettlementId'];
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
