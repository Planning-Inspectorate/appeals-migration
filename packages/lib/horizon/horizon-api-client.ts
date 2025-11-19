import type { IHorizonApi } from './horizon.d.ts';
import { fetchWithTimeout } from '../util/fetch.ts';
import { caseSearchRequest, CaseSearchRequest, CaseSearchResponse, processCaseSearchResponse } from './case-search.ts';

/**
 * A client for the Horizon REST API Wrapper
 */
export class HorizonApiClient implements IHorizonApi {
	readonly #baseUrl: string;
	readonly #timeoutMs: number;

	constructor(baseUrl: string, timeoutMs?: number) {
		this.#baseUrl = baseUrl;
		this.#timeoutMs = timeoutMs || 30_000;
	}

	/**
	 * Search for Appeals cases using Horizon CaseSearch API
	 *
	 * @param req
	 */
	async searchCases(req: CaseSearchRequest): Promise<CaseSearchResponse> {
		const body = caseSearchRequest(req);
		const res = await this.#post(body);
		if (!res.ok) {
			let message = res.status + ' ' + res.statusText;
			try {
				message += await res.text();
			} catch {
				/* ignore errors here */
			}
			throw new Error(message);
		}
		const resTxt = processCaseSearchResponse(await res.text());
		const resBody = JSON.parse(resTxt);
		const results = resBody?.Envelope?.Body?.CaseSearchResponse?.CaseSearchResult;
		if (!results) {
			throw new Error('failed to find CaseSearchResult in JSON response');
		}
		return results;
	}

	/**
	 * Search any case type using Horizon CaseSearchSummaryDetails API
	 */
	caseSearchSummaryDetails(): Promise<void> {
		return Promise.resolve(undefined);
	}

	addDocuments(): Promise<void> {
		return Promise.resolve(undefined);
	}

	getCase(): Promise<void> {
		return Promise.resolve(undefined);
	}

	getContact(): Promise<void> {
		return Promise.resolve(undefined);
	}

	getDocument(): Promise<void> {
		return Promise.resolve(undefined);
	}

	async #post(body: string): Promise<Response> {
		return fetchWithTimeout(
			this.#baseUrl,
			{ timeoutMs: this.#timeoutMs },
			{
				method: 'POST',
				body
			}
		);
	}
}
