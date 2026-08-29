import { getApiAdapter } from '../adapters/api.adapter.ts';

export interface OrganizationManageGameSummary {
	gameId: number;
	name: string;
	slug: string;
	primary: boolean;
}

export interface OrganizationManageSummary {
	id: number;
	name: string;
	description: string | null;
	iconUrl: string | null;
	vanity: string | null;
	stats: {
		memberCount: number;
		characterCount: number;
	};
	games: OrganizationManageGameSummary[];
}

export interface OrganizationManageCharacter {
	id: number;
	name: string;
	description: string | null;
	slug: string | null;
	vanity: string | null;
	gameId: number | null;
	isClaimed: boolean;
	claimedBy: {
		userId: number;
		displayName: string | null;
		vanity: string | null;
	} | null;
}

export interface OrganizationManageMember {
	memberId: number;
	userId: number;
	displayName: string | null;
	vanity: string | null;
	role: 'owner' | 'admin' | 'member';
	status: 'pending' | 'active';
}

export interface OrganizationManageCacheSnapshot {
	organization: OrganizationManageSummary;
	characters: OrganizationManageCharacter[];
	members: OrganizationManageMember[];
	fetchedAt: string;
	expiresAt: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_KEY_PREFIX = 'raid-ledger.org-manage-cache';

function toNullableString(value: unknown) {
	return typeof value === 'string' ? value : null;
}

function createCacheKey(orgVanity: string) {
	return `${CACHE_KEY_PREFIX}:${orgVanity}`;
}

function readCache(orgVanity: string) {
	if (typeof window === 'undefined') {
		return null;
	}

	const raw = window.sessionStorage.getItem(createCacheKey(orgVanity));
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as OrganizationManageCacheSnapshot;
		if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
			window.sessionStorage.removeItem(createCacheKey(orgVanity));
			return null;
		}

		return parsed;
	} catch {
		return null;
	}
}

function writeCache(
	orgVanity: string,
	snapshot: Omit<OrganizationManageCacheSnapshot, 'fetchedAt' | 'expiresAt'>,
) {
	const fetchedAt = new Date().toISOString();
	const nextSnapshot: OrganizationManageCacheSnapshot = {
		...snapshot,
		fetchedAt,
		expiresAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
	};

	if (typeof window !== 'undefined') {
		window.sessionStorage.setItem(createCacheKey(orgVanity), JSON.stringify(nextSnapshot));
	}

	return nextSnapshot;
}

export function clearOrganizationManageCache(orgVanity: string) {
	if (typeof window === 'undefined') {
		return;
	}

	window.sessionStorage.removeItem(createCacheKey(orgVanity));
}

async function fetchSnapshot(orgVanity: string) {
	const [organizationResponse, charactersResponse, rawCharactersResponse, membersResponse] = await Promise.all([
		getApiAdapter().getOrganization(orgVanity),
		getApiAdapter().listOrganizationManagementCharacters(orgVanity),
		getApiAdapter().listOrganizationCharacters(orgVanity),
		getApiAdapter().listOrganizationActiveMembers(orgVanity),
	]);
	const rawCharacterGameIds = new Map(
		rawCharactersResponse.characters.map((character) => [
			character.id,
			typeof character.gameId === 'number' ? character.gameId : null,
		]),
	);

	return writeCache(orgVanity, {
		organization: {
			id: organizationResponse.organization.id,
			name: organizationResponse.organization.name,
			description: toNullableString(organizationResponse.organization.description),
			iconUrl: toNullableString(organizationResponse.organization.iconUrl),
			vanity: toNullableString(organizationResponse.organization.vanity),
			stats: {
				memberCount: organizationResponse.organization.activeMemberCount,
				characterCount: organizationResponse.organization.activeCharacterCount,
			},
			games: organizationResponse.organization.games.map((game) => ({
				gameId: game.gameId,
				name: game.gameName,
				slug: game.gameSlug,
				primary: game.isPrimary,
			})),
		},
		characters: charactersResponse.characters.map((character) => ({
			id: character.id,
			name: character.displayName,
			description: toNullableString(character.description),
			slug: toNullableString(character.slug),
			vanity: toNullableString(character.vanity),
			gameId: rawCharacterGameIds.get(character.id) ?? null,
			isClaimed: character.isClaimed,
			claimedBy:
				character.claimedBy && typeof character.claimedBy.userId === 'number'
					? {
							userId: character.claimedBy.userId,
							displayName: toNullableString(character.claimedBy.displayName),
							vanity: toNullableString(character.claimedBy.vanity),
						}
					: null,
		})),
		members: membersResponse.members.map((member) => ({
			memberId: member.memberId,
			userId: member.userId,
			displayName: toNullableString(member.displayName),
			vanity: toNullableString(member.vanity),
			role: member.role,
			status: 'active',
		})),
	});
}

export async function ensureOrganizationManageCache(orgVanity: string) {
	return readCache(orgVanity) ?? fetchSnapshot(orgVanity);
}

export async function refreshOrganizationManageCache(orgVanity: string) {
	clearOrganizationManageCache(orgVanity);
	return fetchSnapshot(orgVanity);
}
