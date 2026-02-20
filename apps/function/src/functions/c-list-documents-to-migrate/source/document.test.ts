// @ts-nocheck
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import { fetchDocumentsByCaseReference } from './document.ts';

type SourceDbMock = {
	appealDocument: {
		findMany: (args: any) => Promise<any[]>;
	};
};

describe('document', () => {
	describe('fetchDocumentsByCaseReference', () => {
		test('queries source DB by caseReference and returns results', async () => {
			const findMany = mock.fn(async () => [
				{ documentId: 'DOC-1', caseReference: 'CASE-1' },
				{ documentId: 'DOC-2', caseReference: 'CASE-1' }
			]);

			const db: SourceDbMock = { appealDocument: { findMany } };

			const result = await fetchDocumentsByCaseReference(db as any, 'CASE-1');

			assert.deepEqual(result, [
				{ documentId: 'DOC-1', caseReference: 'CASE-1' },
				{ documentId: 'DOC-2', caseReference: 'CASE-1' }
			]);

			const callArgs = findMany.mock.calls[0].arguments[0];
			assert.deepEqual(callArgs, {
				where: { caseReference: 'CASE-1' },
				select: { documentId: true, caseReference: true }
			});
		});

		test('filters out rows with null/undefined/empty caseReference defensively', async () => {
			const findMany = mock.fn(async () => [
				{ documentId: 'DOC-1', caseReference: 'CASE-1' },
				{ documentId: 'DOC-NULL', caseReference: null },
				{ documentId: 'DOC-UNDEF', caseReference: undefined },
				{ documentId: 'DOC-EMPTY', caseReference: '' }
			]);

			const db: SourceDbMock = { appealDocument: { findMany } };

			const result = await fetchDocumentsByCaseReference(db as any, 'CASE-1');

			assert.deepEqual(result, [{ documentId: 'DOC-1', caseReference: 'CASE-1' }]);
		});
	});
});
