import httpntlm from 'httpntlm';
import type { WriteStream } from 'node:fs';
import type http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import type { Readable } from 'node:stream';
import { withRetry } from '../../util/retry.ts';
const ntlm = httpntlm.ntlm;

type httpsGetImpl = typeof https.get;

export interface DownloadDocumentOptions {
	version?: number;
	rendition?: boolean;
	createWriteStream?: (filename: string) => WriteStream;
}

export interface HorizonWebClientOptions {
	// baseUrl prepended to request URLs
	baseUrl: string;
	// sername for NTLM login
	username: string;
	// password for NTLM login
	password: string;
	// custom DNS lookup (ipv4 only)
	dnsEntries?: Record<string, string>;
}

/**
 * A client for interacting with Horizon web services
 * This class handles NTLM auth (with the 'httpntlm' module) and the OpenText/Horizon specific redirect/login behavior
 */
export class HorizonWebClient {
	readonly #baseUrl: string;
	readonly #username: string;
	readonly #password: string;
	readonly #agent: https.Agent;

	// cookie jar for storing cookies between requests
	#cookieJar: Record<string, string> = {};
	// number of attempts at re-authenticating
	#reAuthAttempts: number = 0;

	/**
	 * to ensure we only attempt one login at a time we save the login promise to await in subsequent calls
	 * @private
	 */
	#loginPromise: Promise<void> | null = null;
	readonly #httpsGet: httpsGetImpl;

