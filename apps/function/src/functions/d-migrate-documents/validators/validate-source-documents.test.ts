// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
	mockDocumentsWithDifferentIds,
	mockDocumentsWithMissingFilenameOnVersion,
	mockDocumentWithMissingCaseReference,
	mockDocumentWithMissingDocumentId,
	mockDocumentWithMissingFilename,
	mockMultipleValidVersions,
	mockValidDocuments
} from './test-data/mock-source-documents.ts';
import { validateSourceDocuments } from './validate-source-documents.ts';

describe('validateSourceDocuments', () => {
	test('should pass validation for valid documents', () => {
		assert.doesNotThrow(() => validateSourceDocuments(mockValidDocuments, 'doc-123'));
	});

	test('should throw error when no documents provided', () => {
		assert.throws(() => validateSourceDocuments([], 'doc-123'), {
			message: 'No documents found for documentId: doc-123'
		});
	});

	test('should throw error when caseReference is missing', () => {
		const documents = [mockDocumentWithMissingCaseReference];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 is missing caseReference'
		});
	});

	test('should throw error when filename is missing on first document', () => {
		const documents = [mockDocumentWithMissingFilename];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 is missing filename'
		});
	});

	test('should throw error when documentId is missing', () => {
		const documents = [mockDocumentWithMissingDocumentId];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 is missing documentId'
		});
	});

	test('should throw error when documents have different documentIds', () => {
		assert.throws(() => validateSourceDocuments(mockDocumentsWithDifferentIds, 'doc-123'), {
			message: 'All source documents must share the same documentId for document doc-123'
		});
	});

	test('should throw error when any version is missing filename', () => {
		assert.throws(() => validateSourceDocuments(mockDocumentsWithMissingFilenameOnVersion, 'doc-123'), {
			message: 'Document doc-123 version at index 1 is missing filename'
		});
	});

	test('should pass validation for multiple valid versions', () => {
		assert.doesNotThrow(() => validateSourceDocuments(mockMultipleValidVersions, 'doc-123'));
	});
});
