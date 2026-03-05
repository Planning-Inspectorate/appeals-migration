// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
	getFolderPathForDocumentType,
	isRepresentationAttachment,
	mapHorizonToAppealDocumentType
} from './map-document-type-to-folder.ts';

describe('getFolderPathForDocumentType', () => {
	test('returns correct folder path for representation attachment types', () => {
		assert.strictEqual(
			getFolderPathForDocumentType('Appellant Final Comment'),
			'representation/representationAttachments'
		);
		assert.strictEqual(
			getFolderPathForDocumentType('LPA Proof of Evidence'),
			'representation/representationAttachments'
		);
		assert.strictEqual(getFolderPathForDocumentType('Rule 6 Statement'), 'representation/representationAttachments');
	});

	test('returns undefined for Horizon document types without confirmed mapping', () => {
		assert.strictEqual(getFolderPathForDocumentType('Appellant Witnesses Evidence'), undefined);
		assert.strictEqual(getFolderPathForDocumentType('Conservation Documents'), undefined);
		assert.strictEqual(getFolderPathForDocumentType('Delegated Report'), undefined);
	});

	test('returns undefined for null or undefined document type', () => {
		assert.strictEqual(getFolderPathForDocumentType(null), undefined);
		assert.strictEqual(getFolderPathForDocumentType(undefined), undefined);
	});

	test('returns undefined for unknown document type', () => {
		assert.strictEqual(getFolderPathForDocumentType('unknownDocumentType'), undefined);
	});

	test('handles all confirmed Horizon representation attachment types', () => {
		const horizonRepresentationTypes = [
			'Appellant Final Comment',
			'Appellant Proof of Evidence',
			'Interested Party Comment',
			'LPA Final Comment',
			'LPA Proof of Evidence',
			'LPA Statement',
			'Rule 6 Proof of Evidence',
			'Rule 6 Statement',
			'Rule 6 Witnesses Evidence'
		];

		horizonRepresentationTypes.forEach((type) => {
			assert.strictEqual(
				getFolderPathForDocumentType(type),
				'representation/representationAttachments',
				`Failed for type: ${type}`
			);
		});
	});
});

describe('mapHorizonToAppealDocumentType', () => {
	test('maps Horizon document types to APPEAL_DOCUMENT_TYPE constants', () => {
		assert.strictEqual(mapHorizonToAppealDocumentType('Appellant Final Comment'), 'appellantFinalComment');
		assert.strictEqual(mapHorizonToAppealDocumentType('LPA Proof of Evidence'), 'lpaProofOfEvidence');
		assert.strictEqual(mapHorizonToAppealDocumentType('Rule 6 Statement'), 'rule6Statement');
	});

	test('returns undefined for unmapped Horizon document types', () => {
		assert.strictEqual(mapHorizonToAppealDocumentType('Unknown Type'), undefined);
		assert.strictEqual(mapHorizonToAppealDocumentType('Appellant Witnesses Evidence'), undefined);
	});

	test('returns undefined for null or undefined', () => {
		assert.strictEqual(mapHorizonToAppealDocumentType(null), undefined);
		assert.strictEqual(mapHorizonToAppealDocumentType(undefined), undefined);
	});
});

describe('isRepresentationAttachment', () => {
	test('returns true for Horizon representation attachment types', () => {
		assert.strictEqual(isRepresentationAttachment('Appellant Final Comment'), true);
		assert.strictEqual(isRepresentationAttachment('LPA Proof of Evidence'), true);
		assert.strictEqual(isRepresentationAttachment('Interested Party Comment'), true);
	});

	test('returns false for non-representation attachment types', () => {
		assert.strictEqual(isRepresentationAttachment('Appellant Witnesses Evidence'), false);
		assert.strictEqual(isRepresentationAttachment('Conservation Documents'), false);
		assert.strictEqual(isRepresentationAttachment('Unknown Type'), false);
	});

	test('returns false for null or undefined', () => {
		assert.strictEqual(isRepresentationAttachment(null), false);
		assert.strictEqual(isRepresentationAttachment(undefined), false);
	});
});
