export const RECENT_CLAIM_CREATIONS_STORAGE_KEY = 'recentClaimCreation';
const MAX_ENTRIES = 12;

export interface RecentClaimCreationEntry {
	organization: string;
	createdAt: string;
}

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function loadRecentClaimCreations(storage: StorageLike) {
	const raw = storage.getItem(RECENT_CLAIM_CREATIONS_STORAGE_KEY);
	if (!raw) {
		return [] as RecentClaimCreationEntry[];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter((entry): entry is RecentClaimCreationEntry => {
			if (!entry || typeof entry !== 'object') {
				return false;
			}

			const candidate = entry as Partial<RecentClaimCreationEntry>;
			return typeof candidate.organization === 'string' && typeof candidate.createdAt === 'string';
		});
	} catch {
		return [];
	}
}

export function recordRecentClaimCreation(
	storage: StorageLike,
	organization: string,
	createdAt = new Date().toISOString(),
) {
	const existing = loadRecentClaimCreations(storage);
	const nextEntries = [
		{ organization, createdAt },
		...existing.filter((entry) => entry.organization !== organization),
	].slice(0, MAX_ENTRIES);

	storage.setItem(RECENT_CLAIM_CREATIONS_STORAGE_KEY, JSON.stringify(nextEntries));
	return nextEntries;
}
