import { getApiClient, resetApiClient, type ApiClientLike } from '../services/api-client.ts';
import type { ApiRuntimeConfig } from '../runtime/api-config.ts';
import type {
	AddOrganizationMemberRequest,
	ApplyOrganizationMemberRequest,
	CreateCharacterRequest,
	CreateAssetRequest,
	CreateLedgerAllocationRequest,
	CreateLedgerBatchClaimsRequest,
	CreateLedgerClaimRequest,
	CreateLedgerEventRequest,
	CreateLedgerSettlementRequest,
	CreateOrganizationRequest,
	ForgotPasswordRequest,
	InviteOrganizationMemberRequest,
	LoginRequest,
	MergeAssetRequest,
	RegisterRequest,
	ResetPasswordRequest,
	UpdateUserVanityRequest,
	UpdateLedgerAllocationStatusRequest,
	UpdateLedgerClaimStatusRequest,
	UpdateLedgerEventStatusRequest,
	UpdateLedgerSettlementStatusRequest,
	UpdateDisplayNameRequest,
	UpdateOrganizationRequest,
	UpdateOrganizationVanityRequest,
} from '../openapi/generated/schema';

export interface ApiAdapterClientOptions {
	client?: ApiClientLike;
	runtimeConfig?: Partial<ApiRuntimeConfig>;
}

export interface ListOrganizationGamesOptions {
	includeInactive?: boolean;
}

export interface ListOrganizationsOptions {
	displayName?: string;
	gameId?: number;
	gameSlug?: string;
	limit?: number;
	offset?: number;
	q?: string;
}

export interface ListMyOrganizationsOptions {
	limit?: number;
	offset?: number;
}

export interface ListOrganizationLedgerEventsOptions {
	assetId?: number;
	createdByUserId?: number;
	eventType?: CreateLedgerEventRequest['eventType'];
	fromOccurredAt?: string;
	holderRef?: string;
	holderType?: CreateLedgerEventRequest['holderType'];
	limit?: number;
	offset?: number;
	sortBy?: 'occurredAt' | 'createdAt' | 'title' | 'updatedAt';
	sortOrder?: 'asc' | 'desc';
	status?: 'open' | 'ready_for_settlement' | 'partially_settled' | 'settled' | 'cancelled';
	statusGroup?: 'unsettled' | 'settleable' | 'settled' | 'cancelled';
	toOccurredAt?: string;
}

export interface ListOrganizationLedgerSettlementsOptions {
	createdByUserId?: number;
	eventId?: number;
	feeMode?: CreateLedgerSettlementRequest['feeMode'];
	fromDecidedAt?: string;
	limit?: number;
	offset?: number;
	sortBy?: 'decidedAt' | 'createdAt' | 'grossAmount' | 'netAmount' | 'updatedAt';
	sortOrder?: 'asc' | 'desc';
	status?: 'draft' | 'calculated' | 'paying' | 'paid' | 'cancelled';
	settlementType?: CreateLedgerSettlementRequest['settlementType'];
	toDecidedAt?: string;
	unitAssetId?: number;
}

export interface GetOrganizationClaimableRecipientDetailOptions {
	includeSiblingCharacters?: boolean;
}

export interface ListDisabledUsersOptions {
	displayName?: string;
	email?: string;
	limit?: number;
	offset?: number;
}

export type UserReference = string | number;
export type OrganizationReference = string | number;

function normalizeUserReference(user: UserReference) {
	return String(user);
}

function normalizeOrganizationReference(organization: OrganizationReference) {
	return String(organization);
}

export class ApiAdapter {
	private readonly client: ApiClientLike;

	constructor(client: ApiClientLike) {
		this.client = client;
	}

	health() {
		return this.client.getHealthz();
	}

	register(payload: RegisterRequest) {
		return this.client.postAuthRegister({ body: payload });
	}

	login(payload: LoginRequest) {
		return this.client.postAuthLogin({ body: payload });
	}

	getCurrentUser() {
		return this.client.getAuthMe();
	}

	updateDisplayName(payload: UpdateDisplayNameRequest) {
		return this.client.patchAuthMe({ body: payload });
	}

	getPublicUser(user: UserReference) {
		return this.client.getAuthUsersByUser({
			pathParams: { user: normalizeUserReference(user) },
		});
	}

	logout() {
		return this.client.postAuthLogout();
	}

	verifyEmail(payload: { key: string; token: string }) {
		return this.client.getAuthVerifyEmail({ query: payload });
	}

	resendVerificationEmail(payload: { email: string }) {
		return this.client.postAuthResendVerificationEmail({ body: payload });
	}

	forgotPassword(payload: ForgotPasswordRequest) {
		return this.client.postAuthForgotPassword({ body: payload });
	}

	resetPassword(payload: ResetPasswordRequest) {
		return this.client.postAuthResetPassword({ body: payload });
	}

	listPendingUsers() {
		return this.client.getAdminUsersPending();
	}

