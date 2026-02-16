import type { IHorizonApi } from './horizon.d.ts';
import { fetchWithTimeout } from '../../util/fetch.ts';
import {
	caseSearchRequest,
	type CaseSearchRequest,
	type CaseSearchResponse,
	caseSearchSummaryRequest,
	type CaseSearchSummaryResponse,
	cleanCaseSearchResponse,
	deleteCaseSearchSummaryUnusedKeys,
	cleanCaseSearchSummaryResponse
} from './case-search.ts';
import { getCaseRequest, cleanGetCaseResponse, type GetCaseResponse } from './get-case.ts';

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
		const resTxt = cleanCaseSearchResponse(res);
		const resBody = JSON.parse(resTxt);
		const results = resBody?.Envelope?.Body?.CaseSearchResponse?.CaseSearchResult;
		if (!results) {
			throw new Error('failed to find CaseSearchResult in JSON response');
		}
		return results;
	}

	async getCase(caseReference: string): Promise<GetCaseResponse> {
		const res = await this.#post(getCaseRequest(caseReference));
		const resTxt = cleanGetCaseResponse(res);
		const resBody = JSON.parse(resTxt);
		const result = resBody?.Envelope?.Body?.GetCaseResponse?.GetCaseResult;
		if (!result) {
			throw new Error('failed to find GetCaseResult in JSON response');
		}
		return result;
	}

	/**
	 * Search any case type using Horizon CaseSearchSummaryDetails API
	 * @param caseTypeName exactly matches this case type
	 * @param searchCriteria the case reference or first address line includes this value
	 */
	async caseSearchSummaryDetails(caseTypeName: string, searchCriteria: string): Promise<CaseSearchSummaryResponse> {
		const res = await this.#post(caseSearchSummaryRequest(caseTypeName, searchCriteria));
		const resTxt = cleanCaseSearchSummaryResponse(res);
		const resBody = JSON.parse(resTxt);
		const result = resBody?.Envelope?.Body?.CaseSearchSummaryDetailsResponse?.CaseSearchSummaryDetailsResult;
		if (!result) {
			throw new Error('failed to find CaseSearchSummaryDetailsResult in JSON response');
		}
		deleteCaseSearchSummaryUnusedKeys(result);
		return result;
	}

	addDocuments(): Promise<void> {
		return Promise.resolve(undefined);
	}

	getContact(): Promise<void> {
		return Promise.resolve(undefined);
	}

	getDocument(): Promise<void> {
		return Promise.resolve(undefined);
	}

	async #post(body: string): Promise<string> {
		const res = await fetchWithTimeout(
			this.#baseUrl,
			{ timeoutMs: this.#timeoutMs },
			{
				method: 'POST',
				body
			}
		);
		if (!res.ok) {
			let message = res.status + ' ' + res.statusText;
			try {
				message += await res.text();
			} catch {
				/* ignore errors here */
			}
			throw new Error(message);
		}
		return res.text();
	}
}
