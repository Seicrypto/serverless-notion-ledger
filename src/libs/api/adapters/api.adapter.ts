import { getApiClient, resetApiClient, type ApiClientLike } from '../services/api-client.ts';
import type { ApiRuntimeConfig } from '../runtime/api-config.ts';
import type {
	ForgotPasswordRequest,
	LoginRequest,
	RegisterRequest,
	ResetPasswordRequest,
} from '../openapi/generated/schema';

export interface ApiAdapterClientOptions {
	client?: ApiClientLike;
	runtimeConfig?: Partial<ApiRuntimeConfig>;
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

	logout() {
		return this.client.postAuthLogout();
	}

	verifyEmail(payload: { key: string; token: string }) {
		return this.client.getAuthVerifyEmail({ query: payload });
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
