import { loadRecentClaimCreations } from '../claims/recent-claim-creations.ts';
import { loadRecentEventCreations } from '../events/recent-event-creations.ts';
import { loadRecentSettlementCreations } from '../settlements/recent-settlement-creations.ts';

export const LEDGER_PREFERRED_ORGANIZATION_STORAGE_KEY = 'raid-ledger.preferred-organization';

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

interface RecentOrganizationActivity {
	organization: string;
	createdAt: string;
	source: 'event' | 'settlement' | 'claim';
}

export function readPreferredOrganization(storage: StorageLike) {
	const value = storage.getItem(LEDGER_PREFERRED_ORGANIZATION_STORAGE_KEY);
	return value && value.trim() ? value : null;
}

export function writePreferredOrganization(storage: StorageLike, organization: string) {
	storage.setItem(LEDGER_PREFERRED_ORGANIZATION_STORAGE_KEY, organization);
	return organization;
}

export function collectRecentOrganizationActivities(
	localStorageLike: StorageLike,
	sessionStorageLike: StorageLike,
) {
	const eventActivities: RecentOrganizationActivity[] = loadRecentEventCreations(localStorageLike).map((entry) => ({
		organization: entry.organization,
		createdAt: entry.createdAt,
		source: 'event',
	}));
	const settlementActivities: RecentOrganizationActivity[] = loadRecentSettlementCreations(
		sessionStorageLike,
	).map((entry) => ({
		organization: entry.organization,
		createdAt: entry.createdAt,
		source: 'settlement',
	}));
	const claimActivities: RecentOrganizationActivity[] = loadRecentClaimCreations(localStorageLike).map((entry) => ({
		organization: entry.organization,
		createdAt: entry.createdAt,
		source: 'claim',
	}));

	return [...eventActivities, ...settlementActivities, ...claimActivities].sort(
		(left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
	);
}

export function getLatestActiveOrganization(
	localStorageLike: StorageLike,
	sessionStorageLike: StorageLike,
) {
	return collectRecentOrganizationActivities(localStorageLike, sessionStorageLike)[0]?.organization ?? null;
}
