export const testCases = {
	standardCaseReference: 'APP/Q9999/D/21/1234567',
	mappedCaseReference: 'APP-Q9999-D-21-1234567',
	emptyCaseReference: '',
	documentId: 'doc-guid-123',
	standardFilename: 'document.pdf',
	filenameWithSpecialChars: 'my document (final).pdf'
} as const;

export const expectedPaths = {
	version1: 'appeal/APP-Q9999-D-21-1234567/doc-guid-123/v1/document.pdf',
	version5: 'appeal/APP-Q9999-D-21-1234567/doc-guid-123/v5/document.pdf',
	withSpecialChars: 'appeal/APP-Q9999-D-21-1234567/doc-guid-123/v1/my document (final).pdf'
} as const;
