import type { MyOrganization, OrganizationGameSummary } from '../openapi/generated/schema';

export interface OrganizationCardGame {
	name: string;
	iconUrl: string | null;
	primary: boolean;
}

export interface OrganizationCardMembership {
	role: 'owner' | 'admin' | 'member' | null;
	status: 'pending' | 'active' | null;
}

export interface OrganizationCardDisplayOptions {
	maxVisibleGames: number;
	maxVisibleTags: number;
	isSupportedOrg: boolean;
}

export interface OrganizationCardResponse {
	id: number;
	name: string;
	slug: string;
	description: string | null;
	iconUrl: string | null;
	membership: OrganizationCardMembership | null;
	stats: {
		memberCount: number;
		characterCount: number;
	};
	games: OrganizationCardGame[];
	tags: string[];
	display: OrganizationCardDisplayOptions;
}

export interface OrganizationCardCacheSnapshot {
	organizations: OrganizationCardResponse[];
	fetchedAt: string;
	expiresAt: string;
}

export const DEFAULT_ORGANIZATION_CARD_DISPLAY: OrganizationCardDisplayOptions = {
	maxVisibleGames: 1,
	maxVisibleTags: 2,
	isSupportedOrg: false,
};

export const ORGANIZATION_CARD_UI_LIMITS = {
	maxVisibleGames: 3,
	maxVisibleTags: 4,
} as const;

function toNullableString(value: unknown) {
	return typeof value === 'string' ? value : null;
}

function mapOrganizationGameSummary(game: OrganizationGameSummary): OrganizationCardGame {
	return {
		name: typeof game.displayName === 'string' && game.displayName.trim() ? game.displayName : game.gameName,
		iconUrl: null,
		primary: game.isPrimary,
	};
}

export function createOrganizationCardResponse(
	organization: Omit<OrganizationCardResponse, 'display'> & {
		display?: Partial<OrganizationCardDisplayOptions>;
	},
): OrganizationCardResponse {
	return {
		...organization,
		display: {
			...DEFAULT_ORGANIZATION_CARD_DISPLAY,
			...organization.display,
		},
	};
}

export function mapMyOrganizationToOrganizationCardResponse(
	organization: MyOrganization,
): OrganizationCardResponse {
	return createOrganizationCardResponse({
		id: organization.id,
		name: organization.name,
		slug: organization.slug,
		description: toNullableString(organization.description),
		iconUrl: toNullableString(organization.iconUrl),
		membership: {
			role: organization.membership.role,
			status: organization.membership.status,
		},
		stats: {
			memberCount: organization.activeMemberCount,
			characterCount: organization.activeCharacterCount,
		},
		games: organization.games.map(mapOrganizationGameSummary),
		tags: [],
	});
}
