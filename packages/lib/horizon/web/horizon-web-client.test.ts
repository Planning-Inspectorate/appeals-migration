// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Writable } from 'node:stream';
import { HorizonWebClient } from './horizon-web-client.ts';

describe('horizon-web-client', () => {
	const loginEndpoint = '/otcs/llisapi.dll?func=LL.Login';

	const clientWithMockGet = (returnFileHeader, return404First) => {
		let returned404 = false;
		const newMockResponse = (status, headers = {}) => {
			return {
				statusCode: status,
				headers,
				resume() {
					return this;
				},
				on(event, handler) {
					if (event === 'end') setImmediate(handler);
					return this;
				},
				pipe() {}
			};
		};
		let ntlmCallCount = 0;
		const mockGet = mock.fn((url, options, cb) => {
			let response = newMockResponse(401);

			const auth = options.headers?.Authorization;
			const cookies = options.headers?.Cookie;
			// mock the NTLM auth and login redirect flows
			if (auth && auth.startsWith('NTLM ')) {
				if (ntlmCallCount === 0) {
					// assume type1 request, return type-2 in header
					response = newMockResponse(401, {
						'www-authenticate':
							'NTLM TlRMTVNTUAACAAAADAAMADgAAAAFgooCqDIQjFLW8e0AAAAAAAAAAJYAlgBEAAAABQLODgAAAA9EAE8ATQBBAEkATgACAAAA'
					});
				} else {
					// assume type3 request, return 302
					response = newMockResponse(302, { location: loginEndpoint });
				}

				ntlmCallCount++;
			} else if (url.endsWith(loginEndpoint)) {
				// login request, return cookies
				response = newMockResponse(302, {
					location: '/otcs/llisapi.dll',
					'set-cookie': ['LLCookie=abc123; Path=/']
				});
			} else if (cookies && cookies.includes('LLCookie=')) {
				ntlmCallCount = 0;
				let headers = {};
				if (returnFileHeader) {
					headers['content-disposition'] = 'attachment; filename="my-file.pdf"';
				}
				if (return404First && !returned404) {
					response = newMockResponse(401);
					returned404 = true;
				} else {
					// Authed request - should return 200
					response = newMockResponse(200, headers);
				}
			}

			setImmediate(() => cb(response));

			return {
				on() {},
				destroy() {}
			};
		});

		const client = new HorizonWebClient('http://localhost', 'username', 'password', mockGet);
		return { client, mockGet };
	};
	describe('get', () => {
		const verifyLoginFlow = (mockFn: typeof mock.fn, offset: number = 0) => {
			// NTLM type-1 req
			assert.strictEqual(mockFn.calls[offset * 4].arguments[0], 'http://localhost/my-url');
			assert.match(mockFn.calls[offset * 4].arguments[1]?.headers?.Authorization, /NTLM /);
			// NTLM type-3 req
			assert.strictEqual(mockFn.calls[1 + offset * 4].arguments[0], 'http://localhost/my-url');
			assert.match(mockFn.calls[1 + offset * 4].arguments[1]?.headers?.Authorization, /NTLM /);
			// login req
			assert.strictEqual(mockFn.calls[2 + offset * 4].arguments[0], 'http://localhost' + loginEndpoint);
			// auth'd get req
			assert.strictEqual(mockFn.calls[3 + offset * 4].arguments[0], 'http://localhost/my-url');
			assert.match(mockFn.calls[3 + offset * 4].arguments[1]?.headers?.Cookie, /LLCookie=abc123/);
		};
		it('should complete login flow for get requests', async () => {
			const { client, mockGet } = clientWithMockGet();
			await client.get('/my-url');

			// four calls expected
			assert.strictEqual(mockGet.mock.callCount(), 4);
			verifyLoginFlow(mockGet.mock, 0);
		});
		it('should re-attempt login flow if 401 is recieved', async () => {
			const { client, mockGet } = clientWithMockGet(false, true);
			await client.get('/my-url');

			// eight calls expected - two login attempts
			assert.strictEqual(mockGet.mock.callCount(), 8);
			for (let i = 0; i < 2; i++) {
				verifyLoginFlow(mockGet.mock, i);
			}
		});
	});
	describe('pipeDocument', () => {
		const writeToNowhere = () => false;
		it('should set base URL params', async () => {
			const { client, mockGet } = clientWithMockGet(true);
			await client.pipeDocument('doc-id-1', {
				createWriteStream: writeToNowhere
			});
			// four calls expected, for login
			assert.strictEqual(mockGet.mock.callCount(), 4);
			const url = URL.parse(mockGet.mock.calls[3].arguments[0]);
			assert.ok(url);
			const params = url.searchParams;
			assert.strictEqual(params.get('func'), 'll');
			assert.strictEqual(params.get('objId'), 'doc-id-1');
			assert.strictEqual(params.get('objAction'), 'download');
		});
		it('should set version param', async () => {
			const { client, mockGet } = clientWithMockGet(true);
			await client.pipeDocument('doc-id-1', {
				version: 5,
				createWriteStream: writeToNowhere
			});
			// four calls expected, for login
			assert.strictEqual(mockGet.mock.callCount(), 4);
			const url = URL.parse(mockGet.mock.calls[3].arguments[0]);
			assert.ok(url);
			const params = url.searchParams;
			assert.strictEqual(params.get('vernum'), '5');
		});
		it('should set rendition params', async () => {
			const { client, mockGet } = clientWithMockGet(true);
			await client.pipeDocument('doc-id-1', {
				version: 5,
				rendition: true,
				createWriteStream: writeToNowhere
			});
			// four calls expected, for login
			assert.strictEqual(mockGet.mock.callCount(), 4);
			const url = URL.parse(mockGet.mock.calls[3].arguments[0]);
			assert.ok(url);
			const params = url.searchParams;
			assert.strictEqual(params.get('vernum'), '5');
			assert.strictEqual(params.get('objAction'), 'DownloadRenditionAction');
			assert.strictEqual(params.get('vertype'), 'PDF');
		});
	});
	describe('filenameFromHeaders', () => {
		it('should return an error if != 200', () => {
			const res = {
				statusCode: 401
			};
			const err = HorizonWebClient.filenameFromHeaders(res);
			assert.ok(err instanceof Error);
			assert.strictEqual(err.message, 'download error 401');
		});
		it('should return an error if no content-disposition header', () => {
			const res = {
				statusCode: 200,
				headers: {}
			};
			const err = HorizonWebClient.filenameFromHeaders(res);
			assert.ok(err instanceof Error);
			assert.strictEqual(err.message, 'download error, file not found (no content-disposition header)');
		});
		it('should return an error if no content-disposition match', () => {
			const res = {
				statusCode: 200,
				headers: {
					'content-disposition': 'blah blah'
				}
			};
			const err = HorizonWebClient.filenameFromHeaders(res);
			assert.ok(err instanceof Error);
			assert.strictEqual(err.message, "download error, no filename in content-disposition header: 'blah blah'");
		});
		it('should return the filename if matched', () => {
			const res = {
				statusCode: 200,
				headers: {
					'content-disposition': 'attachment; filename="my-doc.pdf"'
				}
			};
			const name = HorizonWebClient.filenameFromHeaders(res);
			assert.ok(typeof name === 'string');
			assert.strictEqual(name, 'my-doc.pdf');
		});
	});
});
