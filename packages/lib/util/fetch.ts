/**
 * Make a request with `fetch` using an AbortController to implement request timeout.
 * Defaults to a GET request
 *
 * @param url
 * @param timeoutMs
 * @param options
 */
export async function fetchWithTimeout(url: string, { timeoutMs }: { timeoutMs: number }, options: RequestInit = {}) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
			...options,
			signal: controller.signal
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new TimeoutError(timeoutMs, `Request to ${url} timed out after ${timeoutMs}ms`);
		}
		throw error;
	}
}

/**
 * An error to indicate that a request timed out as a response was not received within the configured time
 */
export class TimeoutError extends Error {
	readonly #timeoutMs: number;

	constructor(timeoutMs: number, message?: string) {
		super(message);
		this.#timeoutMs = timeoutMs;
	}

	get timeoutMs() {
		return this.#timeoutMs;
	}
}
