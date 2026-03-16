// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
	createAppellantCase,
	createEvent,
	createServiceUser,
	createSink,
	createSource
} from './mock-data/validate-data.ts';
import { validateData } from './validate-data.ts';

const validate = (source, sink, events = [], serviceUsers = []) =>
	validateData({ type: 'has', data: source }, sink, events, serviceUsers).isValid;

describe('validateData', () => {
	test('returns true for fully matching HAS and S78 case', () => {
		assert.strictEqual(validate(createSource(), createSink()), true);
		assert.strictEqual(validateData({ type: 's78', data: createSource() }, createSink(), [], []).isValid, true);
	});

	test('returns false for scalar field mismatch', () => {
		const cases = [
			[createSource({ caseReference: 'WRONG' }), createSink()],
			[createSource(), createSink({ applicationReference: 'WRONG' })],
			[createSource({ caseCreatedDate: '2024-02-01T00:00:00.000Z' }), createSink()],
			[createSource({ caseExtensionDate: '2024-05-15T10:00:00.000Z' }), createSink({ caseExtensionDate: null })]
		];
		for (const [src, snk] of cases) {
			assert.strictEqual(validate(src, snk), false);
		}
	});

	test('validates appealType, procedureType, and lpa', () => {
		assert.strictEqual(validate(createSource({ caseType: 'D' }), createSink({ appealType: { key: 'D' } })), true);
		assert.strictEqual(validate(createSource({ caseType: 'D' }), createSink({ appealType: { key: 'WRONG' } })), false);
		assert.strictEqual(
			validate(createSource({ caseProcedure: 'written' }), createSink({ procedureType: { key: 'WRONG' } })),
			false
		);
		assert.strictEqual(validate(createSource({ lpaCode: 'LPA001' }), createSink({ lpa: { lpaCode: 'WRONG' } })), false);
	});

	test('validates caseOfficer and inspector', () => {
		const source = createSource({ caseOfficerId: 'officer-123', inspectorId: 'inspector-456' });
		const sink = createSink({
			caseOfficer: { azureAdUserId: 'officer-123' },
			inspector: { azureAdUserId: 'inspector-456' }
		});
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink({ caseOfficer: { azureAdUserId: 'WRONG' } })), false);
		assert.strictEqual(validate(source, createSink({ inspector: { azureAdUserId: 'WRONG' } })), false);
	});

	test('handles null/undefined equivalence correctly', () => {
		assert.strictEqual(validate(createSource({ submissionId: null }), createSink({ submissionId: null })), true);
		assert.strictEqual(validate(createSource({ submissionId: null }), createSink({ submissionId: 'SUB-X' })), false);
		assert.strictEqual(
			validate(createSource({ caseExtensionDate: null }), createSink({ caseExtensionDate: null })),
			true
		);
	});

	test('validates appeal timetable', () => {
		const source = createSource({ lpaQuestionnaireDueDate: '2024-03-01T00:00:00.000Z' });
		const sink = createSink({
			appealTimetable: {
				lpaQuestionnaireDueDate: new Date('2024-03-01T00:00:00.000Z'),
				planningObligationDueDate: null,
				finalCommentsDueDate: null,
				ipCommentsDueDate: null,
				proofOfEvidenceAndWitnessesDueDate: null,
				lpaStatementDueDate: null,
				statementOfCommonGroundDueDate: null
			}
		});
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink({ appealTimetable: null })), false);
		assert.strictEqual(validate(createSource(), sink), false);
	});

	test('validates allocation', () => {
		const source = createSource({ allocationLevel: 'A', allocationBand: 1 });
		const sink = createSink({ allocation: { level: 'A', band: 1 } });
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink({ allocation: { level: 'B', band: 1 } })), false);
		assert.strictEqual(validate(createSource(), createSink({ allocation: { level: 'A', band: 1 } })), false);
	});

	test('validates appeal statuses', () => {
		const source = createSource({ caseValidationDate: '2024-01-15T00:00:00.000Z' });
		const sink = createSink({
			appealStatus: [
				{ status: 'new', createdAt: new Date('2024-01-20T14:30:00.000Z') },
				{ status: 'ready_to_start', createdAt: new Date('2024-01-15T00:00:00.000Z') }
			]
		});
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
		assert.strictEqual(validate(createSource(), createSink({ appealStatus: [{ status: 'wrong' }] })), false);
	});

	test('returns false when appeal status createdAt does not match', () => {
		const source = createSource({ caseValidationDate: '2024-01-15T00:00:00.000Z' });
		const sink = createSink({
			appealStatus: [
				{ status: 'new', createdAt: new Date('2024-01-20T14:30:00.000Z') },
				{ status: 'ready_to_start', createdAt: new Date('2099-01-01T00:00:00.000Z') }
			]
		});
		assert.strictEqual(validate(source, sink), false);
	});

	test('validates additional appeal status types', () => {
		const source = createSource({
			lpaQuestionnairePublishedDate: '2024-02-01T00:00:00.000Z',
			caseWithdrawnDate: '2024-02-15T00:00:00.000Z',
			caseTransferredDate: '2024-03-01T00:00:00.000Z',
			transferredCaseClosedDate: '2024-03-15T00:00:00.000Z',
			caseCompletedDate: '2024-04-01T00:00:00.000Z'
		});
		const sink = createSink({
			appealStatus: [
				{ status: 'new', createdAt: new Date('2024-01-20T14:30:00.000Z') },
				{ status: 'event', createdAt: new Date('2024-02-01T00:00:00.000Z') },
				{ status: 'withdrawn', createdAt: new Date('2024-02-15T00:00:00.000Z') },
				{ status: 'transferred', createdAt: new Date('2024-03-01T00:00:00.000Z') },
				{ status: 'closed', createdAt: new Date('2024-03-15T00:00:00.000Z') },
				{ status: 'complete', createdAt: new Date('2024-04-01T00:00:00.000Z') }
			]
		});
		assert.strictEqual(validate(source, sink), true);
	});

	test('validates specialisms', () => {
		const source = createSource({ caseSpecialisms: '["enforcement"]' });
		const sink = createSink({ specialisms: [{ specialism: { name: 'enforcement' } }] });
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
	});

	test('validates address', () => {
		const source = createSource({ siteAddressLine1: '1 Test St' });
		const sink = createSink({
			address: { addressLine1: '1 Test St', addressLine2: null, addressTown: null, addressCounty: null, postcode: null }
		});
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
	});

	test('validates inspector decision', () => {
		const source = createSource({
			caseDecisionOutcome: 'allowed',
			caseDecisionOutcomeDate: '2024-06-01T00:00:00.000Z'
		});
		const sink = createSink({
			inspectorDecision: { outcome: 'allowed', caseDecisionOutcomeDate: new Date('2024-06-01T00:00:00.000Z') }
		});
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
	});

	test('validates appellantCase fields', () => {
		const source = createSource({ siteAccessDetails: 'ring bell' });
		const sink = createSink({ appellantCase: createAppellantCase({ siteAccessDetails: 'ring bell' }) });
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
		assert.strictEqual(validate(createSource(), createSink({ appellantCase: null })), false);
	});

	test('validates child appeals', () => {
		const source = createSource({ nearbyCaseReferences: '["CASE-002"]' });
		const sink = createSink({ childAppeals: [{ childRef: 'CASE-002', parentRef: 'CASE-001' }] });
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
	});

	test('validates neighbouring sites', () => {
		const source = createSource({ neighbouringSiteAddresses: '[{"neighbouringSiteAddressLine1":"2 High St"}]' });
		const sink = createSink({ neighbouringSites: [{ address: { addressLine1: '2 High St' } }] });
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
	});

	test('validates lpaQuestionnaire', () => {
		const source = createSource({ lpaStatement: 'We object', isCorrectAppealType: true });
		const lpaQuestionnaire = {
			lpaQuestionnaireSubmittedDate: null,
			lpaStatement: 'We object',
			lpaProcedurePreference: null,
			importantInformation: null,
			isCorrectAppealType: true,
			inConservationArea: null,
			targetDate: null,
			lpaNotificationMethods: [],
			listedBuildingDetails: [],
			designatedSiteNames: []
		};
		assert.strictEqual(validate(source, createSink({ lpaQuestionnaire })), true);
		assert.strictEqual(validate(source, createSink()), false);
		assert.strictEqual(
			validate(source, createSink({ lpaQuestionnaire: { ...lpaQuestionnaire, lpaStatement: 'WRONG' } })),
			false
		);
	});

	test('validates lpaQuestionnaire notification methods', () => {
		const source = createSource({ lpaStatement: 'note', notificationMethod: '["site-notice"]' });
		const lpaQuestionnaire = {
			lpaQuestionnaireSubmittedDate: null,
			lpaStatement: 'note',
			lpaProcedurePreference: null,
			importantInformation: null,
			isCorrectAppealType: null,
			inConservationArea: null,
			targetDate: null,
			lpaNotificationMethods: [{ lpaNotificationMethod: { key: 'site-notice' } }],
			listedBuildingDetails: [],
			designatedSiteNames: []
		};
		assert.strictEqual(validate(source, createSink({ lpaQuestionnaire })), true);
		assert.strictEqual(
			validate(source, createSink({ lpaQuestionnaire: { ...lpaQuestionnaire, lpaNotificationMethods: [] } })),
			false
		);
	});

	test('validates representations (S78 only)', () => {
		const source = createSource({ appellantStatementSubmittedDate: '2024-04-01T00:00:00.000Z' });
		const sink = createSink({ representations: [{ representationType: 'appellant_statement' }] });
		assert.strictEqual(validateData({ type: 's78', data: source }, sink, [], []).isValid, true);
		assert.strictEqual(validateData({ type: 's78', data: source }, createSink(), [], []).isValid, false);
		assert.strictEqual(validate(createSource(), sink), false);
	});

	test('validates appeal grounds (S78 only)', () => {
		const source = createSource({
			enforcementAppealGroundsDetails: '[{"appealGroundLetter":"a","groundFacts":"test facts"}]'
		});
		const sink = createSink({ appealGrounds: [{ ground: { groundRef: 'a' }, factsForGround: 'test facts' }] });
		assert.strictEqual(validateData({ type: 's78', data: source }, sink, [], []).isValid, true);
		assert.strictEqual(validateData({ type: 's78', data: source }, createSink(), [], []).isValid, false);
		assert.strictEqual(validate(createSource(), sink), false);
	});

	test('validates hearing event', () => {
		const event = createEvent({ eventType: 'hearing', eventStartDateTime: '2024-07-01T10:00:00.000Z' });
		const sink = createSink({
			hearing: { hearingStartTime: new Date('2024-07-01T10:00:00.000Z'), hearingEndTime: null, address: null }
		});
		assert.strictEqual(validate(createSource(), sink, [event]), true);
		assert.strictEqual(validate(createSource(), createSink(), [event]), false);
	});

	test('validates hearing event with end time and address', () => {
		const event = createEvent({
			eventType: 'hearing',
			eventStartDateTime: '2024-07-01T10:00:00.000Z',
			eventEndDateTime: '2024-07-01T16:00:00.000Z',
			addressLine1: '1 Court St',
			addressTown: 'Bristol',
			addressPostcode: 'BS1 1AA'
		});
		const sink = createSink({
			hearing: {
				hearingStartTime: new Date('2024-07-01T10:00:00.000Z'),
				hearingEndTime: new Date('2024-07-01T16:00:00.000Z'),
				address: {
					addressLine1: '1 Court St',
					addressLine2: null,
					addressTown: 'Bristol',
					addressCounty: null,
					postcode: 'BS1 1AA'
				}
			}
		});
		assert.strictEqual(validate(createSource(), sink, [event]), true);
		assert.strictEqual(
			validate(
				createSource(),
				createSink({
					hearing: {
						hearingStartTime: new Date('2024-07-01T10:00:00.000Z'),
						hearingEndTime: new Date('2024-07-01T16:00:00.000Z'),
						address: {
							addressLine1: 'WRONG',
							addressLine2: null,
							addressTown: 'Bristol',
							addressCounty: null,
							postcode: 'BS1 1AA'
						}
					}
				}),
				[event]
			),
			false
		);
	});

	test('validates inquiry event', () => {
		const event = createEvent({ eventType: 'inquiry', eventStartDateTime: '2024-08-01T10:00:00.000Z' });
		const sink = createSink({
			inquiry: { inquiryStartTime: new Date('2024-08-01T10:00:00.000Z'), inquiryEndTime: null, address: null }
		});
		assert.strictEqual(validate(createSource(), sink, [event]), true);
		assert.strictEqual(validate(createSource(), createSink(), [event]), false);
	});

	test('returns false when event end time does not match', () => {
		const event = createEvent({
			eventType: 'hearing',
			eventStartDateTime: '2024-07-01T10:00:00.000Z',
			eventEndDateTime: '2024-07-01T16:00:00.000Z'
		});
		const sink = createSink({
			hearing: {
				hearingStartTime: new Date('2024-07-01T10:00:00.000Z'),
				hearingEndTime: new Date('2099-01-01T00:00:00.000Z'),
				address: null
			}
		});
		assert.strictEqual(validate(createSource(), sink, [event]), false);
	});

	test('validates site visit event', () => {
		const event = createEvent({ eventType: 'site_visit_accompanied', eventStartDateTime: '2024-07-15T09:00:00.000Z' });
		const sink = createSink({
			siteVisit: {
				visitDate: new Date('2024-07-15T09:00:00.000Z'),
				visitStartTime: new Date('2024-07-15T09:00:00.000Z'),
				visitEndTime: null
			}
		});
		assert.strictEqual(validate(createSource(), sink, [event]), true);
		assert.strictEqual(validate(createSource(), createSink(), [event]), false);
	});

	test('returns false when sink has events but source has none', () => {
		const source = createSource();
		assert.strictEqual(
			validate(
				source,
				createSink({ hearing: { hearingStartTime: new Date('2024-07-01T10:00:00.000Z'), hearingEndTime: null } }),
				[]
			),
			false
		);
		assert.strictEqual(
			validate(
				source,
				createSink({ inquiry: { inquiryStartTime: new Date('2024-08-01T10:00:00.000Z'), inquiryEndTime: null } }),
				[]
			),
			false
		);
		assert.strictEqual(
			validate(
				source,
				createSink({
					siteVisit: {
						visitDate: new Date('2024-07-15T09:00:00.000Z'),
						visitStartTime: new Date('2024-07-15T09:00:00.000Z'),
						visitEndTime: null
					}
				}),
				[]
			),
			false
		);
	});

	test('validates service users (appellant and agent)', () => {
		const appellantUser = createServiceUser({
			serviceUserType: 'Appellant',
			firstName: 'Jane',
			lastName: 'Doe',
			emailAddress: 'jane@example.com'
		});
		const sink = createSink({
			appellant: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phoneNumber: null, address: null }
		});
		assert.strictEqual(validate(createSource(), sink, [], [appellantUser]), true);
		assert.strictEqual(validate(createSource(), createSink(), [], [appellantUser]), false);
		assert.strictEqual(validate(createSource(), sink, [], []), false);
	});

	test('validates service user address', () => {
		const appellantUser = createServiceUser({
			serviceUserType: 'Appellant',
			firstName: 'Jane',
			lastName: 'Doe',
			addressLine1: '10 Main St',
			addressTown: 'London',
			postcode: 'SW1A 1AA'
		});
		const sink = createSink({
			appellant: {
				firstName: 'Jane',
				lastName: 'Doe',
				email: null,
				phoneNumber: null,
				address: {
					addressLine1: '10 Main St',
					addressLine2: null,
					addressTown: 'London',
					addressCounty: null,
					postcode: 'SW1A 1AA',
					addressCountry: 'United Kingdom'
				}
			}
		});
		assert.strictEqual(validate(createSource(), sink, [], [appellantUser]), true);
		assert.strictEqual(
			validate(
				createSource(),
				createSink({
					appellant: {
						firstName: 'Jane',
						lastName: 'Doe',
						email: null,
						phoneNumber: null,
						address: {
							addressLine1: 'WRONG',
							addressLine2: null,
							addressTown: 'London',
							addressCounty: null,
							postcode: 'SW1A 1AA',
							addressCountry: 'United Kingdom'
						}
					}
				}),
				[],
				[appellantUser]
			),
			false
		);
	});

	test('validates interested party service users', () => {
		const interestedParty = createServiceUser({
			serviceUserType: 'InterestedParty',
			firstName: 'Alice',
			lastName: 'Smith',
			emailAddress: 'alice@example.com'
		});
		const sink = createSink({
			representations: [
				{
					representationType: 'comment',
					represented: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }
				}
			]
		});
		assert.strictEqual(validate(createSource(), sink, [], [interestedParty]), true);
		assert.strictEqual(validate(createSource(), createSink(), [], [interestedParty]), false);
	});

	test('validates rule 6 party service users', () => {
		const rule6Party = createServiceUser({
			serviceUserType: 'Rule6Party',
			firstName: 'Bob',
			lastName: 'Jones',
			emailAddress: 'bob@example.com'
		});
		const sink = createSink({
			appealRule6Parties: [{ serviceUser: { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' } }]
		});
		assert.strictEqual(validate(createSource(), sink, [], [rule6Party]), true);
		assert.strictEqual(validate(createSource(), createSink(), [], [rule6Party]), false);
	});

	test('validates padsInspector', () => {
		const source = createSource({ padsSapId: 'SAP-123' });
		const sink = createSink({ padsInspector: { sapId: 'SAP-123' } });
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink({ padsInspector: { sapId: 'WRONG' } })), false);
	});

	test('validates parentAppeals for linked child case', () => {
		const source = createSource({ linkedCaseStatus: 'child', leadCaseReference: 'PARENT-001' });
		const sink = createSink({
			parentAppeals: [{ parentRef: 'PARENT-001', childRef: 'CASE-001' }]
		});
		assert.strictEqual(validate(source, sink), true);
		assert.strictEqual(validate(source, createSink()), false);
		assert.strictEqual(
			validate(source, createSink({ parentAppeals: [{ parentRef: 'WRONG', childRef: 'CASE-001' }] })),
			false
		);
	});

	test('collects detailed validation errors', () => {
		const source = createSource({ caseReference: 'APP/123', caseType: 'Householder' });
		const sink = createSink({ reference: 'APP/456', appealType: { key: 'Full' } });

		const result = validateData({ type: 'has', data: source }, sink);

		assert.strictEqual(result.isValid, false);
		assert.strictEqual(result.dataValidated, false);
		assert.ok(result.errors.length > 0);

		// Check specific error details
		const referenceError = result.errors.find((e) => e.sourceField === 'caseReference');
		assert.ok(referenceError);
		assert.strictEqual(referenceError.sourceModel, 'AppealHas');
		assert.ok(referenceError.error.includes('APP/123'));
		assert.ok(referenceError.error.includes('APP/456'));

		const typeError = result.errors.find((e) => e.sourceField === 'caseType');
		assert.ok(typeError);
		assert.strictEqual(typeError.sourceModel, 'AppealHas');
		assert.ok(typeError.error.includes('Householder'));
		assert.ok(typeError.error.includes('Full'));
	});

	test('returns success result with no errors for valid data', () => {
		const result = validateData({ type: 'has', data: createSource() }, createSink());

		assert.strictEqual(result.isValid, true);
		assert.strictEqual(result.dataValidated, true);
		assert.strictEqual(result.errors.length, 0);
	});
});
