import { CaseSearchRequest, CaseSearchResponse } from './case-search.ts';
import { GetCaseResponse } from './get-case.ts';

export interface IHorizonApi {
	searchCases(req: CaseSearchRequest): Promise<CaseSearchResponse>;
	addDocuments(req: AddDocumentsRequest): Promise<void>;
	getCase(caseReference: string): Promise<GetCaseResponse>;
	getDocument(req: GetDocumentRequest): Promise<void>;
	caseSearchSummaryDetails(): Promise<void>;
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
