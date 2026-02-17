// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';
import {
	completeAppealHasCase,
	minimalAppealHasCase,
	decimalAppealHasCase,
	missingReferenceCase,
	missingLPACase,
	caseWithAdvertDetails,
	caseWithNotificationMethods
} from './test-data/appeal-has-samples.ts';
import type { AppealHas } from '@pins/odw-curated-database/src/client/client.ts';

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

	test('maps complex array-based fields correctly', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		// Neighbouring site addresses
		assert.ok(result.neighbouringSites);
		assert.ok(result.neighbouringSites.create);
		assert.strictEqual(result.neighbouringSites.create.length, 2);
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine1, '125 Main Street');
		assert.strictEqual(result.neighbouringSites.create[1].address.create.addressLine1, '127 Main Street');

		// Nearby case references (AppealRelationship)
		assert.ok(result.childAppeals);
		assert.ok(result.childAppeals.create);
		assert.strictEqual(result.childAppeals.create.length, 2);
		assert.strictEqual(result.childAppeals.create[0].type, 'related');
		assert.strictEqual(result.childAppeals.create[0].parentRef, 'CASE-001');
		assert.strictEqual(result.childAppeals.create[0].childRef, 'CASE-100');
		assert.strictEqual(result.childAppeals.create[1].childRef, 'CASE-101');

		// LPA notification methods
		assert.ok(result.lpaQuestionnaire.create.lpaNotificationMethods);
		assert.ok(result.lpaQuestionnaire.create.lpaNotificationMethods.create);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaNotificationMethods.create.length, 1);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[0].lpaNotificationMethod.connect.key,
			'letter'
		);

		// Affected listed buildings
		assert.ok(result.lpaQuestionnaire.create.listedBuildingDetails);
		assert.ok(result.lpaQuestionnaire.create.listedBuildingDetails.create);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create.length, 2);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[0].listEntry, 'LB-001');
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[0].affectsListedBuilding, true);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[1].listEntry, 'LB-002');
	});

	test('parses validation details correctly', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		// Validation outcome
		assert.ok(result.appellantCase.create.appellantCaseValidationOutcome);
		assert.strictEqual(result.appellantCase.create.appellantCaseValidationOutcome.connect.name, 'incomplete');

		// Incomplete reasons parsed
		assert.ok(result.appellantCase.create.appellantCaseIncompleteReasonsSelected);
		assert.ok(result.appellantCase.create.appellantCaseIncompleteReasonsSelected.create);
		assert.strictEqual(result.appellantCase.create.appellantCaseIncompleteReasonsSelected.create.length, 2);

		// First reason: "Documents missing: Site plan not provided"
		const firstReason = result.appellantCase.create.appellantCaseIncompleteReasonsSelected.create[0];
		assert.strictEqual(firstReason.appellantCaseIncompleteReason.connectOrCreate.where.name, 'Documents missing');
		assert.strictEqual(firstReason.appellantCaseIncompleteReason.connectOrCreate.create.name, 'Documents missing');
		assert.ok(firstReason.appellantCaseIncompleteReasonText);
		assert.strictEqual(firstReason.appellantCaseIncompleteReasonText.create[0].text, 'Site plan not provided');

		// Second reason: "Incorrect fee: Payment incomplete"
		const secondReason = result.appellantCase.create.appellantCaseIncompleteReasonsSelected.create[1];
		assert.strictEqual(secondReason.appellantCaseIncompleteReason.connectOrCreate.where.name, 'Incorrect fee');
		assert.strictEqual(secondReason.appellantCaseIncompleteReasonText.create[0].text, 'Payment incomplete');
	});

	test('handles knowledge of owners mappings', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.ok(result.appellantCase.create.knowsOtherOwners);
		assert.strictEqual(result.appellantCase.create.knowsOtherOwners.connect.key, 'Yes');

		assert.ok(result.appellantCase.create.knowsAllOwners);
		assert.strictEqual(result.appellantCase.create.knowsAllOwners.connect.key, 'No');
	});

	test('maps appeal type and procedure type correctly', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.ok(result.appealType);
		assert.strictEqual(result.appealType.connect.key, 'D');

		assert.ok(result.procedureType);
		assert.strictEqual(result.procedureType.connect.key, 'written');
	});

	test('maps user assignments correctly', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		// Case officer
		assert.ok(result.caseOfficer);
		assert.strictEqual(result.caseOfficer.connectOrCreate.where.azureAdUserId, 'officer-123');

		// Inspector
		assert.ok(result.inspector);
		assert.strictEqual(result.inspector.connectOrCreate.where.azureAdUserId, 'inspector-456');

		// PADS inspector
		assert.ok(result.padsInspector);
		assert.strictEqual(result.padsInspector.connectOrCreate.where.sapId, 'SAP-789');
	});

	test('maps allocation details correctly', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.level, 'A');
		assert.strictEqual(result.allocation.create.band, 1);
	});

	test('parses specialisms correctly', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.ok(result.specialisms);
		assert.ok(result.specialisms.create);
		assert.strictEqual(result.specialisms.create.length, 2);
		assert.strictEqual(result.specialisms.create[0].specialism.connectOrCreate.where.name, 'Historic Buildings');
		assert.strictEqual(result.specialisms.create[1].specialism.connectOrCreate.where.name, 'Trees');
	});

	test('maps appeal status with createdAt timestamp', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.ok(result.appealStatus);
		assert.ok(result.appealStatus.create);
		assert.strictEqual(result.appealStatus.create.length, 1);
		assert.strictEqual(result.appealStatus.create[0].status, 'ready_to_start');
		assert.strictEqual(result.appealStatus.create[0].valid, true);
		assert.ok(result.appealStatus.create[0].createdAt instanceof Date);
	});

	test('handles empty and null complex fields gracefully', () => {
		const caseWithNulls: Partial<AppealHas> = {
			caseId: 10,
			caseReference: 'CASE-010',
			lpaCode: 'Q9999',
			nearbyCaseReferences: null,
			neighbouringSiteAddresses: null,
			notificationMethod: null,
			affectedListedBuildingNumbers: null,
			advertDetails: null,
			caseValidationIncompleteDetails: null,
			caseValidationInvalidDetails: null,
			caseSpecialisms: null
		};

		const result = mapSourceToSinkAppeal(caseWithNulls);

		assert.strictEqual(result.neighbouringSites, undefined);
		assert.strictEqual(result.childAppeals, undefined);
		assert.strictEqual(result.specialisms, undefined);
	});

	test('handles empty string complex fields gracefully', () => {
		const caseWithEmptyStrings: Partial<AppealHas> = {
			caseId: 11,
			caseReference: 'CASE-011',
			lpaCode: 'Q9999',
			nearbyCaseReferences: '',
			neighbouringSiteAddresses: '',
			notificationMethod: '',
			affectedListedBuildingNumbers: '',
			advertDetails: '',
			caseValidationIncompleteDetails: '',
			caseValidationInvalidDetails: '',
			caseSpecialisms: ''
		};

		const result = mapSourceToSinkAppeal(caseWithEmptyStrings);

		assert.strictEqual(result.neighbouringSites, undefined);
		assert.strictEqual(result.childAppeals, undefined);
		assert.strictEqual(result.specialisms, undefined);
	});

	test('handles validation details without colons (simple reasons)', () => {
		const caseWithSimpleReasons: Partial<AppealHas> = {
			caseId: 12,
			caseReference: 'CASE-012',
			lpaCode: 'Q9999',
			caseValidationOutcome: 'invalid',
			caseValidationInvalidDetails: 'Missing documents, Incorrect information'
		};

		const result = mapSourceToSinkAppeal(caseWithSimpleReasons);

		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create.appellantCaseInvalidReasonsSelected);
		assert.ok(result.appellantCase.create.appellantCaseInvalidReasonsSelected.create);
		assert.strictEqual(result.appellantCase.create.appellantCaseInvalidReasonsSelected.create.length, 2);
		assert.strictEqual(
			result.appellantCase.create.appellantCaseInvalidReasonsSelected.create[0].appellantCaseInvalidReason
				.connectOrCreate.where.name,
			'Missing documents'
		);
	});

	test('handles advert details as array', () => {
		const result = mapSourceToSinkAppeal(caseWithAdvertDetails);

		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create.appellantCaseAdvertDetails);
		assert.ok(result.appellantCase.create.appellantCaseAdvertDetails.createMany);
		assert.strictEqual(result.appellantCase.create.appellantCaseAdvertDetails.createMany.data.length, 2);
		assert.strictEqual(
			result.appellantCase.create.appellantCaseAdvertDetails.createMany.data[0].advertInPosition,
			true
		);
		assert.strictEqual(result.appellantCase.create.appellantCaseAdvertDetails.createMany.data[0].highwayLand, false);
		assert.strictEqual(
			result.appellantCase.create.appellantCaseAdvertDetails.createMany.data[1].advertInPosition,
			false
		);
		assert.strictEqual(result.appellantCase.create.appellantCaseAdvertDetails.createMany.data[1].highwayLand, true);
	});

	test('handles notification methods as comma-separated string', () => {
		const result = mapSourceToSinkAppeal(caseWithNotificationMethods);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.lpaNotificationMethods);
		assert.ok(result.lpaQuestionnaire.create.lpaNotificationMethods.create);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaNotificationMethods.create.length, 3);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[0].lpaNotificationMethod.connect.key,
			'notice'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[1].lpaNotificationMethod.connect.key,
			'letter'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[2].lpaNotificationMethod.connect.key,
			'advert'
		);
	});

	test('maps all appellant case boolean fields', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.strictEqual(result.appellantCase.create.appellantCostsAppliedFor, false);
		assert.strictEqual(result.appellantCase.create.enforcementNotice, false);
		assert.strictEqual(result.appellantCase.create.ownsAllLand, true);
		assert.strictEqual(result.appellantCase.create.ownsSomeLand, false);
		assert.strictEqual(result.appellantCase.create.hasAdvertisedAppeal, true);
		assert.strictEqual(result.appellantCase.create.ownersInformed, true);
		assert.strictEqual(result.appellantCase.create.landownerPermission, true);
	});

	test('maps all LPA questionnaire boolean fields', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.strictEqual(result.lpaQuestionnaire.create.isCorrectAppealType, true);
		assert.strictEqual(result.lpaQuestionnaire.create.inConservationArea, false);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaCostsAppliedFor, false);
		assert.strictEqual(result.lpaQuestionnaire.create.isGreenBelt, true);
		assert.strictEqual(result.lpaQuestionnaire.create.affectsScheduledMonument, false);
		assert.strictEqual(result.lpaQuestionnaire.create.isAonbNationalLandscape, true);
		assert.strictEqual(result.lpaQuestionnaire.create.hasProtectedSpecies, false);
	});

	test('maps infrastructure levy fields', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.strictEqual(result.lpaQuestionnaire.create.hasInfrastructureLevy, true);
		assert.strictEqual(result.lpaQuestionnaire.create.isInfrastructureLevyFormallyAdopted, true);
		assert.ok(result.lpaQuestionnaire.create.infrastructureLevyAdoptedDate instanceof Date);
	});

	test('maps procedure preference fields', () => {
		const result = mapSourceToSinkAppeal(completeAppealHasCase);

		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreference, 'hearing');
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaProcedurePreferenceDetails,
			'Hearing preferred due to complexity'
		);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDuration, 2);
	});
});
