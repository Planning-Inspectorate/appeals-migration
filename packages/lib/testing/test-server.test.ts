import http from 'http';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { describe, it } from 'node:test';
import { TestServer } from './test-server.ts';

// Basic express app for testing
function createApp(): http.RequestListener {
	function getBody(request: http.IncomingMessage): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			const bodyParts: Buffer[] = [];

			request.on('data', (chunk) => {
				bodyParts.push(chunk);
			});

			request.on('end', () => {
				resolve(Buffer.concat(bodyParts));
			});

			request.on('error', (error) => {
				reject(error);
			});
		});
	}

	return async (req, res) => {
		const url = new URL(`http://localhost${req.url}`);
		switch (url.pathname) {
			case '/hello':
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end('world');
				break;
			case '/echo':
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(await getBody(req));
				break;
			case '/set-cookie':
				res.writeHead(200, {
					'Content-Type': 'text/plain',
					'Set-Cookie': `foo=bar`
				});
				res.end('cookie set');
				break;
			case '/check-cookie':
				let foo = undefined;
				const cookieHeader = req.headers.cookie;
				if (cookieHeader) {
					const part = cookieHeader.split(';').find((cookie) => cookie.startsWith('foo='));
					if (part) {
						foo = part.split('=')[1];
					}
				}
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ foo }));
				break;
		}
	};
}

async function newTestServer(ctx: TestContext): Promise<TestServer> {
	const server = new TestServer(createApp());
	await server.start();
	ctx.after(async () => await server.stop());
	return server;
}

describe('TestServer', () => {
	it('should GET /hello', async (ctx) => {
		const server = await newTestServer(ctx);
		const res = await server.get('/hello');
		assert.equal(res.status, 200);
		const text = await res.text();
		assert.equal(text, 'world');
	});

	it('should POST /echo', async (ctx) => {
		const server = await newTestServer(ctx);
		const payload = { foo: 'bar' };
		const res = await server.post('/echo', payload);
		assert.equal(res.status, 200);
		const json = await res.json();
		assert.deepEqual(json, payload);
	});

	it('should handle cookies', async (ctx) => {
		const server = await newTestServer(ctx);
		server.rememberCookies = true;
		// Set cookie
		let res = await server.get('/set-cookie');
		assert.equal(res.status, 200);
		// Now check cookie is sent back
		res = await server.get('/check-cookie');
		assert.equal(res.status, 200);
		const json = await res.json();
		assert.equal(json.foo, 'bar');
	});
});
