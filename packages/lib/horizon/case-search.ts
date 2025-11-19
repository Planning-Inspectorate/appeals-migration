import { prefixAllKeys } from './util.ts';

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
export function processCaseSearchResponse(txt: string): string {
	return (
		txt
			// change the wrapper {} to []
			.replaceAll('"CaseSearchResult":\t{', '"CaseSearchResult":\t[')
			.replace('\n\t\t\t\t}', '\n\t\t\t\t]')
			// remove each "HorizonSearchResult":
			.replaceAll('"HorizonSearchResult":', '')
	);
}

/**
 * Create a CaseSearch request payload
 * @param searchRequest
 */
export function caseSearchRequest(searchRequest: CaseSearchRequest): string {
	const req = {
		CaseSearch: {
			__soap_op: 'http://tempuri.org/IHorizon/CaseSearch',
			__xmlns: 'http://tempuri.org/',
			criteria: {
				'__xmlns:hzn': 'http://schemas.datacontract.org/2004/07/Horizon.Business',
				'__xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance',
				...prefixAllKeys(searchRequest.criteria, 'hzn:')
			},
			sortByAttribute: searchRequest.sortByAttribute || 'None',
			sortAscending: searchRequest.sortAscending || 'false',
			wantPublishedOnly: searchRequest.wantPublishedOnly || 'false'
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

export interface StringValue {
	value?: string;
}
