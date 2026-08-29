export interface GameVisualInfo {
	resolvedIconUrl?: string | null;
	iconUrl?: string | null;
	officialSiteUrl?: string | null;
}

function toTrimmedString(value: string | null | undefined) {
	if (typeof value !== 'string') {
		return null;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function getOfficialSiteFaviconUrl(officialSiteUrl: string | null | undefined) {
	const normalized = toTrimmedString(officialSiteUrl);
	if (!normalized) {
		return null;
	}

	try {
		const url = new URL(normalized);
		return `${url.origin}/favicon.ico`;
	} catch {
		return null;
	}
}

export function getGameIconCandidates(game: GameVisualInfo) {
	const candidates = [
		toTrimmedString(game.resolvedIconUrl),
		toTrimmedString(game.iconUrl),
		getOfficialSiteFaviconUrl(game.officialSiteUrl),
	];

	return Array.from(new Set(candidates.filter((candidate): candidate is string => Boolean(candidate))));
}
