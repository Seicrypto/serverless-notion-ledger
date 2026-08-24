import { getApiClient, resetApiClient, type ApiClientLike } from '../services/api-client.ts';
import type { ApiRuntimeConfig } from '../runtime/api-config.ts';
import type {
	AddOrganizationMemberRequest,
	ApplyOrganizationMemberRequest,
	CreateCharacterRequest,
	CreateOrganizationRequest,
	ForgotPasswordRequest,
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

	getOrganization(id: number) {
		return this.client.getOrganizationsById({ pathParams: { id } });
	}

	deleteOrganization(id: number) {
		return this.client.deleteOrganizationsById({ pathParams: { id } });
	}

	updateOrganization(id: number, payload: UpdateOrganizationRequest) {
		return this.client.patchOrganizationsById({ pathParams: { id }, body: payload });
	}

	listOrganizationCharacters(id: number) {
		return this.client.getOrganizationsByIdCharacters({ pathParams: { id } });
	}

	createOrganizationCharacter(id: number, payload: CreateCharacterRequest) {
		return this.client.postOrganizationsByIdCharacters({ pathParams: { id }, body: payload });
	}

	listOrganizationMembers(id: number) {
		return this.client.getOrganizationsByIdMembers({ pathParams: { id } });
	}

	addOrganizationMember(id: number, payload: AddOrganizationMemberRequest) {
		return this.client.postOrganizationsByIdMembers({ pathParams: { id }, body: payload });
	}

	applyToOrganization(id: number, payload: ApplyOrganizationMemberRequest) {
		return this.client.postOrganizationsByIdMembersApply({ pathParams: { id }, body: payload });
	}

	approveOrganizationMember(id: number, memberId: number) {
		return this.client.postOrganizationsByIdMembersByMemberIdApprove({
			pathParams: { id, memberId },
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
