import type { Asset, AssetDetail, AssetSearchItem } from '../api/openapi/generated/schema';

export interface OrganizationAssetRecord {
	assetId: number;
	name: string;
	assetType: Asset['assetType'];
	gameId?: number;
	iconUrl?: string | null;
}

export interface OrganizationAssetOption {
	value: string;
	label: string;
	iconUrl?: string | null;
}

type AssetLike = Pick<Asset, 'id' | 'name' | 'assetType' | 'gameId' | 'iconUrl'>
	| Pick<AssetSearchItem, 'id' | 'name' | 'assetType' | 'gameId' | 'iconUrl'>
	| Pick<AssetDetail, 'id' | 'name' | 'assetType' | 'gameId' | 'iconUrl'>;

export function toOrganizationAssetRecord(asset: AssetLike): OrganizationAssetRecord {
	return {
		assetId: asset.id,
		name: asset.name,
		assetType: asset.assetType,
		gameId: typeof asset.gameId === 'number' ? asset.gameId : undefined,
		iconUrl: typeof asset.iconUrl === 'string' ? asset.iconUrl : null,
	};
}

export function toOrganizationAssetOption(asset: AssetLike): OrganizationAssetOption {
	return {
		value: String(asset.id),
		label: asset.name,
		iconUrl: typeof asset.iconUrl === 'string' ? asset.iconUrl : null,
	};
}
