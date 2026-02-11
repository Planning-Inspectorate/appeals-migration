// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';
import {
	completeAppealHasCase,
	minimalAppealHasCase,
	decimalAppealHasCase,
	missingReferenceCase,
	missingLPACase
} from './test-data/appeal-has-samples.ts';

describe('mapSourceToSinkAppeal', () => {
	test('throws error for missing required fields', () => {
		assert.throws(() => mapSourceToSinkAppeal(missingReferenceCase), {
			message: 'caseReference is required for appeal migration'
		});

		assert.throws(() => mapSourceToSinkAppeal(missingLPACase), {
			message: 'lpaCode is required for appeal migration'
		});
	});

	test('maps complete AppealHas case to sink database structure', () => {
		const sourceCase = completeAppealHasCase;

		const result = mapSourceToSinkAppeal(sourceCase);

		// Core Appeal fields
		assert.strictEqual(result.reference, 'CASE-001');
		assert.strictEqual(result.applicationReference, 'APP-001');
		assert.deepStrictEqual(result.lpa, { connect: { lpaCode: 'Q9999' } });
		assert.ok(result.caseCreatedDate instanceof Date);
		assert.ok(result.caseUpdatedDate instanceof Date);
		assert.ok(result.withdrawalRequestDate instanceof Date);

		// Address relation
		assert.ok(result.address);
		assert.strictEqual(result.address.create.addressLine1, '123 Main Street');
		assert.strictEqual(result.address.create.postcode, 'BS1 1AA');

		// AppellantCase relation
		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create.applicationDate instanceof Date);
		assert.strictEqual(result.appellantCase.create.applicationDecision, 'refused');
		assert.strictEqual(result.appellantCase.create.siteAreaSquareMetres, 100.5);
		assert.strictEqual(result.appellantCase.create.ownsAllLand, true);
		assert.strictEqual(result.appellantCase.create.typeOfPlanningApplication, 'full');

		// LPAQuestionnaire relation
		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.lpaQuestionnaireSubmittedDate instanceof Date);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaStatement, 'LPA statement text');
		assert.strictEqual(result.lpaQuestionnaire.create.affectsScheduledMonument, false);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDuration, 2);

		// InspectorDecision relation
		assert.ok(result.inspectorDecision);
		assert.strictEqual(result.inspectorDecision.create.outcome, 'allowed');
		assert.ok(result.inspectorDecision.create.caseDecisionOutcomeDate instanceof Date);
	});

	test('handles optional fields gracefully', () => {
		const result = mapSourceToSinkAppeal(minimalAppealHasCase);

		// Required fields still work
		assert.strictEqual(result.reference, 'CASE-002');
		assert.deepStrictEqual(result.lpa, { connect: { lpaCode: 'Q8888' } });

		// Optional relations not created when no data
		assert.strictEqual(result.address, undefined);
		assert.ok(result.inspectorDecision === undefined);

		// Invalid dates handled gracefully
		assert.strictEqual(result.caseCreatedDate, undefined);
		assert.strictEqual(result.caseUpdatedDate, undefined);

		// Decimal parsing
		const decimalResult = mapSourceToSinkAppeal(decimalAppealHasCase);
		assert.strictEqual(decimalResult.appellantCase.create.siteAreaSquareMetres, 150.75);
		assert.strictEqual(decimalResult.appellantCase.create.floorSpaceSquareMetres, undefined);
	});
});
