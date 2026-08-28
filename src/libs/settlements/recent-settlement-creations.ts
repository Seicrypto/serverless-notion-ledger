import type { CreateLedgerSettlementRequest } from '../api/openapi/generated/schema';

const STORAGE_KEY = 'recentSettlementCreation';
const MAX_ENTRIES = 12;

export interface RecentSettlementCreationEntry {
	organization: string;
	createdAt: string;
	payload: CreateLedgerSettlementRequest;
}

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function loadRecentSettlementCreations(storage: StorageLike) {
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) {
		return [] as RecentSettlementCreationEntry[];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((entry): entry is RecentSettlementCreationEntry => {
			if (!entry || typeof entry !== 'object') {
				return false;
			}

			const candidate = entry as Partial<RecentSettlementCreationEntry>;
			return (
				typeof candidate.organization === 'string' &&
				typeof candidate.createdAt === 'string' &&
				candidate.payload !== null &&
				typeof candidate.payload === 'object'
			);
		});
	} catch {
		return [];
	}
}

export function recordRecentSettlementCreation(
	storage: StorageLike,
	organization: string,
	payload: CreateLedgerSettlementRequest,
	createdAt = new Date().toISOString(),
) {
	const existing = loadRecentSettlementCreations(storage);
	const nextEntries = [
		{ organization, createdAt, payload },
		...existing.filter((entry) => entry.organization !== organization || entry.payload.title !== payload.title),
	].slice(0, MAX_ENTRIES);

	storage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
	return nextEntries;
}

export function getLatestSettlementCreationForOrganization(
	entries: RecentSettlementCreationEntry[],
	organization: string,
) {
	return entries.find((entry) => entry.organization === organization) ?? null;
}
