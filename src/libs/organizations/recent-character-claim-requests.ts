export interface RecentCharacterClaimRequestEntry {
	organization: string;
	characterId: number;
	characterName: string;
	gameId: number | null;
	requestedByUserId: number;
	targetUserId: number;
	targetMemberId: number | null;
	status: 'pending_confirmation' | 'accepted' | 'declined' | 'cancelled';
	createdAt: string;
	updatedAt: string;
}

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'raid-ledger.recent-character-claim-requests';
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const LIMIT = 100;

export function pruneRecentCharacterClaimRequests(
	entries: RecentCharacterClaimRequestEntry[],
	now = Date.now(),
	windowMs = WINDOW_MS,
) {
	const cutoff = now - windowMs;

	return entries
		.filter((entry) => {
			const updatedAt = Date.parse(entry.updatedAt);
			return Number.isFinite(updatedAt) && updatedAt >= cutoff && updatedAt <= now;
		})
		.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
		.filter(
			(entry, index, array) =>
				array.findIndex(
					(candidate) =>
						candidate.organization === entry.organization && candidate.characterId === entry.characterId,
				) === index,
		)
		.slice(0, LIMIT);
}

export function parseRecentCharacterClaimRequests(raw: string | null) {
	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return pruneRecentCharacterClaimRequests(
			parsed.filter((entry): entry is RecentCharacterClaimRequestEntry => {
				if (!entry || typeof entry !== 'object') {
					return false;
				}

				const candidate = entry as Partial<RecentCharacterClaimRequestEntry>;
				return (
					typeof candidate.organization === 'string' &&
					typeof candidate.characterId === 'number' &&
					typeof candidate.characterName === 'string' &&
					typeof candidate.requestedByUserId === 'number' &&
					typeof candidate.targetUserId === 'number' &&
					typeof candidate.status === 'string' &&
					typeof candidate.createdAt === 'string' &&
					typeof candidate.updatedAt === 'string'
				);
			}),
		);
	} catch {
		return [];
	}
}

export function loadRecentCharacterClaimRequests(storage: StorageLike) {
	return parseRecentCharacterClaimRequests(storage.getItem(STORAGE_KEY));
}

export function saveRecentCharacterClaimRequests(storage: StorageLike, entries: RecentCharacterClaimRequestEntry[]) {
	storage.setItem(STORAGE_KEY, JSON.stringify(pruneRecentCharacterClaimRequests(entries)));
}

export function recordRecentCharacterClaimRequest(
	storage: StorageLike,
	entry: RecentCharacterClaimRequestEntry,
) {
	const existing = loadRecentCharacterClaimRequests(storage);
	const nextEntries = pruneRecentCharacterClaimRequests([entry, ...existing], Date.parse(entry.updatedAt));
	saveRecentCharacterClaimRequests(storage, nextEntries);
	return nextEntries;
}

export function clearRecentCharacterClaimRequest(
	storage: StorageLike,
	organization: string,
	characterId: number,
) {
	const existing = loadRecentCharacterClaimRequests(storage);
	const nextEntries = existing.filter(
		(entry) => !(entry.organization === organization && entry.characterId === characterId),
	);
	saveRecentCharacterClaimRequests(storage, nextEntries);
	return nextEntries;
}

export function getRecentCharacterClaimRequestsByOrganization(
	entries: RecentCharacterClaimRequestEntry[],
	organization: string,
) {
	return entries.filter((entry) => entry.organization === organization);
}
