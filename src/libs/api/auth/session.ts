import { getApiAdapter } from '../adapters/api.adapter.ts';

export interface AuthUser {
	id: number;
	email: string;
	displayName: string | null;
	emailVerifiedAt: string | null;
	isStaff: boolean;
	staffRole: 'admin' | 'staff' | null;
	status: 'pending_verification' | 'pending_approval' | 'active' | 'disabled';
}

export interface AuthenticatedSession {
	kind: 'authenticated';
	user: AuthUser;
	fetchedAt: string;
}

export interface GuestSession {
	kind: 'guest';
	user: {
		displayName: string;
	};
	fetchedAt: string;
}

export type AuthSession = AuthenticatedSession | GuestSession;

export interface ParsedApiError {
	code?: string;
	error?: string;
	issues?: string[];
	requestId?: string;
}

const AUTH_SESSION_KEY = 'raid-ledger.auth-session';
const AUTH_SESSION_EVENT = 'raid-ledger:auth-session-changed';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function toNullableString(value: unknown) {
	return typeof value === 'string' ? value : null;
}

export function normalizeAuthUser(user: Record<string, unknown>): AuthUser {
	return {
		id: Number(user.id),
		email: typeof user.email === 'string' ? user.email : '',
		displayName: toNullableString(user.displayName),
		emailVerifiedAt: toNullableString(user.emailVerifiedAt),
		isStaff: Boolean(user.isStaff),
		staffRole: user.staffRole === 'admin' || user.staffRole === 'staff' ? user.staffRole : null,
		status:
			user.status === 'pending_verification' ||
			user.status === 'pending_approval' ||
			user.status === 'active' ||
			user.status === 'disabled'
				? user.status
				: 'disabled',
	};
}

export function isAuthenticatedSession(session: AuthSession | null): session is AuthenticatedSession {
	return session?.kind === 'authenticated';
}

export function createGuestSession(guestLabel = 'Guest'): GuestSession {
	return {
		kind: 'guest',
		user: {
			displayName: guestLabel,
		},
		fetchedAt: new Date().toISOString(),
	};
}

export function readAuthSession(): AuthSession | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		if (!isObject(parsed) || typeof parsed.kind !== 'string') {
			return null;
		}

		return parsed as AuthSession;
	} catch {
		return null;
	}
}

export function writeAuthSession(session: AuthSession) {
	if (typeof window === 'undefined') {
		return session;
	}

	window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
	window.dispatchEvent(new CustomEvent<AuthSession>(AUTH_SESSION_EVENT, { detail: session }));
	return session;
}

export function clearAuthSession() {
	if (typeof window === 'undefined') {
		return;
	}

	window.sessionStorage.removeItem(AUTH_SESSION_KEY);
}

export async function refreshAuthSession(guestLabel = 'Guest') {
	try {
		const response = await getApiAdapter().getCurrentUser();
		return writeAuthSession({
			kind: 'authenticated',
			user: normalizeAuthUser(response.user as Record<string, unknown>),
			fetchedAt: new Date().toISOString(),
		});
	} catch {
		return writeAuthSession(createGuestSession(guestLabel));
	}
}

export function updateAuthenticatedSessionUserDisplayName(displayName: string) {
	const stored = readAuthSession();
	if (!isAuthenticatedSession(stored)) {
		return null;
	}

	return writeAuthSession({
		...stored,
		user: {
			...stored.user,
			displayName,
		},
		fetchedAt: new Date().toISOString(),
	});
}

export async function ensureAuthSession(guestLabel = 'Guest') {
	const stored = readAuthSession();
	if (stored) {
		return stored;
	}

	return refreshAuthSession(guestLabel);
}

export function markGuestSession(guestLabel = 'Guest') {
	return writeAuthSession(createGuestSession(guestLabel));
}

export function subscribeAuthSession(callback: (session: AuthSession) => void) {
	const handler = (event: Event) => {
		if (event instanceof CustomEvent) {
			callback(event.detail as AuthSession);
		}
	};

	window.addEventListener(AUTH_SESSION_EVENT, handler);
	return () => window.removeEventListener(AUTH_SESSION_EVENT, handler);
}

export function parseApiError(error: unknown): ParsedApiError | null {
	if (!(error instanceof Error)) {
		return null;
	}

	try {
		const parsed = JSON.parse(error.message);
		if (!isObject(parsed)) {
			return null;
		}

		return {
			code: typeof parsed.code === 'string' ? parsed.code : undefined,
			error: typeof parsed.error === 'string' ? parsed.error : undefined,
			issues: Array.isArray(parsed.issues)
				? parsed.issues.filter((issue): issue is string => typeof issue === 'string')
				: undefined,
			requestId: typeof parsed.requestId === 'string' ? parsed.requestId : undefined,
		};
	} catch {
		return null;
	}
}

export function getApiErrorCode(error: unknown) {
	return parseApiError(error)?.code;
}

export function getErrorMessage(error: unknown, fallback: string) {
	const parsed = parseApiError(error);
	if (parsed?.issues?.length) {
		return parsed.issues.join('\n');
	}

	if (parsed?.error?.trim()) {
		return parsed.error;
	}

	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}
