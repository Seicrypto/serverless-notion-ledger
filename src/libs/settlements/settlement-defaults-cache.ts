import type { LedgerSettlementDefaultsResponse } from '../api/openapi/generated/schema';

const CACHE_PREFIX = 'settlementDefaults';
const CACHE_WINDOW_MS = 30 * 60 * 1000;

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

interface CachedSettlementDefaults {
	cachedAt: string;
	data: LedgerSettlementDefaultsResponse;
}

function createCacheKey(organization: string, gameId?: number) {
	return `${CACHE_PREFIX}:${organization}:${gameId ?? 'none'}`;
}

export function readSettlementDefaultsCache(
	storage: StorageLike,
	organization: string,
	gameId?: number,
	now = Date.now(),
) {
	const raw = storage.getItem(createCacheKey(organization, gameId));
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as CachedSettlementDefaults;
		const cachedAt = Date.parse(parsed.cachedAt);
		if (!Number.isFinite(cachedAt) || now - cachedAt > CACHE_WINDOW_MS) {
			storage.removeItem(createCacheKey(organization, gameId));
			return null;
		}

		return parsed.data;
	} catch {
		storage.removeItem(createCacheKey(organization, gameId));
		return null;
	}
}

export function writeSettlementDefaultsCache(
	storage: StorageLike,
	organization: string,
	data: LedgerSettlementDefaultsResponse,
	gameId?: number,
	cachedAt = new Date().toISOString(),
) {
	storage.setItem(
		createCacheKey(organization, gameId),
		JSON.stringify({
			cachedAt,
			data,
		} satisfies CachedSettlementDefaults),
	);
}