	/**
	 *
	 * @param options options for configuring the client
	 * @param httpsGet https.get implementation - here for testing override
	 */
	constructor(options: HorizonWebClientOptions, httpsGet: httpsGetImpl = https.get) {
		if (!options.baseUrl) {
			throw new Error('baseUrl is required');
		}
		this.#baseUrl = options.baseUrl;
		if (!options.username) {
			throw new Error('username is required');
		}
		this.#username = options.username;
		if (!options.password) {
			throw new Error('password is required');
		}
		this.#password = options.password;
		let dnsLookup: LookupFunction | undefined;
		const { dnsEntries } = options;
		if (dnsEntries) {
			dnsLookup = HorizonWebClient.buildCustomDnsEntryLookup(dnsEntries);
		}
		this.#agent = new https.Agent({
			keepAlive: true,
			lookup: dnsLookup
		});

		this.#httpsGet = httpsGet;
	}

	/**
	 * Pipe a file to a write stream
	 *
	 * @param objId - the object ID of a document
	 * @param version - the document version to download
	 * @param rendition - whether to download the document rendition (PDF)
	 * @param createWriteStream - a function taking a filename and returning a WriteStream
	 * @returns the filename
	 */
	async pipeDocument(
		objId: string,
		{ version, rendition, createWriteStream }: DownloadDocumentOptions
	): Promise<string> {
		if (!createWriteStream) {
			throw new Error('createWriteStream is required');
		}
		const { filename, stream: file } = await this.getDocument(objId, { version, rendition });
		const writeStream = createWriteStream(filename);
		file.pipe(writeStream);
		// wait for the stream to finish
		await new Promise((resolve, reject) => {
			file.on('end', resolve);
			file.on('error', reject);
		});
		return filename;
	}

	/**
	 * Get a document, will return a readable stream and a filename
	 *
	 * @param objId - the object ID of a document
	 * @param options - the document version to download
	 * @returns the filename and readable stream
	 */
	async getDocument(
		objId: string,
		{ version, rendition }: DownloadDocumentOptions = {}
	): Promise<{ filename: string; stream: Readable }> {
		const params = new URLSearchParams({
			func: 'll',
			objId,
			objAction: 'download'
		});
		if (version) {
			params.set('vernum', version.toString());
		}
		if (rendition) {
			params.set('objAction', 'DownloadRenditionAction');
			params.set('vertype', 'PDF');
		}
		const file = await this.get(`/otcs/llisapi.dll?${params.toString()}`);
		const filenameOrError = HorizonWebClient.filenameFromHeaders(file);
		if (filenameOrError instanceof Error) {
			// empty the stream
			await new Promise<void>((resolve) => {
				file.resume().on('end', () => resolve());
			});
			throw filenameOrError;
		}
		return { filename: filenameOrError, stream: file };
	}

	/**
	 * Make a GET request to Horizon web services
	 *
	 * @param url
	 */
	async get(url: string) {
		// await the login process (which may have been from another request)
		await this.#waitForLogin(url);

		// make a request to the original URL using the cookies for auth
		return this.#authedGetRequest(url);
	}

	/**
	 * Add a custom view by uploading an HTML string as a multipart/form-data POST
	 *
	 * @param caseNodeId - the parent node ID in Horizon
	 * @param html - the HTML content to upload
	 * @param name - the name for the new object
	 */
	async addCustomView(caseNodeId: string, html: string, name: string): Promise<void> {
		await this.#waitForLogin('/otcs/llisapi.dll');

		const boundary = `----FormBoundary${Date.now().toString(16)}`;
		const fileName = name.endsWith('.html') ? name : `${name}.html`;
		const fileBuffer = Buffer.from(html, 'utf-8');

		const nextURL = `/otcs/llisapi.dll?func=ll&objid=${caseNodeId}&objAction=browse&sort=name&section=1`;

		const fields: Record<string, string> = {
			func: 'll',
			objType: '146', // custom view
			objAction: 'create2',
			parentId: caseNodeId,
			nextURL,
			ExOrNew: 'Ex',
			creationType: 'Ex',
			name
		};

		// build the multipart preamble (fields + file header)
		let preamble = '';
		for (const [key, value] of Object.entries(fields)) {
			preamble += `--${boundary}\r\n`;
			preamble += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
			preamble += `${value}\r\n`;
		}
		preamble += `--${boundary}\r\n`;
		preamble += `Content-Disposition: form-data; name="versionFile"; filename="${fileName}"\r\n`;
		preamble += `Content-Type: text/html\r\n\r\n`;

		const epilogue = `\r\n--${boundary}--\r\n`;

		const preambleBuffer = Buffer.from(preamble, 'utf-8');
		const epilogueBuffer = Buffer.from(epilogue, 'utf-8');
		const contentLength = preambleBuffer.length + fileBuffer.length + epilogueBuffer.length;

		// Content Server checks the Referer header for CSRF protection
		// simulate the browser having come from the create form page
		const refererParams = new URLSearchParams({
			func: 'll',
			objType: '146',
			objAction: 'create',
			parentId: caseNodeId,
			nextURL
		});
		const referer = `${this.#baseUrl}/otcs/llisapi.dll?${refererParams.toString()}`;

		const headers: http.OutgoingHttpHeaders = {
			'Content-Type': `multipart/form-data; boundary=${boundary}`,
			'Content-Length': contentLength,
			Connection: 'keep-alive',
			Referer: referer
		};
		this.#addCookies(headers);

		const res = await this.#post('/otcs/llisapi.dll', headers, (req) => {
			req.write(preambleBuffer);
			req.write(fileBuffer);
			req.write(epilogueBuffer);
			req.end();
		});
		// correct response is 302 redirect
		if (res.statusCode !== 302) {
			// read the response
			const body = await new Promise<string>((resolve, reject) => {
				let data = '';
				res.setEncoding('utf8');
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => resolve(data));
				res.on('error', (err) => reject(err));
			});
			throw new CustomViewError(body);
		}
		// else all OK, no errors, so drain the response
		await new Promise<void>((resolve, reject) => {
			res.on('end', () => resolve());
			res.on('error', (err) => reject(err));
			res.resume();
		});
	}

	async #waitForLogin(url: string) {
		if (!this.#hasAuth && !this.#loginPromise) {
			// if no login in progress, start the login process and save the promise
			this.#loginPromise = this.#loginFlow(url);
		}
		try {
			await this.#loginPromise;
		} finally {
			// ensure #loginPromise doesn't get stuck if there is an error
			// instead login will be retried if there is another request made
			this.#loginPromise = null;
		}
	}

	/**
	 * Complete the login flow - both NTLM auth and the OpenText/Horizon specific steps
	 * Results in cookies being saved for future requests
	 * @param url
	 * @private
	 */
	async #loginFlow(url: string) {
		await withRetry(
			async () => {
				// start the NTLM login flow
				// see https://stackoverflow.com/a/13960538
				// see https://techcommunity.microsoft.com/blog/iis-support-blog/windows-authentication-http-request-flow-in-iis/324645
				// STEP 1:
				// first make a request with the type1 auth header
				const type1Res = await this.#ntlmType1Request(url);

				const wwwAuthenticate = type1Res.headers['www-authenticate'];
				if (!wwwAuthenticate) {
					throw new Error('www-authenticate header not found in type-1 message response');
				}
				// STEP 2:
				// www-authenticate header includes the NTLM type-2 message
				// extract this and create the type-3 message to complete authorization
				const type3Res = await this.#ntlmType3Request(url, wwwAuthenticate);
				// the next steps appear to be Horizon/OpenText specific
				// type3 response includes a redirect (to ?func=LL.Login)
				if (type3Res.statusCode !== 302 || !type3Res.headers['location']) {
					throw new Error('login redirect expected after type-3 message, got HTTP code ' + type3Res.statusCode);
				}
				// STEP 3:
				// make a request to the login endpoint
				const loginRes = await this.#get(type3Res.headers['location'], { headers: { Connection: 'keep-alive' } }, true);
				if (loginRes.statusCode !== 302 || !loginRes.headers['location']) {
					throw new Error('redirect expected after login message, got HTTP code ' + loginRes.statusCode);
				}
				if (!loginRes.headers['set-cookie']) {
					throw new Error('cookies expected after login request');
				}
				// STEP 4:
				// login response includes cookies
				// save these to authorise subsequent requests
				this.#updateCookies(loginRes);
			},
			{
				isRetryableError: HorizonWebClient.shouldRetryLoginError
			}
		);
	}

	/**
	 * Assume if there are cookies then we have run the authorization flow already
	 * @private
	 */
	get #hasAuth() {
		return Object.keys(this.#cookieJar).length > 0;
	}

	/**
	 * Perform a get request using the cookies for authentication
	 *
	 * @param url
	 * @private
	 */
	async #authedGetRequest(url: string): Promise<http.IncomingMessage> {
		if (!this.#hasAuth) {
			throw new Error('requests must be authorised first');
		}
		const headers: http.OutgoingHttpHeaders = {
			Connection: 'keep-alive'
		};
		this.#addCookies(headers);
		const res = await this.#get(url, { headers });
		if (res.headers['set-cookie']) {
			this.#updateCookies(res);
		}
		if (res.statusCode === 401) {
			// if we get 401 for an authed request, then re-auth
			if (this.#reAuthAttempts >= 3) {
				// don't get stuck in a loop
				return res;
			}
			// clear cookies to start login again
			this.#cookieJar = {};
			this.#reAuthAttempts++;
			return this.get(url);
		} else {
			this.#reAuthAttempts = 0;
		}
		return res;
	}

	/**
	 * Part of the NTLM authorization flow
	 * @see https://stackoverflow.com/a/13960538
	 * @see https://techcommunity.microsoft.com/blog/iis-support-blog/windows-authentication-http-request-flow-in-iis/324645
	 *
	 * @param url
	 * @private
	 */
	#ntlmType1Request(url: string) {
		const auth = ntlm.createType1Message(this.#ntlmOptions);
		return this.#get(
			url,
			{
				headers: {
					Authorization: auth,
					Connection: 'keep-alive'
				}
			},
			true
		);
	}

	/**
	 * Part of the NTLM authorization flow
	 * @see https://stackoverflow.com/a/13960538
	 * @see https://techcommunity.microsoft.com/blog/iis-support-blog/windows-authentication-http-request-flow-in-iis/324645
	 *
	 * @param url
	 * @param wwwAuthenticateHeader
	 * @private
	 */
	async #ntlmType3Request(url: string, wwwAuthenticateHeader: string) {
		const type2msg = await this.#ntlmParseType2Message(wwwAuthenticateHeader);
		const type3msg = ntlm.createType3Message(type2msg, this.#ntlmOptions);

		return this.#get(
			url,
			{
				headers: {
					Authorization: type3msg,
					Connection: 'keep-alive'
				}
			},
			true
		);
	}

	/**
	 * Wrap the ntlm.parseType2Message function which takes a callback that is only called on error
	 *
	 * @param wwwAuthenticateHeader
	 * @private
	 */
	#ntlmParseType2Message(wwwAuthenticateHeader: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const type2msg = ntlm.parseType2Message(wwwAuthenticateHeader, reject);
			resolve(type2msg);
		});
	}

	get #ntlmOptions() {
		return {
			username: this.#username,
			password: this.#password
		};
	}

	/**
	 * Make a POST request to the server
	 * @param url
	 * @param headers
	 * @param writeBody callback that writes the request body and calls req.end()
	 * @private
	 */
	#post(
		url: string,
		headers: http.OutgoingHttpHeaders,
		writeBody: (req: http.ClientRequest) => void
	): Promise<http.IncomingMessage> {
		if (!url.startsWith('http')) {
			url = this.#baseUrl + url;
		}
		const parsedUrl = new URL(url);
		return new Promise((resolve, reject) => {
			const req = https.request(
				{
					hostname: parsedUrl.hostname,
					port: parsedUrl.port,
					path: parsedUrl.pathname + parsedUrl.search,
					method: 'POST',
					agent: this.#agent,
					headers
				},
				(res) => {
					resolve(res);
				}
			);
			req.on('error', reject);
			req.on('timeout', () => {
				req.destroy(new Error('Request timed out'));
			});
			writeBody(req);
		});
	}

	/**
	 * Make a GET request to the server
	 * @param url
	 * @param options
	 * @param readStream if true, the response data is read and discarded
	 * @private
	 */
	#get(url: string, options: https.RequestOptions, readStream?: boolean): Promise<http.IncomingMessage> {
		if (!url.startsWith('http')) {
			url = this.#baseUrl + url;
		}
		return new Promise((resolve, reject) => {
			const req = this.#httpsGet(url, { agent: this.#agent, ...options }, (res) => {
				if (readStream) {
					// read the stream but don't process any of the data
					res.resume().on('end', () => resolve(res));
				} else {
					resolve(res);
				}
			});

			req.on('error', reject);
			req.on('timeout', () => {
				req.destroy(new Error('Request timed out'));
			});
		});
	}

	#addCookies(headers: http.OutgoingHttpHeaders | undefined) {
		if (!headers) return;
		if (this.#cookies) {
			headers['Cookie'] = this.#cookies;
		}
	}

	get #cookies() {
		return Object.entries(this.#cookieJar)
			.map(([k, v]) => `${k}=${v}`)
			.join('; ');
	}

	/**
	 * Update the internal cookie jar from a fetch Response
	 */
	#updateCookies(response: http.IncomingMessage) {
		const cookies = response.headers['set-cookie'];
		if (!cookies) return;
		const cookieKv = cookies.map((c) => c.split(';')[0]);
		for (const c of cookieKv) {
			const [k, v] = c.split('=');
			this.#cookieJar[k] = v;
		}
	}

	/**
	 * Check a given file download response is valid, and if its valid then return the filename
	 * If it is not valid, an Error is returned (not thrown)
	 * @param response
	 */
	static filenameFromHeaders(response: http.IncomingMessage): Error | string {
		if (response.statusCode !== 200) {
			return new Error('download error ' + response.statusCode);
		}
		const contentDisposition = response.headers['content-disposition'];
		if (!contentDisposition) {
			return new Error('download error, file not found (no content-disposition header)');
		}
		const name = contentDisposition.match(/attachment; filename="(.*)"$/);
		if (!name || name.length <= 1) {
			return new Error(`download error, no filename in content-disposition header: '${contentDisposition}'`);
		}
		return decodeURIComponent(name[1]);
	}

	static buildCustomDnsEntryLookup(entries: Record<string, string>): LookupFunction {
		return (hostname, opts, callback) => {
			const ip = entries[hostname];
			const array = opts.all ? [{ address: ip, family: 4 }] : ip;
			callback(null, array, 4);
		};
	}

	static shouldRetryLoginError(error: unknown): boolean {
		return error === `Couldn't find NTLM in the message type2 coming from the server`;
	}
}

class CustomViewError extends Error {
	response: string;

	constructor(response: string) {
		super('Error creating custom view');
		this.response = response;
	}
}
