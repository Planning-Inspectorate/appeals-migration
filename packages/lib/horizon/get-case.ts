import { cleanHorizonResponse, SOAP_OP_PREFIX, XMLSNS } from './util.ts';
import type { StringValue } from './horizon.d.ts';

/**
 * Create a GetCase request payload
 * @param caseReference
 */
export function getCaseRequest(caseReference: string): string {
	const req = {
		GetCase: {
			__soap_op: SOAP_OP_PREFIX + 'GetCase',
			__xmlns: XMLSNS,
			caseReference
		}
	};
	return JSON.stringify(req);
}

export function cleanGetCaseResponse(txt: string): string {
	return cleanHorizonResponse(txt)
		.replace(/("PublishedDocuments":\s){/g, '$1[')
		.replace(/}(\s+}\s+}\s+}\s+}\s+})$/, ']$1')
		.replace(/"HorizonSearchDocument":\s/g, '');
}

export interface GetCaseResponse {
	CaseId: StringValue;
	CaseOfficer: {
		Email: StringValue;
		Name: StringValue;
	};
	CaseReference: StringValue;
	CaseType: StringValue;
	LPACode: StringValue;
	LinkedCases: any;
	Metadata: {
		Attributes: {
			[key: string]: StringValue | CaseInvolvement[] | Event;
		};
	};
	ProcedureType: StringValue;
	PublishedDocuments: PublishedDocument[];
}

export interface CaseInvolvement {
	'Case Involvement:Case Involvement:ContactID': StringValue;
	'Case Involvement:Case Involvement:Contact Details': StringValue;
	'Case Involvement:Case Involvement:Type Of Involvement': StringValue;
	'Case Involvement:Case Involvement:Communication Preference'?: StringValue;
	'Case Involvement:Case Involvement:Involvement Start Date'?: StringValue;
	'Case Involvement:Case Involvement:Involvement External Reference Number'?: StringValue;
}

export interface Event {
	'Event:Event:Event Name': StringValue;
	'Event:Event:Type Of Event': StringValue;
	'Event:Event:Chart Status': StringValue;
	'Event:Event:Date Exported To ISS': StringValue;
	'Event:Event:Start Date Of The Event': StringValue;
	'Event:Event:Start Time Of The Event': StringValue;
	'Event:Event:Event Publish Flag': StringValue;
}

export interface PublishedDocument {
	Content: any;
	DateCreated: StringValue;
	DateModified: StringValue;
	DatePublished: StringValue;
	FileSize: StringValue;
	Filename: StringValue;
	Metadata: {
		Attributes: {
			'Document:Incoming/Outgoing/Internal': StringValue;
			'Document:Document Type': StringValue;
			'Document:Document Group Type': StringValue;
			'Document:Published Flag': StringValue;
			'Document:Published Date': StringValue;
			'Document:Received/Sent Date': StringValue;
		};
	};
	MimeType: StringValue;
	NodeId: StringValue;
}