	listDisabledUsers(options: ListDisabledUsersOptions = {}) {
		return this.client.getAdminUsersDisabled({
			query: options,
		});
	}

	getManagedUser(user: UserReference) {
		return this.client.getAdminUsersByUser({
			pathParams: { user: normalizeUserReference(user) },
		});
	}

	updateOrganizationVanity(organization: OrganizationReference, payload: UpdateOrganizationVanityRequest) {
		return this.client.patchAdminOrganizationsByOrganizationVanity({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateUserVanity(user: UserReference, payload: UpdateUserVanityRequest) {
		return this.client.patchAdminUsersByUserVanity({
			pathParams: { user: normalizeUserReference(user) },
			body: payload,
		});
	}

	approveUser(id: number) {
		return this.client.postAdminUsersByIdApprove({ pathParams: { id } });
	}

	disableUser(id: number) {
		return this.client.postAdminUsersByIdDisable({ pathParams: { id } });
	}

	enableUser(id: number) {
		return this.client.postAdminUsersByIdEnable({ pathParams: { id } });
	}

	mergeAsset(assetId: number, payload: MergeAssetRequest) {
		return this.client.postAdminAssetsByAssetIdMerge({
			pathParams: { assetId },
			body: payload,
		});
	}

	listOrganizationGames(options: ListOrganizationGamesOptions = {}) {
		return this.client.getOrganizationsGames({
			query: {
				includeInactive: options.includeInactive ? 'true' : undefined,
			},
		});
	}

	listOrganizations(options: ListOrganizationsOptions = {}) {
		return this.client.getOrganizations({
			query: options,
		});
	}

	createOrganization(payload: CreateOrganizationRequest) {
		return this.client.postOrganizations({ body: payload });
	}

	listMyOrganizations(options: ListMyOrganizationsOptions = {}) {
		return this.client.getOrganizationsMe({
			query: options,
		});
	}

	getOrganization(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganization({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	deleteOrganization(organization: OrganizationReference) {
		return this.client.deleteOrganizationsByOrganization({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	updateOrganization(organization: OrganizationReference, payload: UpdateOrganizationRequest) {
		return this.client.patchOrganizationsByOrganization({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	listOrganizationCharacters(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationCharacters({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	createOrganizationCharacter(organization: OrganizationReference, payload: CreateCharacterRequest) {
		return this.client.postOrganizationsByOrganizationCharacters({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	listOrganizationMembers(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationMembers({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	addOrganizationMember(organization: OrganizationReference, payload: AddOrganizationMemberRequest) {
		return this.client.postOrganizationsByOrganizationMembers({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	listOrganizationManagementCharacters(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationManagementCharacters({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	listOrganizationActiveMembers(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationManagementMembersActive({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	listOrganizationPendingMembers(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationManagementMembersPending({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	listOrganizationAvailableCharacters(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationCharactersAvailable({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	inviteOrganizationMember(organization: OrganizationReference, payload: InviteOrganizationMemberRequest) {
		return this.client.postOrganizationsByOrganizationMembersInvite({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	applyToOrganization(organization: OrganizationReference, payload: ApplyOrganizationMemberRequest) {
		return this.client.postOrganizationsByOrganizationMembersApply({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	approveOrganizationMember(organization: OrganizationReference, memberId: number) {
		return this.client.postOrganizationsByOrganizationMembersByMemberIdApprove({
			pathParams: { organization: normalizeOrganizationReference(organization), memberId },
		});
	}

	rejectOrganizationMember(organization: OrganizationReference, memberId: number) {
		return this.client.postOrganizationsByOrganizationMembersByMemberIdReject({
			pathParams: { organization: normalizeOrganizationReference(organization), memberId },
		});
	}

	appointOrganizationMemberAdmin(organization: OrganizationReference, memberId: number) {
		return this.client.postOrganizationsByOrganizationMembersByMemberIdAppointAdmin({
			pathParams: { organization: normalizeOrganizationReference(organization), memberId },
		});
	}

	removeOrganizationMemberAdmin(organization: OrganizationReference, memberId: number) {
		return this.client.postOrganizationsByOrganizationMembersByMemberIdRemoveAdmin({
			pathParams: { organization: normalizeOrganizationReference(organization), memberId },
		});
	}

	acceptOrganizationInvite(organization: OrganizationReference, memberId: number) {
		return this.client.postOrganizationsByOrganizationMembersByMemberIdAcceptInvite({
			pathParams: { organization: normalizeOrganizationReference(organization), memberId },
		});
	}

	declineOrganizationInvite(organization: OrganizationReference, memberId: number) {
		return this.client.postOrganizationsByOrganizationMembersByMemberIdDeclineInvite({
			pathParams: { organization: normalizeOrganizationReference(organization), memberId },
		});
	}

	getCurrentOrganization() {
		return this.client.getOrganizationsCurrent();
	}

	getCurrentOrganizationMembers() {
		return this.client.getOrganizationsCurrentMembers();
	}

	createOrganizationAsset(organization: OrganizationReference, payload: CreateAssetRequest) {
		return this.client.postOrganizationsByOrganizationAssets({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	listOrganizationLedgerEvents(
		organization: OrganizationReference,
		options: ListOrganizationLedgerEventsOptions = {},
	) {
		return this.client.getOrganizationsByOrganizationLedgerEvents({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			query: options,
		});
	}

	getOrganizationLedgerEvent(organization: OrganizationReference, eventId: number) {
		return this.client.getOrganizationsByOrganizationLedgerEventsByEventId({
			pathParams: { organization: normalizeOrganizationReference(organization), eventId },
		});
	}

	createOrganizationLedgerEvent(organization: OrganizationReference, payload: CreateLedgerEventRequest) {
		return this.client.postOrganizationsByOrganizationLedgerEvents({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateOrganizationLedgerEventStatus(
		organization: OrganizationReference,
		eventId: number,
		payload: UpdateLedgerEventStatusRequest,
	) {
		return this.client.patchOrganizationsByOrganizationLedgerEventsByEventIdStatus({
			pathParams: { organization: normalizeOrganizationReference(organization), eventId },
			body: payload,
		});
	}

	listOrganizationLedgerSettlements(
		organization: OrganizationReference,
		options: ListOrganizationLedgerSettlementsOptions = {},
	) {
		return this.client.getOrganizationsByOrganizationLedgerSettlements({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			query: options,
		});
	}

	getOrganizationLedgerSettlementDefaults(
		organization: OrganizationReference,
		options: { gameId?: number } = {},
	) {
		return this.client.getOrganizationsByOrganizationLedgerSettlementDefaults({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			query: options,
		});
	}

	createOrganizationLedgerSettlement(
		organization: OrganizationReference,
		payload: CreateLedgerSettlementRequest,
	) {
		return this.client.postOrganizationsByOrganizationLedgerSettlements({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateOrganizationLedgerSettlementStatus(
		organization: OrganizationReference,
		settlementId: number,
		payload: UpdateLedgerSettlementStatusRequest,
	) {
		return this.client.patchOrganizationsByOrganizationLedgerSettlementsBySettlementIdStatus({
			pathParams: { organization: normalizeOrganizationReference(organization), settlementId },
			body: payload,
		});
	}

	listOrganizationClaimableRecipients(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationLedgerClaimableRecipients({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	getOrganizationClaimableRecipientDetail(
		organization: OrganizationReference,
		characterId: number,
		options: GetOrganizationClaimableRecipientDetailOptions = {},
	) {
		return this.client.getOrganizationsByOrganizationLedgerClaimableRecipientsByCharacterId({
			pathParams: {
				organization: normalizeOrganizationReference(organization),
				characterId,
			},
			query: options,
		});
	}

	createOrganizationLedgerBatchClaims(
		organization: OrganizationReference,
		payload: CreateLedgerBatchClaimsRequest,
	) {
		return this.client.postOrganizationsByOrganizationLedgerClaimsBatch({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	createOrganizationLedgerAllocation(
		organization: OrganizationReference,
		payload: CreateLedgerAllocationRequest,
	) {
		return this.client.postOrganizationsByOrganizationLedgerAllocations({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateOrganizationLedgerAllocationStatus(
		organization: OrganizationReference,
		allocationId: number,
		payload: UpdateLedgerAllocationStatusRequest,
	) {
		return this.client.patchOrganizationsByOrganizationLedgerAllocationsByAllocationIdStatus({
			pathParams: { organization: normalizeOrganizationReference(organization), allocationId },
			body: payload,
		});
	}

	createOrganizationLedgerClaim(organization: OrganizationReference, payload: CreateLedgerClaimRequest) {
		return this.client.postOrganizationsByOrganizationLedgerClaims({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateOrganizationLedgerClaimStatus(
		organization: OrganizationReference,
		claimId: number,
		payload: UpdateLedgerClaimStatusRequest,
	) {
		return this.client.patchOrganizationsByOrganizationLedgerClaimsByClaimIdStatus({
			pathParams: { organization: normalizeOrganizationReference(organization), claimId },
			body: payload,
		});
	}

	getMyDashboard() {
		return this.client.getDashboardMe();
	}

	queryNotion() {
		return this.client.postNotionQuery();
	}

	mutateNotion() {
		return this.client.postNotionMutate();
	}
}

let adapterSingleton: ApiAdapter | null = null;

export function createApiAdapter(options: ApiAdapterClientOptions = {}) {
	return new ApiAdapter(options.client ?? getApiClient(options.runtimeConfig));
}

export function getApiAdapter(options: ApiAdapterClientOptions = {}) {
	if (!adapterSingleton) {
		adapterSingleton = createApiAdapter(options);
	}

	return adapterSingleton;
}

export function resetApiAdapter() {
	adapterSingleton = null;
	resetApiClient();
}
