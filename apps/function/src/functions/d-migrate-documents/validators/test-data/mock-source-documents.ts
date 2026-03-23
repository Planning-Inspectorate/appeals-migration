import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';

export const mockValidDocument: AppealDocument = {
	documentId: 'doc-123',
	filename: 'test.pdf',
	caseReference: 'APP/123',
	version: 1,
	caseId: null,
	dateCreated: null,
	documentType: null,
	virusCheckStatus: null,
	size: null,
	originalFilename: null,
	mime: null,
	documentURI: null,
	lastModified: null,
	origin: null,
	description: null,
	owner: null,
	author: null,
	fileMD5: null,
	caseStage: null,
	datePublished: null,
	dateReceived: null,
	publishedDocumentURI: null,
	caseType: null,
	redactedStatus: null,
	horizonFolderId: null,
	sourceSystem: 'horizon'
};

export const mockDocumentWithMissingCaseReference: AppealDocument = {
	...mockValidDocument,
	caseReference: null as any
};

export const mockDocumentWithMissingFilename: AppealDocument = {
	...mockValidDocument,
	filename: null as any
};

export const mockDocumentWithMissingDocumentId: AppealDocument = {
	...mockValidDocument,
	documentId: null as any
};

export const mockDocumentWithDifferentId: AppealDocument = {
	...mockValidDocument,
	documentId: 'doc-456',
	filename: 'v2.pdf',
	version: 2
};

export const mockDocumentWithMissingFilenameOnVersion: AppealDocument = {
	...mockValidDocument,
	filename: null as any,
	version: 2
};

export const mockValidDocumentVersion2: AppealDocument = {
	...mockValidDocument,
	filename: 'v2.pdf',
	version: 2
};

export const mockValidDocuments: AppealDocument[] = [mockValidDocument];

export const mockDocumentsWithDifferentIds: AppealDocument[] = [mockValidDocument, mockDocumentWithDifferentId];

export const mockDocumentsWithMissingFilenameOnVersion: AppealDocument[] = [
	mockValidDocument,
	mockDocumentWithMissingFilenameOnVersion
];

export const mockMultipleValidVersions: AppealDocument[] = [mockValidDocument, mockValidDocumentVersion2];
