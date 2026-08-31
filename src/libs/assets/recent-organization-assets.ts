import type { Asset } from '../api/openapi/generated/schema';

export const RECENT_ORGANIZATION_ASSETS_STORAGE_KEY = 'recentOrganizationAssets';
export const RECENT_ORGANIZATION_ASSET_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const RECENT_ORGANIZATION_ASSET_LIMIT = 60;

export interface RecentOrganizationAssetEntry {
	organization: string;
	gameId?: number;
	assetId: number;
	name: string;
	assetType: Asset['assetType'];
	iconUrl?: string | null;
	createdAt: string;
}

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function pruneRecentOrganizationAssets(
	entries: RecentOrganizationAssetEntry[],
	now = Date.now(),
	windowMs = RECENT_ORGANIZATION_ASSET_WINDOW_MS,
) {
	const cutoff = now - windowMs;

	return entries
		.filter((entry) => {
			const createdAt = Date.parse(entry.createdAt);
			return Number.isFinite(createdAt) && createdAt >= cutoff && createdAt <= now;
		})
		.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
		.filter(
			(entry, index, array) =>
				array.findIndex(
					(candidate) => candidate.organization === entry.organization && candidate.assetId === entry.assetId,
				) === index,
		)
		.slice(0, RECENT_ORGANIZATION_ASSET_LIMIT);
}

export function parseRecentOrganizationAssets(raw: string | null) {
	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return pruneRecentOrganizationAssets(
			parsed.filter((entry): entry is RecentOrganizationAssetEntry => {
				if (!entry || typeof entry !== 'object') {
					return false;
				}

				const candidate = entry as Partial<RecentOrganizationAssetEntry>;
				return (
					typeof candidate.organization === 'string' &&
					(candidate.gameId === undefined || typeof candidate.gameId === 'number') &&
					typeof candidate.assetId === 'number' &&
					typeof candidate.name === 'string' &&
					typeof candidate.assetType === 'string' &&
					(candidate.iconUrl === undefined ||
						candidate.iconUrl === null ||
						typeof candidate.iconUrl === 'string') &&
					typeof candidate.createdAt === 'string'
				);
			}),
		);
	} catch {
		return [];
	}
}

export function loadRecentOrganizationAssets(storage: StorageLike) {
	return parseRecentOrganizationAssets(storage.getItem(RECENT_ORGANIZATION_ASSETS_STORAGE_KEY));
}

export function saveRecentOrganizationAssets(storage: StorageLike, entries: RecentOrganizationAssetEntry[]) {
	storage.setItem(RECENT_ORGANIZATION_ASSETS_STORAGE_KEY, JSON.stringify(pruneRecentOrganizationAssets(entries)));
}

export function recordRecentOrganizationAsset(
	storage: StorageLike,
	entry: RecentOrganizationAssetEntry,
) {
	const existing = loadRecentOrganizationAssets(storage);
	const nextEntries = pruneRecentOrganizationAssets([entry, ...existing], Date.parse(entry.createdAt));
	saveRecentOrganizationAssets(storage, nextEntries);
	return nextEntries;
}

export function getRecentOrganizationAssetsByOrganization(
	entries: RecentOrganizationAssetEntry[],
	organization: string,
) {
	return entries.filter((entry) => entry.organization === organization);
}

export function getRecentOrganizationAssetsByOrganizationAndGame(
	entries: RecentOrganizationAssetEntry[],
	organization: string,
	gameId: number,
) {
	return entries.filter(
		(entry) => entry.organization === organization && entry.gameId === gameId,
	);
}
