// @ts-nocheck
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { Writable } from 'node:stream';
import { HorizonWebClient } from './horizon-web-client.ts';

describe('horizon-web-client', () => {
	const loginEndpoint = '/otcs/llisapi.dll?func=LL.Login';

	const clientWithMockGet = (returnFileHeader) => {
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
				let headers = {};
				if (returnFileHeader) {
					headers['content-disposition'] = 'attachment; filename="my-file.pdf"';
				}
				// Authed request - should return 200
				response = newMockResponse(200, headers);
			}

			setImmediate(() => cb(response));

			return {
				on() {},
				destroy() {}
			};
		});

		const client = new HorizonWebClient(
			{
				baseUrl: 'http://localhost',
				username: 'username',
				password: 'password'
			},
			mockGet
		);
		return { client, mockGet };
	};
	describe('get', () => {
		it('should complete login flow for get requests', async () => {
			const { client, mockGet } = clientWithMockGet();
			await client.get('/my-url');

			// four calls expected
			assert.strictEqual(mockGet.mock.callCount(), 4);
			// NTLM type-1 req
			assert.strictEqual(mockGet.mock.calls[0].arguments[0], 'http://localhost/my-url');
			assert.match(mockGet.mock.calls[0].arguments[1]?.headers?.Authorization, /NTLM /);
			// NTLM type-3 req
			assert.strictEqual(mockGet.mock.calls[1].arguments[0], 'http://localhost/my-url');
			assert.match(mockGet.mock.calls[0].arguments[1]?.headers?.Authorization, /NTLM /);
			// login req
			assert.strictEqual(mockGet.mock.calls[2].arguments[0], 'http://localhost' + loginEndpoint);
			// auth'd get req
			assert.strictEqual(mockGet.mock.calls[3].arguments[0], 'http://localhost/my-url');
			assert.match(mockGet.mock.calls[3].arguments[1]?.headers?.Cookie, /LLCookie=abc123/);
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
	describe('buildCustomDnsEntryLookup', () => {
		it('should return ip entries based on the map provided', () => {
			const lookup = HorizonWebClient.buildCustomDnsEntryLookup({
				'example.com': '192.168.0.1'
			});
			const callback = mock.fn();
			lookup('example.com', {}, callback);
			assert.strictEqual(callback.mock.callCount(), 1);
			assert.deepStrictEqual(callback.mock.calls[0].arguments, [null, '192.168.0.1', 4]);
		});
		it('should return an array if all option passed', () => {
			const lookup = HorizonWebClient.buildCustomDnsEntryLookup({
				'example.com': '192.168.0.1'
			});
			const callback = mock.fn();
			lookup('example.com', { all: true }, callback);
			assert.strictEqual(callback.mock.callCount(), 1);
			assert.deepStrictEqual(callback.mock.calls[0].arguments, [null, [{ address: '192.168.0.1', family: 4 }], 4]);
		});
	});
});
