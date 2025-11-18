import { describe, it, type TestContext } from 'node:test';
import { TestServer } from '../testing/test-server.ts';
import type http from 'http';
import { fetchWithTimeout, TimeoutError } from './fetch.ts';
import assert from 'node:assert/strict';
import { sleep } from './sleep.ts';

describe('fetch', () => {
	describe('fetchWithTimeout', () => {
		async function newTestServer(ctx: TestContext, handler: http.RequestListener): Promise<TestServer> {
			const server = new TestServer(handler);
			await server.start();
			ctx.after(async () => await server.stop());
			return server;
		}

		it('should succeed if a response is received before timeout', async (ctx) => {
			const server = await newTestServer(ctx, (req, res) => {
				res.statusCode = 200;
				res.end('Hello, world!');
			});
			const res = await fetchWithTimeout(`http://localhost:${server.port}/anything`, { timeoutMs: 100 });
			assert.ok(res.ok);
		});

		it('should throw if a response is not received before timeout', async (ctx) => {
			const server = await newTestServer(ctx, async (req, res) => {
				await sleep(500);
				res.statusCode = 200;
				res.end('Hello, world!');
			});
			await assert.rejects(
				() => fetchWithTimeout(`http://localhost:${server.port}/anything`, { timeoutMs: 100 }),
				(thrown) => {
					assert.ok(thrown instanceof TimeoutError);
					assert.strictEqual(thrown.timeoutMs, 100);
					assert.match(thrown.message, /timed out after 100ms/);
					return true;
				}
			);
		});
	});
});
