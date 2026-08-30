import { getApiClient, resetApiClient, type ApiClientLike } from '../services/api-client.ts';
import type { ApiRuntimeConfig } from '../runtime/api-config.ts';
import type {
	AddOrganizationMemberRequest,
	ApplyOrganizationMemberRequest,
	CreateCharacterClaimRequest,
	CreateCharacterRequest,
	CreateAssetRequest,
	CreateLedgerAllocationRequest,
	CreateLedgerBatchClaimsRequest,
	CreateLedgerEventBatchRequest,
	CreateLedgerClaimRequest,
	CreateLedgerEventRequest,
	CreateLedgerSettlementRequest,
	CreateOrganizationGameRequest,
	OfficialUpdateGameMetadataRequest,
	QueryCharacterLedgerDashboardSummariesRequest,
	CreateOrganizationRequest,
	ForgotPasswordRequest,
	InviteOrganizationMemberRequest,
	LoginRequest,
	MergeAssetRequest,
	OrganizationCharacterClaimRequest,
	RegisterConflictResponse,
	RegisterRequest,
	RegisterResponse,
	ResolveOrganizationAssetRequest,
	ResetPasswordRequest,
	SetPrimaryOrganizationGameRequest,
	UpdateLedgerEventRequest,
	UpdateUserVanityRequest,
	UpdateOrganizationAssetRequest,
	UpdateOrganizationCharacterRequest,
	UpdateOrganizationGameRequest,
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

export interface ListPublicGamesOptions {
	includeInactive?: boolean;
}

export interface SearchPublicGamesOptions {
	limit?: number;
	name: string;
	offset?: number;
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

export interface SearchOrganizationCharactersOptions {
	isActive?: boolean;
	limit?: number;
	offset?: number;
	q: string;
}

export interface SearchOrganizationAssetsOptions {
	assetType?: CreateAssetRequest['assetType'];
	gameId?: number;
	limit?: number;
	offset?: number;
	q?: string;
	status?: 'candidate' | 'org_verified' | 'active' | 'merged' | 'deprecated';
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

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseJsonObject(raw: string) {
	try {
		const parsed = JSON.parse(raw);
		return isObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function isRegisterConflictResponse(value: unknown): value is RegisterConflictResponse {
	if (!isObject(value)) {
		return false;
	}

	return (
		typeof value.email === 'string' &&
		typeof value.error === 'string' &&
		typeof value.code === 'string' &&
		typeof value.canResendVerification === 'boolean' &&
		typeof value.requiresEmailVerification === 'boolean' &&
		(value.status === 'pending_verification' ||
			value.status === 'pending_approval' ||
			value.status === 'active' ||
			value.status === 'disabled')
	);
}

export type RegisterResult = RegisterResponse | RegisterConflictResponse;

export class ApiAdapter {
	private readonly client: ApiClientLike;

	constructor(client: ApiClientLike) {
		this.client = client;
	}

	health() {
		return this.client.getHealthz();
	}

	async register(payload: RegisterRequest): Promise<RegisterResult> {
		try {
			return await this.client.postAuthRegister({ body: payload });
		} catch (error) {
			if (error instanceof Error) {
				const parsed = parseJsonObject(error.message);
				if (isRegisterConflictResponse(parsed)) {
					return parsed;
				}
			}

			throw error;
		}
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

	deleteUserData(user: UserReference) {
		return this.client.deleteAdminUsersByUser({
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

	listPublicGames(options: ListPublicGamesOptions = {}) {
		return this.client.getGames({
			query: {
				includeInactive: options.includeInactive ? 'true' : undefined,
			},
		});
	}

	searchPublicGames(options: SearchPublicGamesOptions) {
		return this.client.getGamesSearch({
			query: options,
		});
	}

	getPublicGame(gameId: number) {
		return this.client.getGamesByGameId({
			pathParams: { gameId },
		});
	}

	updateOfficialGameMetadata(gameId: number, payload: OfficialUpdateGameMetadataRequest) {
		return this.client.patchOfficialGamesByGameId({
			pathParams: { gameId },
			body: payload,
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

	searchOrganizationCharacters(organization: OrganizationReference, options: SearchOrganizationCharactersOptions) {
		return this.client.getOrganizationsByOrganizationCharactersSearch({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			query: {
				...options,
				isActive: typeof options.isActive === 'boolean' ? String(options.isActive) as 'true' | 'false' : undefined,
			},
		});
	}

	getOrganizationCharacter(organization: OrganizationReference, characterId: number) {
		return this.client.getOrganizationsByOrganizationCharactersByCharacterId({
			pathParams: { organization: normalizeOrganizationReference(organization), characterId },
		});
	}

	updateOrganizationCharacter(
		organization: OrganizationReference,
		characterId: number,
		payload: UpdateOrganizationCharacterRequest,
	) {
		return this.client.patchOrganizationsByOrganizationCharactersByCharacterId({
			pathParams: { organization: normalizeOrganizationReference(organization), characterId },
			body: payload,
		});
	}

	deleteOrganizationCharacter(organization: OrganizationReference, characterId: number) {
		return this.client.deleteOrganizationsByOrganizationCharactersByCharacterId({
			pathParams: { organization: normalizeOrganizationReference(organization), characterId },
		});
	}

	updateOrganizationCharacterClaim(
		organization: OrganizationReference,
		characterId: number,
		payload: OrganizationCharacterClaimRequest,
	) {
		return this.client.patchOrganizationsByOrganizationCharactersByCharacterIdClaim({
			pathParams: { organization: normalizeOrganizationReference(organization), characterId },
			body: payload,
		});
	}

	createOrganizationCharacterClaimRequest(
		organization: OrganizationReference,
		characterId: number,
		payload: CreateCharacterClaimRequest,
	) {
		return this.client.postOrganizationsByOrganizationCharactersByCharacterIdClaimRequest({
			pathParams: { organization: normalizeOrganizationReference(organization), characterId },
			body: payload,
		});
	}

	unclaimOrganizationCharacter(organization: OrganizationReference, characterId: number) {
		return this.client.postOrganizationsByOrganizationCharactersByCharacterIdUnclaim({
			pathParams: { organization: normalizeOrganizationReference(organization), characterId },
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

	addOrganizationGame(organization: OrganizationReference, payload: CreateOrganizationGameRequest) {
		return this.client.postOrganizationsByOrganizationGames({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateOrganizationGame(
		organization: OrganizationReference,
		gameId: number,
		payload: UpdateOrganizationGameRequest,
	) {
		return this.client.patchOrganizationsByOrganizationGamesByGameId({
			pathParams: { organization: normalizeOrganizationReference(organization), gameId },
			body: payload,
		});
	}

	setPrimaryOrganizationGame(
		organization: OrganizationReference,
		gameId: number,
		payload: SetPrimaryOrganizationGameRequest = {},
	) {
		return this.client.patchOrganizationsByOrganizationGamesByGameIdPrimary({
			pathParams: { organization: normalizeOrganizationReference(organization), gameId },
			body: payload,
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

	searchOrganizationAssets(organization: OrganizationReference, options: SearchOrganizationAssetsOptions = {}) {
		return this.client.getOrganizationsByOrganizationAssetsSearch({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			query: options,
		});
	}

	getOrganizationAsset(organization: OrganizationReference, assetId: number) {
		return this.client.getOrganizationsByOrganizationAssetsByAssetId({
			pathParams: { organization: normalizeOrganizationReference(organization), assetId },
		});
	}

	updateOrganizationAsset(
		organization: OrganizationReference,
		assetId: number,
		payload: UpdateOrganizationAssetRequest,
	) {
		return this.client.patchOrganizationsByOrganizationAssetsByAssetId({
			pathParams: { organization: normalizeOrganizationReference(organization), assetId },
			body: payload,
		});
	}

	resolveOrganizationAsset(organization: OrganizationReference, payload: ResolveOrganizationAssetRequest) {
		return this.client.postOrganizationsByOrganizationAssetsResolve({
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

	createOrganizationLedgerEventsBatch(
		organization: OrganizationReference,
		payload: CreateLedgerEventBatchRequest,
	) {
		return this.client.postOrganizationsByOrganizationLedgerEventsBatch({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	updateOrganizationLedgerEvent(
		organization: OrganizationReference,
		eventId: number,
		payload: UpdateLedgerEventRequest,
	) {
		return this.client.patchOrganizationsByOrganizationLedgerEventsByEventId({
			pathParams: { organization: normalizeOrganizationReference(organization), eventId },
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

	getOrganizationLedgerDashboardSummary(organization: OrganizationReference) {
		return this.client.getOrganizationsByOrganizationLedgerDashboardSummary({
			pathParams: { organization: normalizeOrganizationReference(organization) },
		});
	}

	queryOrganizationCharacterLedgerDashboardSummaries(
		organization: OrganizationReference,
		payload: QueryCharacterLedgerDashboardSummariesRequest,
	) {
		return this.client.postOrganizationsByOrganizationLedgerDashboardCharacterSummariesQuery({
			pathParams: { organization: normalizeOrganizationReference(organization) },
			body: payload,
		});
	}

	getOrganizationCharacterLedgerDashboardDetail(
		organization: OrganizationReference,
		characterId: number,
	) {
		return this.client.getOrganizationsByOrganizationLedgerDashboardCharactersByCharacterId({
			pathParams: {
				organization: normalizeOrganizationReference(organization),
				characterId,
			},
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
