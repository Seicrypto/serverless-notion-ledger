export interface CachedOrganizationMembershipRecord {
	organization: string;
	userId: number;
	memberId: number;
	status: 'pending' | 'active' | 'left' | 'removed';
	updatedAt: string;
}

const STORAGE_KEY = 'raid-ledger.organization-membership-records';

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeOrganizationReference(organization: string) {
	return organization.trim();
}

function readAll(storage: Storage) {
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) {
		return [] as CachedOrganizationMembershipRecord[];
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.filter(
			(entry): entry is CachedOrganizationMembershipRecord =>
				isObject(entry) &&
				typeof entry.organization === 'string' &&
				typeof entry.userId === 'number' &&
				typeof entry.memberId === 'number' &&
				(entry.status === 'pending' ||
					entry.status === 'active' ||
					entry.status === 'left' ||
					entry.status === 'removed') &&
				typeof entry.updatedAt === 'string',
		);
	} catch {
		return [];
	}
}

function writeAll(storage: Storage, records: CachedOrganizationMembershipRecord[]) {
	storage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function readCachedOrganizationMembershipRecord(
	storage: Storage,
	organization: string,
	userId: number,
) {
	const normalizedOrganization = normalizeOrganizationReference(organization);
	return (
		readAll(storage).find(
			(entry) => entry.organization === normalizedOrganization && entry.userId === userId,
		) ?? null
	);
}

export function writeCachedOrganizationMembershipRecord(
	storage: Storage,
	record: Omit<CachedOrganizationMembershipRecord, 'updatedAt'>,
) {
	const normalizedOrganization = normalizeOrganizationReference(record.organization);
	const records = readAll(storage).filter(
		(entry) => !(entry.organization === normalizedOrganization && entry.userId === record.userId),
	);
	const nextRecord: CachedOrganizationMembershipRecord = {
		...record,
		organization: normalizedOrganization,
		updatedAt: new Date().toISOString(),
	};

	records.unshift(nextRecord);
	writeAll(storage, records);
	return nextRecord;
}

export function clearCachedOrganizationMembershipRecord(
	storage: Storage,
	organization: string,
	userId: number,
) {
	const normalizedOrganization = normalizeOrganizationReference(organization);
	const nextRecords = readAll(storage).filter(
		(entry) => !(entry.organization === normalizedOrganization && entry.userId === userId),
	);
	writeAll(storage, nextRecords);
}
