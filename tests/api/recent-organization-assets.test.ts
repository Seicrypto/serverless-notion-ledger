import test from 'node:test';
import assert from 'node:assert/strict';

import {
	getRecentOrganizationAssetsByOrganization,
	parseRecentOrganizationAssets,
	pruneRecentOrganizationAssets,
	recordRecentOrganizationAsset,
} from '../../src/libs/assets/recent-organization-assets.ts';

test('pruneRecentOrganizationAssets keeps recent unique assets', () => {
	const now = Date.parse('2026-08-29T12:00:00.000Z');
	const entries = pruneRecentOrganizationAssets(
		[
			{ organization: 'demo', assetId: 10, name: 'Sword', assetType: 'item', createdAt: '2026-08-29T11:00:00.000Z' },
			{ organization: 'demo', assetId: 10, name: 'Sword', assetType: 'item', createdAt: '2026-08-28T11:00:00.000Z' },
			{ organization: 'demo', assetId: 11, name: 'Shield', assetType: 'item', createdAt: '2026-08-29T10:00:00.000Z' },
			{ organization: 'demo', assetId: 12, name: 'Old', assetType: 'item', createdAt: '2026-08-10T10:00:00.000Z' },
		],
		now,
	);

	assert.deepEqual(entries.map((entry) => entry.assetId), [10, 11]);
});

test('recordRecentOrganizationAsset persists and filters by organization', () => {
	const storage = new Map<string, string>();
	const storageLike = {
		getItem(key: string) {
			return storage.get(key) ?? null;
		},
		setItem(key: string, value: string) {
			storage.set(key, value);
		},
	};

	recordRecentOrganizationAsset(storageLike, {
		organization: 'demo',
		assetId: 21,
		name: 'Gem',
		assetType: 'item',
		createdAt: '2026-08-29T12:00:00.000Z',
	});
	recordRecentOrganizationAsset(storageLike, {
		organization: 'other',
		assetId: 22,
		name: 'Potion',
		assetType: 'item',
		createdAt: '2026-08-29T12:05:00.000Z',
	});

	const parsed = parseRecentOrganizationAssets(storage.get('recentOrganizationAssets') ?? null);
	assert.equal(getRecentOrganizationAssetsByOrganization(parsed, 'demo')[0]?.assetId, 21);
	assert.equal(getRecentOrganizationAssetsByOrganization(parsed, 'other')[0]?.assetId, 22);
});
