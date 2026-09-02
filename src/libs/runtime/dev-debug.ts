import { APP_MODE, IS_DEV_APP_MODE } from './app-mode.ts';

type DebugPayload = Record<string, unknown> | undefined;

export function devDebugLog(scope: string, message: string, payload?: DebugPayload) {
	if (!IS_DEV_APP_MODE) {
		return;
	}

	console.log(`[raid-ledger][${APP_MODE}][${scope}] ${message}`, payload ?? {});
}

export function devDebugError(scope: string, message: string, payload?: DebugPayload) {
	if (!IS_DEV_APP_MODE) {
		return;
	}

	console.error(`[raid-ledger][${APP_MODE}][${scope}] ${message}`, payload ?? {});
}
