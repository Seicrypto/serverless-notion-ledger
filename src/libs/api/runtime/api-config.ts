export interface ApiRuntimeConfig {
	baseUrl: string;
	getHeaders?: () => HeadersInit | Promise<HeadersInit>;
	fetch?: typeof fetch;
}

function normalizeBaseUrl(baseUrl?: string) {
	return baseUrl?.trim().replace(/\/+$/, '') || 'http://localhost:8787';
}

function getPublicApiBaseUrl() {
	const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
	return viteEnv?.PUBLIC_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL;
}

export function createApiRuntimeConfig(overrides: Partial<ApiRuntimeConfig> = {}): ApiRuntimeConfig {
	return {
		baseUrl: normalizeBaseUrl(overrides.baseUrl ?? getPublicApiBaseUrl()),
		getHeaders: overrides.getHeaders,
		fetch: overrides.fetch,
	};
}
