import test from 'node:test';
import assert from 'node:assert/strict';

import {
	appendRecentEventCreations,
	getOrganizationRecentEventCreations,
	parseRecentEventCreations,
	pruneRecentEventCreations,
	RECENT_EVENT_CREATION_WINDOW_MS,
} from '../../src/libs/events/recent-event-creations.ts';

test('pruneRecentEventCreations keeps only entries from the last 12 hours', () => {
	const now = Date.parse('2026-08-27T12:00:00.000Z');
	const entries = [
		{
			id: 'demo:new',
			organization: 'demo-guild',
			createdAt: '2026-08-27T11:00:00.000Z',
			payload: { title: 'Fresh', occurredAt: '2026-08-27T11:00:00.000Z' },
		},
		{
			id: 'demo:old',
			organization: 'demo-guild',
			createdAt: '2026-08-26T22:59:59.000Z',
			payload: { title: 'Expired', occurredAt: '2026-08-26T22:59:59.000Z' },
		},
	];

	const result = pruneRecentEventCreations(entries, now, RECENT_EVENT_CREATION_WINDOW_MS);

	assert.equal(result.length, 1);
	assert.equal(result[0]?.id, 'demo:new');
});

test('appendRecentEventCreations prepends new payloads and filters by organization', () => {
	const existing = [
		{
			id: 'other:1',
			organization: 'other-guild',
			createdAt: '2026-08-27T09:00:00.000Z',
			payload: { title: 'Other Guild Event', occurredAt: '2026-08-27T09:00:00.000Z' },
		},
	];

	const allEntries = appendRecentEventCreations(
		existing,
		'demo-guild',
		[
			{ title: 'Raid Chest A', occurredAt: '2026-08-27T10:00:00.000Z', assetId: 101 },
			{ title: 'Raid Chest B', occurredAt: '2026-08-27T10:00:00.000Z', assetId: 102 },
		],
		'2026-08-27T10:05:00.000Z',
	);

	const demoEntries = getOrganizationRecentEventCreations(allEntries, 'demo-guild');

	assert.equal(demoEntries.length, 2);
	assert.equal(demoEntries[0]?.payload.assetId, 101);
	assert.equal(demoEntries[1]?.payload.assetId, 102);
});

test('parseRecentEventCreations ignores invalid payloads', () => {
	const freshCreatedAt = new Date().toISOString();
	const result = parseRecentEventCreations(
		JSON.stringify([
			{
				id: 'demo:1',
				organization: 'demo-guild',
				createdAt: freshCreatedAt,
				payload: { title: 'Valid', occurredAt: freshCreatedAt },
			},
			{
				id: 2,
				organization: 'demo-guild',
				createdAt: freshCreatedAt,
				payload: { title: 'Broken', occurredAt: freshCreatedAt },
			},
		]),
	);

	assert.equal(result.length, 1);
	assert.equal(result[0]?.payload.title, 'Valid');
});
