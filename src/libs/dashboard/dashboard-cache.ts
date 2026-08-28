import type {
	CharacterLedgerDashboardDetailResponse,
	CharacterLedgerDashboardSummaryItem,
	OrganizationCharacter,
	OrganizationLedgerDashboardSummaryResponse,
} from '../api/openapi/generated/schema';

const DASHBOARD_CACHE_PREFIX = 'raid-ledger.dashboard';
const DASHBOARD_CACHE_TTL_MS = 60 * 60 * 1000;
const REFRESH_LOCK_MS = 10 * 1000;

interface CacheEnvelope<T> {
	data: T;
	expiresAt: string;
	fetchedAt: string;
}

function readCache<T>(storage: Storage, key: string) {
	const raw = storage.getItem(key);
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			typeof parsed.expiresAt !== 'string' ||
			typeof parsed.fetchedAt !== 'string' ||
			!('data' in parsed)
		) {
			return null;
		}

		if (Date.parse(parsed.expiresAt) <= Date.now()) {
			storage.removeItem(key);
			return null;
		}

		return parsed as CacheEnvelope<T>;
	} catch {
		return null;
	}
}

function writeCache<T>(storage: Storage, key: string, data: T, ttlMs = DASHBOARD_CACHE_TTL_MS) {
	const now = new Date();
	const envelope: CacheEnvelope<T> = {
		data,
		fetchedAt: now.toISOString(),
		expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
	};

	storage.setItem(key, JSON.stringify(envelope));
	return envelope;
}

function summaryKey(organization: string) {
	return `${DASHBOARD_CACHE_PREFIX}:${organization}:summary`;
}

function charactersKey(organization: string) {
	return `${DASHBOARD_CACHE_PREFIX}:${organization}:characters`;
}

function characterSummariesKey(organization: string, characterIds: number[]) {
	return `${DASHBOARD_CACHE_PREFIX}:${organization}:summaries:${characterIds.slice().sort((a, b) => a - b).join(',')}`;
}

function characterDetailKey(organization: string, characterId: number) {
	return `${DASHBOARD_CACHE_PREFIX}:${organization}:detail:${characterId}`;
}

function refreshLockKey(organization: string) {
	return `${DASHBOARD_CACHE_PREFIX}:${organization}:refresh-lock`;
}

export function readDashboardSummaryCache(storage: Storage, organization: string) {
	return readCache<OrganizationLedgerDashboardSummaryResponse>(storage, summaryKey(organization));
}

export function writeDashboardSummaryCache(
	storage: Storage,
	organization: string,
	data: OrganizationLedgerDashboardSummaryResponse,
) {
	return writeCache(storage, summaryKey(organization), data);
}

export function readDashboardCharactersCache(storage: Storage, organization: string) {
	return readCache<OrganizationCharacter[]>(storage, charactersKey(organization));
}

export function writeDashboardCharactersCache(
	storage: Storage,
	organization: string,
	data: OrganizationCharacter[],
) {
	return writeCache(storage, charactersKey(organization), data);
}

export function readDashboardCharacterSummariesCache(
	storage: Storage,
	organization: string,
	characterIds: number[],
) {
	return readCache<CharacterLedgerDashboardSummaryItem[]>(
		storage,
		characterSummariesKey(organization, characterIds),
	);
}

export function writeDashboardCharacterSummariesCache(
	storage: Storage,
	organization: string,
	characterIds: number[],
	data: CharacterLedgerDashboardSummaryItem[],
) {
	return writeCache(storage, characterSummariesKey(organization, characterIds), data);
}

export function readDashboardCharacterDetailCache(
	storage: Storage,
	organization: string,
	characterId: number,
) {
	return readCache<CharacterLedgerDashboardDetailResponse>(storage, characterDetailKey(organization, characterId));
}

export function writeDashboardCharacterDetailCache(
	storage: Storage,
	organization: string,
	characterId: number,
	data: CharacterLedgerDashboardDetailResponse,
) {
	return writeCache(storage, characterDetailKey(organization, characterId), data);
}

export function readDashboardRefreshLock(storage: Storage, organization: string) {
	const raw = storage.getItem(refreshLockKey(organization));
	if (!raw) {
		return null;
	}

	const value = Date.parse(raw);
	if (!Number.isFinite(value) || value <= Date.now()) {
		storage.removeItem(refreshLockKey(organization));
		return null;
	}

	return value;
}

export function writeDashboardRefreshLock(storage: Storage, organization: string, durationMs = REFRESH_LOCK_MS) {
	const expiresAt = new Date(Date.now() + durationMs).toISOString();
	storage.setItem(refreshLockKey(organization), expiresAt);
	return expiresAt;
}

export function clearDashboardOrganizationCache(storage: Storage, organization: string) {
	const prefix = `${DASHBOARD_CACHE_PREFIX}:${organization}:`;
	const keysToRemove: string[] = [];

	for (let index = 0; index < storage.length; index += 1) {
		const key = storage.key(index);
		if (key?.startsWith(prefix)) {
			keysToRemove.push(key);
		}
	}

	keysToRemove.forEach((key) => storage.removeItem(key));
}
