import test from 'node:test';
import assert from 'node:assert/strict';

import { OpenApiClient } from '../../src/libs/api/openapi/generated/client.ts';

test('OpenApiClient binds the global fetch implementation before invoking it', async () => {
	const originalFetch = globalThis.fetch;
	const originalResponse = globalThis.Response;

	const observedThisValues: unknown[] = [];
	const observedUrls: string[] = [];

	try {
		async function fetchStub(this: typeof globalThis, input: RequestInfo | URL) {
			observedThisValues.push(this);
			observedUrls.push(String(input));
			return new originalResponse(JSON.stringify({ status: 'ok' }), {
				status: 200,
				headers: {
					'content-type': 'application/json',
				},
			});
		}

		globalThis.fetch = fetchStub as typeof fetch;

		const client = new OpenApiClient({
			baseUrl: 'https://example.com',
		});

		const response = await client.getHealthz();

		assert.deepEqual(response, { status: 'ok' });
		assert.equal(observedUrls[0], 'https://example.com/healthz');
		assert.equal(observedThisValues[0], globalThis);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
