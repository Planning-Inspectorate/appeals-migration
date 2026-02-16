import type { CaseSearchRequest, CaseSearchResponse, CaseSearchSummaryResponse } from './case-search.ts';
import type { GetCaseResponse } from './get-case.ts';

export interface IHorizonApi {
	searchCases(req: CaseSearchRequest): Promise<CaseSearchResponse>;
	caseSearchSummaryDetails(caseTypeName: string, searchCriteria: string): Promise<CaseSearchSummaryResponse>;
	addDocuments(req: AddDocumentsRequest): Promise<void>;
	getCase(caseReference: string): Promise<GetCaseResponse>;
	getDocument(req: GetDocumentRequest): Promise<void>;
	getContact(req: GetContactRequest): Promise<void>;
}

export type StringValue = string | null;

export interface AddDocumentsRequest {
	caseReference: string;
	documents: any[];
}

export interface GetDocumentRequest {
	nodeId: number;
}

export interface CaseSearchSummaryDetailsRequest {
	caseTypeName: string;
	searchCriteria: number;
}

export interface GetContactRequest {
	id: string;
}
