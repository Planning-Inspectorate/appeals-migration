import type { StringValue } from './horizon.d.ts';
import { cleanHorizonResponse, prefixAllKeys, XMLSNS_PROPS, SOAP_OP_PREFIX, XMLSNS } from './util.ts';

/**
 * the JSON returned has duplicate HorizonSearchResult keys within CaseSearchResult,
 * handle this by crudely turning it into a list
 *
 * @example
 * CaseSearchResult: {
 * 	HorizonSearchResult: {...},
 * 	HorizonSearchResult: {...}
 * }
 *
 * @param txt
 */
export function cleanCaseSearchResponse(txt: string): string {
	return (
		cleanHorizonResponse(txt)
			// change the CaseSearchResult wrapper {} to []
			.replace(/^({\s+"Envelope":\s{\s+"Body":\s{\s+"CaseSearchResponse":\s{\s+"CaseSearchResult":\s){/, '$1[')
			.replace(/}(\s+}\s+}\s+}\s+})$/, ']$1')
			// remove each "HorizonSearchResult": to leave a valid array
			.replaceAll('"HorizonSearchResult":', '')
	);
}

/**
 * the JSON returned has duplicate HorizonSearchResult2 keys within CaseSearchSummaryDetailsResult,
 * handle this by crudely turning it into a list
 *
 * @example
 * CaseSearchSummaryDetailsResult: {
 * 	HorizonSearchResult2: {...},
 * 	HorizonSearchResult2: {...}
 * }
 *
 * @param txt
 */
export function cleanCaseSearchSummaryResponse(txt: string): string {
	return (
		cleanHorizonResponse(txt)
			// change the CaseSearchResult wrapper {} to []
			.replace(
				/^({\s+"Envelope":\s{\s+"Body":\s{\s+"CaseSearchSummaryDetailsResponse":\s{\s+"CaseSearchSummaryDetailsResult":\s){/,
				'$1['
			)
			.replace(/}(\s+}\s+}\s+}\s+})$/, ']$1')
			// remove each "HorizonSearchResult": to leave a valid array
			.replaceAll('"HorizonSearchResult2":', '')
	);
}

/**
 * Create a CaseSearch request payload
 * @param searchRequest
 */
export function caseSearchRequest(searchRequest: CaseSearchRequest): string {
	const req = {
		CaseSearch: {
			__soap_op: SOAP_OP_PREFIX + 'CaseSearch',
			__xmlns: XMLSNS,
			criteria: {
				...XMLSNS_PROPS,
				...prefixAllKeys(searchRequest.criteria, 'hzn:')
			},
			sortByAttribute: searchRequest.sortByAttribute || 'None',
			sortAscending: searchRequest.sortAscending || 'false',
			wantPublishedOnly: searchRequest.wantPublishedOnly || 'false'
		}
	};
	return JSON.stringify(req);
}

/**
 * Create a CaseSearchSummaryDetails request payload
 * @param caseTypeName
 * @param searchCriteria
 */
export function caseSearchSummaryRequest(caseTypeName: string, searchCriteria: string): string {
	const req = {
		CaseSearchSummaryDetails: {
			__soap_op: SOAP_OP_PREFIX + 'CaseSearchSummaryDetails',
			__xmlns: XMLSNS,
			caseTypeName,
			searchCriteria
		}
	};
	return JSON.stringify(req);
}

export interface CaseSearchCriteria {
	CaseReference?: string;
	CaseType?: string;
	DateReceived?: DateCriteria;
	DecisionDate?: DateCriteria;
	LPA?: string;
	ProcedureType?: string;
	StartDate?: DateCriteria;
	Status?: string;
}

// type TBC
export interface DateCriteria {
	StartDate: string;
	EndDate: string;
}

export interface CaseSearchRequest {
	criteria: CaseSearchCriteria;
	sortByAttribute?: string;
	sortAscending?: string;
	wantPublishedOnly?: string;
}

export type CaseSearchResponse = HorizonSearchResult[];
export interface HorizonSearchResult {
	AppellantName: StringValue;
	CaseReference: StringValue;
	CaseStatus: StringValue;
	CaseType: StringValue;
	LPACode: StringValue;
	LPAReference: StringValue;
	NodeId: StringValue;
	ProcedureType: StringValue;
	StartDate: StringValue;
	Address: {
		AddressLine1: StringValue;
		AddressLine2: StringValue;
		County: StringValue;
		Town: StringValue;
		PostCode: StringValue;
		GridReferenceEasting: StringValue;
		GridReferenceNorthing: StringValue;
	};
}

export type CaseSearchSummaryResponse = HorizonSearchResult2[];
export interface HorizonSearchResult2 extends HorizonSearchResult {
	CaseFullName: StringValue;
}
