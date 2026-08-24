import { getApiAdapter } from '../adapters/api.adapter.ts';
import type { MyOrganizationsResponse } from '../openapi/generated/schema';
import type { OrganizationCardCacheSnapshot } from './organization-card.ts';
import { mapMyOrganizationToOrganizationCardResponse } from './organization-card.ts';

const MY_ORGANIZATIONS_CACHE_KEY = 'raid-ledger.my-organizations';
const MY_ORGANIZATIONS_CACHE_EVENT = 'raid-ledger:my-organizations-changed';
export const MY_ORGANIZATIONS_CACHE_TTL_MS = 60 * 60 * 1000;

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function createMyOrganizationsCacheSnapshot(response: MyOrganizationsResponse): OrganizationCardCacheSnapshot {
	const fetchedAt = new Date().toISOString();
	const expiresAt = new Date(Date.now() + MY_ORGANIZATIONS_CACHE_TTL_MS).toISOString();

	return {
		organizations: response.organizations.map(mapMyOrganizationToOrganizationCardResponse),
		fetchedAt,
		expiresAt,
	};
}

export function readMyOrganizationsCache(): OrganizationCardCacheSnapshot | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const raw = window.sessionStorage.getItem(MY_ORGANIZATIONS_CACHE_KEY);
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		if (
			!isObject(parsed) ||
			!Array.isArray(parsed.organizations) ||
			typeof parsed.fetchedAt !== 'string' ||
			typeof parsed.expiresAt !== 'string'
		) {
			return null;
		}

		return parsed as OrganizationCardCacheSnapshot;
	} catch {
		return null;
	}
}

export function writeMyOrganizationsCache(snapshot: OrganizationCardCacheSnapshot) {
	if (typeof window === 'undefined') {
		return snapshot;
	}

	window.sessionStorage.setItem(MY_ORGANIZATIONS_CACHE_KEY, JSON.stringify(snapshot));
	window.dispatchEvent(
		new CustomEvent<OrganizationCardCacheSnapshot>(MY_ORGANIZATIONS_CACHE_EVENT, {
			detail: snapshot,
		}),
	);
	return snapshot;
}

export function clearMyOrganizationsCache() {
	if (typeof window === 'undefined') {
		return;
	}

	window.sessionStorage.removeItem(MY_ORGANIZATIONS_CACHE_KEY);
}

export function invalidateMyOrganizationsCache() {
	clearMyOrganizationsCache();
}

export function isMyOrganizationsCacheExpired(snapshot: OrganizationCardCacheSnapshot) {
	return Date.parse(snapshot.expiresAt) <= Date.now();
}

export async function refreshMyOrganizationsCache() {
	const response = await getApiAdapter().listMyOrganizations();
	return writeMyOrganizationsCache(createMyOrganizationsCacheSnapshot(response));
}

export async function ensureMyOrganizationsCache() {
	const stored = readMyOrganizationsCache();
	if (stored && !isMyOrganizationsCacheExpired(stored)) {
		return stored;
	}

	return refreshMyOrganizationsCache();
}

export function subscribeMyOrganizationsCache(
	callback: (snapshot: OrganizationCardCacheSnapshot) => void,
) {
	const handler = (event: Event) => {
		if (event instanceof CustomEvent) {
			callback(event.detail as OrganizationCardCacheSnapshot);
		}
	};

	window.addEventListener(MY_ORGANIZATIONS_CACHE_EVENT, handler);
	return () => window.removeEventListener(MY_ORGANIZATIONS_CACHE_EVENT, handler);
}
