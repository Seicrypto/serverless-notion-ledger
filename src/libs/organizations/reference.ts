import type { OrganizationCardResponse } from '../api/organizations/organization-card.ts';

function normalizeOrganizationValue(value: string | null | undefined) {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getOrganizationReference(organization: Pick<OrganizationCardResponse, 'vanity' | 'id'>) {
	return normalizeOrganizationValue(organization.vanity) ?? String(organization.id);
}

export function readOrganizationQueryFromLocation() {
	if (typeof window === 'undefined') {
		return null;
	}

	const params = new URLSearchParams(window.location.search);
	return normalizeOrganizationValue(params.get('orgVanity') ?? params.get('org'));
}

export function resolveOrganizationQuery(initialOrganization: string | null | undefined) {
	return readOrganizationQueryFromLocation() ?? normalizeOrganizationValue(initialOrganization) ?? null;
}
