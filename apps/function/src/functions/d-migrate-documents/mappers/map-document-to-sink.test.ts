// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { mapDocumentToSink } from './map-document-to-sink.ts';
import {
	mockCompleteDocument,
	mockDocumentWithDefaults,
	mockDocumentWithMissingDocumentId,
	mockDocumentWithMissingFilename,
	mockDocumentWithMissingVersion,
	mockMultiVersionDocuments,
	mockSingleVersionDocument
} from './test-data/mock-source-documents.ts';

// Common test constants
const TEST_CASE_ID = 100;
const TEST_FOLDER_ID = 1;
const TEST_CASE_REFERENCE = 'APP/Q9999/D/21/1234567';
const TEST_CONTAINER_NAME = 'appeals-documents';
const TEST_APPEAL_DOCUMENT_TYPE = 'appellantStatement';

// Helper function to assert basic document structure
function assertBasicDocumentStructure(result: any, expectedVersionId: number = 1) {
	assert.strictEqual(result.guid, 'doc-123');
	assert.strictEqual(result.name, 'test-document.pdf');
	assert.strictEqual(result.caseId, TEST_CASE_ID);
	assert.strictEqual(result.folderId, TEST_FOLDER_ID);
	assert.strictEqual(result.isDeleted, false);
	assert.strictEqual(result.latestVersionId, expectedVersionId);
	assert.strictEqual(typeof result.versions, 'object');
	assert.strictEqual(Array.isArray(result.versions.create), true);
}

// Helper function to call mapDocumentToSink with test constants
function mapDocumentWithTestParams(
	mockData: any,
	appealDocumentType: string = TEST_APPEAL_DOCUMENT_TYPE,
	containerName: string = TEST_CONTAINER_NAME
) {
	return mapDocumentToSink(
		mockData,
		TEST_CASE_ID,
		TEST_FOLDER_ID,
		TEST_CASE_REFERENCE,
		containerName,
		appealDocumentType
	);
}

// Helper function to assert complete document version fields
function assertCompleteDocumentVersion(version: any) {
	assert.strictEqual(version.virusCheckStatus, 'scanned');
	assert.strictEqual(version.origin, 'pins');
	assert.strictEqual(version.originalFilename, 'original.pdf');
	assert.strictEqual(version.description, 'Test description');
	assert.strictEqual(version.owner, 'John Doe');
	assert.strictEqual(version.author, 'Jane Smith');
	assert.strictEqual(version.mime, 'application/pdf');
	assert.strictEqual(version.fileMD5, 'abc123');
	assert.strictEqual(version.size, 2048000);
	assert.strictEqual(version.stage, 'appellant-case');
	assert.strictEqual(version.documentURI, 'http://example.com/doc');
}

// Helper function to assert default document version fields
function assertDefaultDocumentVersion(version: any) {
	assert.strictEqual(version.published, false);
	assert.strictEqual(version.draft, true);
	assert.strictEqual(version.sourceSystem, 'horizon');
	assert.strictEqual(version.virusCheckStatus, 'not_scanned');
	assert.strictEqual(version.isDeleted, false);
}

describe('mapDocumentToSink', () => {
	test('should map single version document correctly', () => {
		const result = mapDocumentWithTestParams(mockSingleVersionDocument);

		assertBasicDocumentStructure(result);
		assert.strictEqual(result.versions.create.length, 1);
		assert.strictEqual(result.versions.create[0].version, 1);
		assert.strictEqual(result.versions.create[0].sourceSystem, 'horizon');
		assert.strictEqual(result.versions.create[0].horizonDataID, 'doc-123');
	});

	test('should map multiple versions correctly', () => {
		const result = mapDocumentWithTestParams(mockMultiVersionDocuments);

		assert.strictEqual(result.versions.create.length, 3);
		assert.strictEqual(result.versions.create[0].version, 1);
		assert.strictEqual(result.versions.create[1].version, 2);
		assert.strictEqual(result.versions.create[2].version, 3);
		assert.strictEqual(result.latestVersionId, 3);
	});

	test('should throw error when sourceDocuments array is empty', () => {
		assert.throws(() => mapDocumentWithTestParams([]), {
			name: 'Error',
			message: 'No source documents provided for mapping'
		});
	});

	test('should throw error when documentId is missing', () => {
		assert.throws(() => mapDocumentWithTestParams(mockDocumentWithMissingDocumentId), {
			name: 'Error',
			message: 'Document ID is required'
		});
	});

	test('should throw error when documents have different documentIds', () => {
		const mixedDocuments = [
			{ ...mockSingleVersionDocument[0], documentId: 'doc-123', filename: 'v1.pdf', version: 1 },
			{ ...mockSingleVersionDocument[0], documentId: 'doc-456', filename: 'v2.pdf', version: 2 }
		];
		assert.throws(() => mapDocumentWithTestParams(mixedDocuments), {
			name: 'Error',
			message: 'All source documents must share the same documentId'
		});
	});

	test('should throw error when filename is missing', () => {
		assert.throws(() => mapDocumentWithTestParams(mockDocumentWithMissingFilename), {
			name: 'Error',
			message: 'Document filename is required'
		});
	});

	test('should handle missing version numbers by using index + 1', () => {
		const result = mapDocumentWithTestParams(mockDocumentWithMissingVersion);

		assert.strictEqual(result.versions.create[0].version, 1);
	});

	test('should map optional fields correctly', () => {
		const result = mapDocumentWithTestParams(mockCompleteDocument);
		const version = result.versions.create[0];

		assertCompleteDocumentVersion(version);
	});

	test('should set default values for placeholder fields', () => {
		const result = mapDocumentWithTestParams(mockDocumentWithDefaults);
		const version = result.versions.create[0];

		assertDefaultDocumentVersion(version);
	});

	test('should set blobStorageContainer from config', () => {
		const result = mapDocumentWithTestParams(mockSingleVersionDocument, TEST_APPEAL_DOCUMENT_TYPE, 'test-container');
		const version = result.versions.create[0];

		assert.strictEqual(version.blobStorageContainer, 'test-container');
	});

	test('should use provided appealDocumentType', () => {
		const result = mapDocumentWithTestParams(mockSingleVersionDocument, 'appellantFinalComment');
		const version = result.versions.create[0];

		assert.strictEqual(version.documentType, 'appellantFinalComment');
	});

	test('should sort versions by version number', () => {
		const unsortedDocs = [
			{ ...mockSingleVersionDocument[0], version: 3, filename: 'v3.pdf' },
			{ ...mockSingleVersionDocument[0], version: 1, filename: 'v1.pdf' },
			{ ...mockSingleVersionDocument[0], version: 2, filename: 'v2.pdf' }
		];
		const result = mapDocumentWithTestParams(unsortedDocs);

		assert.strictEqual(result.versions.create[0].version, 1);
		assert.strictEqual(result.versions.create[1].version, 2);
		assert.strictEqual(result.versions.create[2].version, 3);
		assert.strictEqual(result.latestVersionId, 3);
	});
});
