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

const AUTH_SESSION_KEY = 'raid-ledger.auth-session';
const AUTH_SESSION_EVENT = 'raid-ledger:auth-session-changed';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
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
			user: response.user,
			fetchedAt: new Date().toISOString(),
		});
	} catch {
		return writeAuthSession(createGuestSession(guestLabel));
	}
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

export function getErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}
