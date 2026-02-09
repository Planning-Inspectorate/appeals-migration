// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';

describe('mapSourceToSinkAppeal', () => {
	test('throws error for missing required fields', () => {
		assert.throws(() => mapSourceToSinkAppeal({ caseReference: null, lpaCode: 'Q9999' }), {
			message: 'caseReference is required for appeal migration'
		});

		assert.throws(() => mapSourceToSinkAppeal({ caseReference: 'CASE-001', lpaCode: null }), {
			message: 'lpaCode is required for appeal migration'
		});
	});

	test('maps complete AppealHas case to sink database structure', () => {
		const sourceCase = {
			caseId: 1,
			caseReference: 'CASE-001',
			lpaCode: 'Q9999',
			applicationReference: 'APP-001',
			caseCreatedDate: '2024-01-01T00:00:00Z',
			caseUpdatedDate: '2024-01-02T00:00:00Z',
			caseValidDate: '2024-01-03T00:00:00Z',
			caseStartedDate: '2024-01-04T00:00:00Z',
			casePublishedDate: '2024-01-05T00:00:00Z',
			caseCompletedDate: '2024-01-06T00:00:00Z',
			caseWithdrawnDate: '2024-01-07T00:00:00Z',

			// Address fields
			siteAddressLine1: '123 Main Street',
			siteAddressLine2: 'Apartment 4B',
			siteAddressTown: 'Bristol',
			siteAddressCounty: 'Bristol',
			siteAddressPostcode: 'BS1 1AA',

			// AppellantCase fields
			applicationDate: '2024-01-01T00:00:00Z',
			applicationDecision: 'refused',
			applicationDecisionDate: '2024-01-15T00:00:00Z',
			siteAccessDetails: 'Gate at front',
			siteSafetyDetails: 'Watch for dog',
			siteAreaSquareMetres: 100.5,
			floorSpaceSquareMetres: 50.25,
			ownsAllLand: true,
			ownsSomeLand: false,
			advertisedAppeal: true,
			ownersInformed: true,
			originalDevelopmentDescription: 'Extension to house',
			changedDevelopmentDescription: false,
			appellantCostsAppliedFor: false,
			enforcementNotice: false,
			isGreenBelt: true,
			siteGridReferenceEasting: '123456',
			siteGridReferenceNorthing: '654321',
			caseworkReason: 'Complex case',
			jurisdiction: 'England',
			typeOfPlanningApplication: 'full',

			// LPAQuestionnaire fields
			lpaQuestionnaireSubmittedDate: '2024-01-10T00:00:00Z',
			lpaQuestionnaireCreatedDate: '2024-01-09T00:00:00Z',
			lpaStatement: 'LPA statement text',
			newConditionDetails: 'New conditions',
			isCorrectAppealType: true,
			inConservationArea: false,
			lpaCostsAppliedFor: false,
			affectsScheduledMonument: false,
			isAonbNationalLandscape: true,
			hasProtectedSpecies: false,
			hasInfrastructureLevy: true,
			isInfrastructureLevyFormallyAdopted: true,
			infrastructureLevyAdoptedDate: '2023-06-01T00:00:00Z',
			lpaProcedurePreference: 'hearing',
			lpaProcedurePreferenceDuration: 2,
			reasonForNeighbourVisits: 'Impact on neighbours',

			// InspectorDecision fields
			caseDecisionOutcome: 'allowed',
			caseDecisionOutcomeDate: '2024-02-01T00:00:00Z'
		};

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
		const minimalCase = {
			caseId: 1,
			caseReference: 'CASE-002',
			lpaCode: 'Q8888',
			caseCreatedDate: 'invalid-date',
			caseUpdatedDate: null
		};

		const result = mapSourceToSinkAppeal(minimalCase);

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
		const decimalCase = {
			caseId: 2,
			caseReference: 'CASE-003',
			lpaCode: 'Q7777',
			siteAreaSquareMetres: '150.75',
			floorSpaceSquareMetres: null
		};

		const decimalResult = mapSourceToSinkAppeal(decimalCase);
		assert.strictEqual(decimalResult.appellantCase.create.siteAreaSquareMetres, 150.75);
		assert.strictEqual(decimalResult.appellantCase.create.floorSpaceSquareMetres, undefined);
	});
});
