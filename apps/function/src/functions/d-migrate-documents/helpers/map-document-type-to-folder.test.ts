// @ts-nocheck
import { APPEAL_CASE_STAGE } from '@planning-inspectorate/data-model';
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { mapHorizonDocumentTypeAndFolder } from './map-document-type-to-folder.ts';

describe('mapHorizonDocumentTypeAndFolder', () => {
	test('maps confirmed Horizon types to appellant-case folder', () => {
		const result = mapHorizonDocumentTypeAndFolder('Application Form');
		assert.strictEqual(result.appealDocumentType, 'originalApplicationForm');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.APPELLANT_CASE}/originalApplicationForm`);
	});

	test('maps confirmed Horizon types to lpa-questionnaire folder', () => {
		const result = mapHorizonDocumentTypeAndFolder('Consultation Responses');
		assert.strictEqual(result.appealDocumentType, 'consultationResponses');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.LPA_QUESTIONNAIRE}/consultationResponses`);
	});

	test('maps confirmed Horizon types to costs folder', () => {
		const result = mapHorizonDocumentTypeAndFolder('Costs');
		assert.strictEqual(result.appealDocumentType, 'appellantCostsApplication');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.COSTS}/appellantCostsApplication`);
	});

	test('maps confirmed Horizon types to representation folder', () => {
		const result = mapHorizonDocumentTypeAndFolder("Appellant's Final Comments");
		assert.strictEqual(result.appealDocumentType, 'appellantFinalComment');
		assert.strictEqual(result.folderPath, 'representation/representationAttachments');
	});

	test('maps confirmed Horizon types to internal folder', () => {
		const result = mapHorizonDocumentTypeAndFolder('Main Party Correspondence');
		assert.strictEqual(result.appealDocumentType, 'mainPartyCorrespondence');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.INTERNAL}/mainPartyCorrespondence`);
	});

	test('handles whitespace in Horizon document types', () => {
		const result = mapHorizonDocumentTypeAndFolder('  Application Form  ');
		assert.strictEqual(result.appealDocumentType, 'originalApplicationForm');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.APPELLANT_CASE}/originalApplicationForm`);
	});

	test('defaults unmapped Horizon types to UNCATEGORISED with warning', () => {
		const warnings: string[] = [];
		const mockLogger = {
			warn: (msg: string) => warnings.push(msg)
		};

		const result = mapHorizonDocumentTypeAndFolder('Unknown Document Type', mockLogger);
		assert.strictEqual(result.appealDocumentType, 'uncategorised');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.INTERNAL}/uncategorised`);
		assert.strictEqual(warnings.length, 1);
		assert.ok(warnings[0].includes('Unknown Document Type'));
		assert.ok(warnings[0].includes('UNCATEGORISED'));
	});

	test('works without logger for unmapped types', () => {
		const result = mapHorizonDocumentTypeAndFolder('Unknown Type');
		assert.strictEqual(result.appealDocumentType, 'uncategorised');
		assert.strictEqual(result.folderPath, `${APPEAL_CASE_STAGE.INTERNAL}/uncategorised`);
	});

	test('handles all representation attachment types correctly', () => {
		const representationTypes = [
			"Appellant's Final Comments",
			'Appellant Proof of Evidence',
			'LPA Final Comments',
			'LPA Proof of Evidence',
			'LPA Statement',
			'Rule 6 Statement / Proof'
		];

		representationTypes.forEach((type) => {
			const result = mapHorizonDocumentTypeAndFolder(type);
			assert.strictEqual(result.folderPath, 'representation/representationAttachments', `Failed for type: ${type}`);
		});
	});
});
