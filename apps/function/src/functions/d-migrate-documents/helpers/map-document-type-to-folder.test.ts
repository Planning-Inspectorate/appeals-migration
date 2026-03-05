// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
	getFolderPathForDocumentType,
	isRepresentationAttachment,
	REPRESENTATION_ATTACHMENT_TYPES
} from './map-document-type-to-folder.ts';

describe('getFolderPathForDocumentType', () => {
	test('returns correct folder path for representation attachment types', () => {
		assert.strictEqual(
			getFolderPathForDocumentType('appellantFinalComment'),
			'representation/representationAttachments'
		);
		assert.strictEqual(getFolderPathForDocumentType('lpaProofOfEvidence'), 'representation/representationAttachments');
		assert.strictEqual(getFolderPathForDocumentType('rule6Statement'), 'representation/representationAttachments');
	});

	test('returns undefined for document types without confirmed mapping', () => {
		assert.strictEqual(getFolderPathForDocumentType('appellantWitnessesEvidence'), undefined);
		assert.strictEqual(getFolderPathForDocumentType('conservationDocuments'), undefined);
		assert.strictEqual(getFolderPathForDocumentType('delegatedReport'), undefined);
	});

	test('returns undefined for null or undefined document type', () => {
		assert.strictEqual(getFolderPathForDocumentType(null), undefined);
		assert.strictEqual(getFolderPathForDocumentType(undefined), undefined);
	});

	test('returns undefined for unknown document type', () => {
		assert.strictEqual(getFolderPathForDocumentType('unknownDocumentType'), undefined);
	});

	test('handles all confirmed representation attachment types', () => {
		REPRESENTATION_ATTACHMENT_TYPES.forEach((type) => {
			assert.strictEqual(
				getFolderPathForDocumentType(type),
				'representation/representationAttachments',
				`Failed for type: ${type}`
			);
		});
	});
});

describe('isRepresentationAttachment', () => {
	test('returns true for representation attachment types', () => {
		assert.strictEqual(isRepresentationAttachment('appellantFinalComment'), true);
		assert.strictEqual(isRepresentationAttachment('lpaProofOfEvidence'), true);
		assert.strictEqual(isRepresentationAttachment('interestedPartyComment'), true);
	});

	test('returns false for non-representation attachment types', () => {
		assert.strictEqual(isRepresentationAttachment('appellantWitnessesEvidence'), false);
		assert.strictEqual(isRepresentationAttachment('conservationDocuments'), false);
		assert.strictEqual(isRepresentationAttachment('unknownType'), false);
	});

	test('returns false for null or undefined', () => {
		assert.strictEqual(isRepresentationAttachment(null), false);
		assert.strictEqual(isRepresentationAttachment(undefined), false);
	});
});
