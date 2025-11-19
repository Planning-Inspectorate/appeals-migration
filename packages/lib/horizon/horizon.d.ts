import { CaseSearchRequest, CaseSearchResponse } from './case-search.ts';

export interface IHorizonApi {
	searchCases(req: CaseSearchRequest): Promise<CaseSearchResponse>;
	addDocuments(req: AddDocumentsRequest): Promise<void>;
	getCase(req: GetCaseRequest): Promise<void>;
	getDocument(req: GetDocumentRequest): Promise<void>;
	caseSearchSummaryDetails(): Promise<void>;
	getContact(req: GetContactRequest): Promise<void>;
}

export interface AddDocumentsRequest {
	caseReference: string;
	documents: any[];
}

export interface GetCaseRequest {
	caseReference: string;
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
