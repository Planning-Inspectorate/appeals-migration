import http from 'http';

const DEFAULT_OPTIONS: RequestInit = {
	credentials: 'include'
};

export class TestServer {
	// Private cookie jar for storing cookies between requests
	readonly #cookieJar: Record<string, string> = {};
	readonly requestListener: http.RequestListener;
	rememberCookies: boolean;
	server: http.Server | null;
	port: number | null;

	/**
	 * @param requestListener
	 * @param [options]
	 * @param [options.rememberCookies] - If true, cookies are stored and sent with each request
	 */
	constructor(requestListener: http.RequestListener, options: { rememberCookies?: boolean } = {}) {
		this.requestListener = requestListener;
		this.server = null;
		this.port = null;
		this.rememberCookies = Boolean(options.rememberCookies);
	}

	/**
	 * Starts the server on a random port.
	 */
	async start(): Promise<void> {
		if (this.server) return;
		const server = http.createServer(this.requestListener);
		await new Promise<void>((resolve, reject) => {
			server.listen(0, '127.0.0.1');
			server.on('listening', () => {
				const address = server.address();
				if (address !== null && typeof address === 'object' && 'port' in address) {
					this.port = address.port;
					resolve();
				} else {
					reject('unable to get server port');
				}
			});
			server.on('error', reject);
		});
		this.server = server;
	}

	/**
	 * Stops the server.
	 */
	async stop(): Promise<void> {
		const server = this.server;
		if (!server) return;
		await new Promise<void>((resolve, reject) => {
			server.close((err) => {
				if (err) reject(err);
				else resolve();
			});
		});
		this.server = null;
		this.port = null;
	}

	/**
	 * Performs a GET request to the server.
	 */
	async get(path: string, options: RequestInit = {}): Promise<Response> {
		if (!this.server || !this.port) {
			throw new Error('Server is not started');
		}
		const fetchOptions: RequestInit = { headers: {}, ...DEFAULT_OPTIONS, ...options, method: 'GET' };
		this.#addCookies(fetchOptions.headers);
		const response = await fetch(`http://localhost:${this.port}${path}`, fetchOptions);
		if (this.rememberCookies) {
			this.#updateCookies(response);
		}
		return response;
	}

	/**
	 * Performs a GET request to the server, following a maximum number of redirects.
	 */
	async getWithRedirects(path: string, maxRedirects: number, options: RequestInit = {}): Promise<Response> {
		if (!this.server || !this.port) {
			throw new Error('Server is not started');
		}
		if (maxRedirects === 0) {
			// can just use get() directly otherwise
			throw new Error('maxRedirects must be greater than 0');
		}
		let response: Response | undefined;
		let currentPath = path;
		let numRedirects = 0;
		while (true) {
			response = await this.get(currentPath, { ...options, redirect: 'manual' });
			if (
				response.status >= 300 &&
				response.status < 400 &&
				response.headers.has('location') &&
				numRedirects < maxRedirects
			) {
				const location = response.headers.get('location');
				if (location === null) {
					break;
				}
				currentPath = location;
				numRedirects++;
				continue;
			}
			break;
		}
		if (this.rememberCookies) {
			this.#updateCookies(response);
		}
		return response;
	}

	/**
	 * Performs a POST request to the server.
	 */
	async post(path: string, body: any = {}, options: RequestInit = {}): Promise<Response> {
		if (!this.server || !this.port) {
			throw new Error('Server is not started');
		}
		const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
		const fetchOptions = {
			...DEFAULT_OPTIONS,
			...options,
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		};
		this.#addCookies(fetchOptions.headers);
		const response = await fetch(`http://localhost:${this.port}${path}`, fetchOptions);
		if (this.rememberCookies) {
			this.#updateCookies(response);
		}
		return response;
	}

	#addCookies(headers: HeadersInit | undefined) {
		if (!this.rememberCookies) return;
		if (!headers) return;
		if (this.#cookies) {
			// @ts-expect-error this is OK, we only use the header set
			headers.Cookie = this.#cookies;
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
	#updateCookies(response: Response) {
		const cookies = response.headers.getSetCookie();
		if (!cookies) return;
		const cookieKv = cookies.map((c) => c.split(';')[0]);
		for (const c of cookieKv) {
			const [k, v] = c.split('=');
			this.#cookieJar[k] = v;
		}
	}
}
