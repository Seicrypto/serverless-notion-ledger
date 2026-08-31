const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env;

function normalizeAppMode(value: unknown) {
	return value === 'dev' ? 'dev' : 'prod';
}

export const APP_MODE = normalizeAppMode(viteEnv?.PUBLIC_APP_MODE);
export const IS_DEV_APP_MODE = APP_MODE === 'dev';
