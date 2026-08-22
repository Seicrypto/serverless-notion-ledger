import test from 'node:test';
import assert from 'node:assert/strict';

import { OpenApiClient } from '../../src/libs/api/openapi/generated/client.ts';

test('OpenApiClient binds the global fetch implementation before invoking it', async () => {
	const originalFetch = globalThis.fetch;
	const originalResponse = globalThis.Response;

	const observedThisValues: unknown[] = [];

	try {
		const expectedContext = {
			name: 'fetch-context',
			async fetch() {
				observedThisValues.push(this);
				return new originalResponse(JSON.stringify({ status: 'ok' }), {
					status: 200,
					headers: {
						'content-type': 'application/json',
					},
				});
			},
		};

		globalThis.fetch = expectedContext.fetch as typeof fetch;

		const client = new OpenApiClient({
			baseUrl: 'https://example.com',
		});

		const response = await client.getHealthz();

		assert.deepEqual(response, { status: 'ok' });
		assert.equal(observedThisValues[0], expectedContext);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
