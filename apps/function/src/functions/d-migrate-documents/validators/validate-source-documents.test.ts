// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { validateSourceDocuments } from './validate-source-documents.ts';

describe('validateSourceDocuments', () => {
	test('should pass validation for valid documents', () => {
		const validDocuments = [
			{
				documentId: 'doc-123',
				filename: 'test.pdf',
				caseReference: 'APP/123',
				version: 1,
				sourceSystem: 'horizon'
			}
		];

		assert.doesNotThrow(() => validateSourceDocuments(validDocuments, 'doc-123'));
	});

	test('should throw error when no documents provided', () => {
		assert.throws(() => validateSourceDocuments([], 'doc-123'), {
			message: 'No documents found for documentId: doc-123'
		});
	});

	test('should throw error when caseReference is missing', () => {
		const documents = [
			{
				documentId: 'doc-123',
				filename: 'test.pdf',
				caseReference: null,
				version: 1,
				sourceSystem: 'horizon'
			}
		];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 is missing caseReference'
		});
	});

	test('should throw error when filename is missing on first document', () => {
		const documents = [
			{
				documentId: 'doc-123',
				filename: null,
				caseReference: 'APP/123',
				version: 1,
				sourceSystem: 'horizon'
			}
		];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 is missing filename'
		});
	});

	test('should throw error when documentId is missing', () => {
		const documents = [
			{
				documentId: null,
				filename: 'test.pdf',
				caseReference: 'APP/123',
				version: 1,
				sourceSystem: 'horizon'
			}
		];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 is missing documentId'
		});
	});

	test('should throw error when documents have different documentIds', () => {
		const documents = [
			{
				documentId: 'doc-123',
				filename: 'v1.pdf',
				caseReference: 'APP/123',
				version: 1,
				sourceSystem: 'horizon'
			},
			{
				documentId: 'doc-456',
				filename: 'v2.pdf',
				caseReference: 'APP/123',
				version: 2,
				sourceSystem: 'horizon'
			}
		];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'All source documents must share the same documentId for document doc-123'
		});
	});

	test('should throw error when any version is missing filename', () => {
		const documents = [
			{
				documentId: 'doc-123',
				filename: 'v1.pdf',
				caseReference: 'APP/123',
				version: 1,
				sourceSystem: 'horizon'
			},
			{
				documentId: 'doc-123',
				filename: null,
				caseReference: 'APP/123',
				version: 2,
				sourceSystem: 'horizon'
			}
		];

		assert.throws(() => validateSourceDocuments(documents, 'doc-123'), {
			message: 'Document doc-123 version at index 1 is missing filename'
		});
	});

	test('should pass validation for multiple valid versions', () => {
		const documents = [
			{
				documentId: 'doc-123',
				filename: 'v1.pdf',
				caseReference: 'APP/123',
				version: 1,
				sourceSystem: 'horizon'
			},
			{
				documentId: 'doc-123',
				filename: 'v2.pdf',
				caseReference: 'APP/123',
				version: 2,
				sourceSystem: 'horizon'
			}
		];

		assert.doesNotThrow(() => validateSourceDocuments(documents, 'doc-123'));
	});
});
