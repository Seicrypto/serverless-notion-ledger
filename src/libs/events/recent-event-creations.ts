import type { CreateLedgerEventRequest } from '../api/openapi/generated/schema';

export const RECENT_EVENT_CREATIONS_STORAGE_KEY = 'recentlyEventCreation';
export const RECENT_EVENT_CREATION_WINDOW_MS = 12 * 60 * 60 * 1000;
export const RECENT_EVENT_CREATION_LIMIT = 24;

export interface RecentEventCreationEntry {
	id: string;
	organization: string;
	createdAt: string;
	payload: CreateLedgerEventRequest;
}

interface StorageLike {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export function pruneRecentEventCreations(
	entries: RecentEventCreationEntry[],
	now = Date.now(),
	windowMs = RECENT_EVENT_CREATION_WINDOW_MS,
) {
	const cutoff = now - windowMs;

	return entries
		.filter((entry) => {
			const createdAt = Date.parse(entry.createdAt);

			if (!Number.isFinite(createdAt)) {
				return false;
			}

			return createdAt >= cutoff && createdAt <= now;
		})
		.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
		.slice(0, RECENT_EVENT_CREATION_LIMIT);
}

export function appendRecentEventCreations(
	existing: RecentEventCreationEntry[],
	organization: string,
	payloads: CreateLedgerEventRequest[],
	createdAt = new Date().toISOString(),
) {
	const nextEntries = payloads.map((payload, index) => ({
		id: `${organization}:${createdAt}:${index}:${payload.title}`,
		organization,
		createdAt,
		payload,
	}));

	return pruneRecentEventCreations([...nextEntries, ...existing], Date.parse(createdAt));
}

export function parseRecentEventCreations(raw: string | null) {
	if (!raw) {
		return [];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return pruneRecentEventCreations(
			parsed.filter((entry): entry is RecentEventCreationEntry => {
				if (!entry || typeof entry !== 'object') {
					return false;
				}

				const candidate = entry as Partial<RecentEventCreationEntry>;
				return (
					typeof candidate.id === 'string' &&
					typeof candidate.organization === 'string' &&
					typeof candidate.createdAt === 'string' &&
					candidate.payload !== null &&
					typeof candidate.payload === 'object'
				);
			}),
		);
	} catch {
		return [];
	}
}

export function loadRecentEventCreations(storage: StorageLike) {
	return parseRecentEventCreations(storage.getItem(RECENT_EVENT_CREATIONS_STORAGE_KEY));
}

export function saveRecentEventCreations(storage: StorageLike, entries: RecentEventCreationEntry[]) {
	storage.setItem(RECENT_EVENT_CREATIONS_STORAGE_KEY, JSON.stringify(pruneRecentEventCreations(entries)));
}

export function recordRecentEventCreations(
	storage: StorageLike,
	organization: string,
	payloads: CreateLedgerEventRequest[],
	createdAt = new Date().toISOString(),
) {
	const existing = loadRecentEventCreations(storage);
	const nextEntries = appendRecentEventCreations(existing, organization, payloads, createdAt);
	saveRecentEventCreations(storage, nextEntries);
	return nextEntries;
}

export function getOrganizationRecentEventCreations(
	entries: RecentEventCreationEntry[],
	organization: string,
) {
	return entries.filter((entry) => entry.organization === organization);
}
