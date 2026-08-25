import { getApiClient, resetApiClient, type ApiClientLike } from '../services/api-client.ts';
import type { ApiRuntimeConfig } from '../runtime/api-config.ts';
import type {
	AddOrganizationMemberRequest,
	ApplyOrganizationMemberRequest,
	CreateCharacterRequest,
	CreateOrganizationRequest,
	ForgotPasswordRequest,
	InviteOrganizationMemberRequest,
	LoginRequest,
	RegisterRequest,
	ResetPasswordRequest,
	UpdateDisplayNameRequest,
	UpdateOrganizationRequest,
} from '../openapi/generated/schema';

export interface ApiAdapterClientOptions {
	client?: ApiClientLike;
	runtimeConfig?: Partial<ApiRuntimeConfig>;
}

export interface ListOrganizationGamesOptions {
	includeInactive?: boolean;
}

export interface ListOrganizationsOptions {
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

export interface ListDisabledUsersOptions {
	displayName?: string;
	email?: string;
	limit?: number;
	offset?: number;
}

export type OrganizationReference = string | number;

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

	approveUser(id: number) {
		return this.client.postAdminUsersByIdApprove({ pathParams: { id } });
	}

	disableUser(id: number) {
		return this.client.postAdminUsersByIdDisable({ pathParams: { id } });
	}

	enableUser(id: number) {
		return this.client.postAdminUsersByIdEnable({ pathParams: { id } });
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
