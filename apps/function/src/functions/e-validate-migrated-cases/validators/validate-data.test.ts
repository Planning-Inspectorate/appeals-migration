// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { ZERO_DATE } from '../../shared/helpers/date.ts';
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
		const sink = createSink({
			appellantCase: createAppellantCase({ siteAccessDetails: 'ring bell', applicationDate: ZERO_DATE })
		});
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
		assert.strictEqual(result.errors.length, 0);
	});

	describe('validateAppealTimetable errors', () => {
		// ...existing tests...
	});

	describe('validateAllocation errors', () => {
		test('reports missing allocation when source has data', () => {
			const source = createSource({ allocationLevel: 'A', allocationBand: 1 });
			const result = validateData({ type: 'has', data: source }, createSink({ allocation: null }));

			const allocationErrors = result.errors.filter((e) => e.sourceField === 'allocation');
			assert.ok(allocationErrors.length > 0);
			assert.ok(allocationErrors.some((e) => e.error.includes('missing in sink')));
		});

		test('reports unexpected allocation when source has no data', () => {
			const result = validateData(
				{ type: 'has', data: createSource() },
				createSink({ allocation: { level: 'A', band: 1 } })
			);

			const allocationErrors = result.errors.filter((e) => e.sourceField === 'allocation');
			assert.ok(allocationErrors.length > 0);
			assert.ok(allocationErrors.some((e) => e.error.includes('exists in sink')));
		});

		test('reports level mismatch', () => {
			const source = createSource({ allocationLevel: 'A', allocationBand: 1 });
			const result = validateData({ type: 'has', data: source }, createSink({ allocation: { level: 'B', band: 1 } }));

			const allocationErrors = result.errors.filter((e) => e.sourceField === 'allocation');
			assert.ok(
				allocationErrors.some((e) => e.error.includes('level') && e.error.includes("'A'") && e.error.includes("'B'"))
			);
		});

		test('reports band mismatch', () => {
			const source = createSource({ allocationLevel: 'A', allocationBand: 1 });
			const result = validateData({ type: 'has', data: source }, createSink({ allocation: { level: 'A', band: 2 } }));

			const allocationErrors = result.errors.filter((e) => e.sourceField === 'allocation');
			assert.ok(allocationErrors.some((e) => e.error.includes('band')));
		});

		test('no errors when allocation matches', () => {
			const source = createSource({ allocationLevel: 'A', allocationBand: 1 });
			const result = validateData({ type: 'has', data: source }, createSink({ allocation: { level: 'A', band: 1 } }));

			const allocationErrors = result.errors.filter((e) => e.sourceField === 'allocation');
			assert.strictEqual(allocationErrors.length, 0);
		});
	});

	describe('validateAddress errors', () => {
		test('reports missing address when source has data', () => {
			const source = createSource({ siteAddressLine1: '1 Test St' });
			const result = validateData({ type: 'has', data: source }, createSink({ address: null }));

			const addressErrors = result.errors.filter((e) => e.sourceField === 'address');
			assert.ok(addressErrors.length > 0);
			assert.ok(addressErrors.some((e) => e.error.includes('missing in sink')));
		});

		test('reports unexpected address when source has no data', () => {
			const result = validateData(
				{ type: 'has', data: createSource() },
				createSink({
					address: {
						addressLine1: '1 Test St',
						addressLine2: null,
						addressTown: null,
						addressCounty: null,
						postcode: null
					}
				})
			);

			const addressErrors = result.errors.filter((e) => e.sourceField === 'address');
			assert.ok(addressErrors.length > 0);
			assert.ok(addressErrors.some((e) => e.error.includes('exists in sink')));
		});

		test('reports specific field mismatches', () => {
			const source = createSource({
				siteAddressLine1: '1 Test St',
				siteAddressTown: 'London',
				siteAddressPostcode: 'SW1A 1AA'
			});
			const sink = createSink({
				address: {
					addressLine1: '1 Test St',
					addressLine2: null,
					addressTown: 'Bristol',
					addressCounty: null,
					postcode: 'SW1A 1AA'
				}
			});
			const result = validateData({ type: 'has', data: source }, sink);

			const addressErrors = result.errors.filter((e) => e.sourceField === 'address');
			assert.ok(
				addressErrors.some(
					(e) => e.error.includes('addressTown') && e.error.includes('London') && e.error.includes('Bristol')
				)
			);
		});

		test('no errors when address matches', () => {
			const source = createSource({ siteAddressLine1: '1 Test St', siteAddressPostcode: 'SW1A 1AA' });
			const sink = createSink({
				address: {
					addressLine1: '1 Test St',
					addressLine2: null,
					addressTown: null,
					addressCounty: null,
					postcode: 'SW1A 1AA'
				}
			});
			const result = validateData({ type: 'has', data: source }, sink);

			const addressErrors = result.errors.filter((e) => e.sourceField === 'address');
			assert.strictEqual(addressErrors.length, 0);
		});
	});

	describe('validateInspectorDecision errors', () => {
		test('reports missing inspectorDecision when source has outcome', () => {
			const source = createSource({
				caseDecisionOutcome: 'allowed',
				caseDecisionOutcomeDate: '2024-06-01T00:00:00.000Z'
			});
			const result = validateData({ type: 'has', data: source }, createSink({ inspectorDecision: null }));

			const errors = result.errors.filter((e) => e.sourceField === 'inspectorDecision');
			assert.ok(errors.length > 0);
			assert.ok(errors.some((e) => e.error.includes('missing in sink')));
		});

		test('reports unexpected inspectorDecision when source has no outcome', () => {
			const result = validateData(
				{ type: 'has', data: createSource() },
				createSink({
					inspectorDecision: { outcome: 'allowed', caseDecisionOutcomeDate: new Date('2024-06-01T00:00:00.000Z') }
				})
			);

			const errors = result.errors.filter((e) => e.sourceField === 'inspectorDecision');
			assert.ok(errors.length > 0);
			assert.ok(errors.some((e) => e.error.includes('exists in sink')));
		});

		test('reports outcome mismatch', () => {
			const source = createSource({
				caseDecisionOutcome: 'allowed',
				caseDecisionOutcomeDate: '2024-06-01T00:00:00.000Z'
			});
			const sink = createSink({
				inspectorDecision: { outcome: 'dismissed', caseDecisionOutcomeDate: new Date('2024-06-01T00:00:00.000Z') }
			});
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'inspectorDecision');
			assert.ok(errors.some((e) => e.error.includes('outcome')));
		});

		test('reports date mismatch', () => {
			const source = createSource({
				caseDecisionOutcome: 'allowed',
				caseDecisionOutcomeDate: '2024-06-01T00:00:00.000Z'
			});
			const sink = createSink({
				inspectorDecision: { outcome: 'allowed', caseDecisionOutcomeDate: new Date('2024-07-01T00:00:00.000Z') }
			});
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'inspectorDecision');
			assert.ok(errors.some((e) => e.error.includes('caseDecisionOutcomeDate')));
		});

		test('no errors when inspectorDecision matches', () => {
			const source = createSource({
				caseDecisionOutcome: 'allowed',
				caseDecisionOutcomeDate: '2024-06-01T00:00:00.000Z'
			});
			const sink = createSink({
				inspectorDecision: { outcome: 'allowed', caseDecisionOutcomeDate: new Date('2024-06-01T00:00:00.000Z') }
			});
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'inspectorDecision');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('validateLpaQuestionnaire errors', () => {
		test('reports missing lpaQuestionnaire when source has data', () => {
			const source = createSource({ lpaStatement: 'We object' });
			const result = validateData({ type: 'has', data: source }, createSink({ lpaQuestionnaire: null }));

			const errors = result.errors.filter((e) => e.sourceField === 'lpaQuestionnaire');
			assert.ok(errors.length > 0);
			assert.ok(errors.some((e) => e.error.includes('missing in sink')));
		});

		test('reports lpaStatement mismatch', () => {
			const source = createSource({ lpaStatement: 'We object' });
			const lpaQuestionnaire = {
				lpaQuestionnaireSubmittedDate: null,
				lpaStatement: 'WRONG',
				lpaProcedurePreference: null,
				importantInformation: null,
				isCorrectAppealType: null,
				inConservationArea: null,
				targetDate: null,
				lpaNotificationMethods: [],
				listedBuildingDetails: [],
				designatedSiteNames: []
			};
			const result = validateData({ type: 'has', data: source }, createSink({ lpaQuestionnaire }));

			const errors = result.errors.filter((e) => e.sourceField === 'lpaQuestionnaire');
			assert.ok(
				errors.some(
					(e) => e.error.includes('lpaStatement') && e.error.includes('We object') && e.error.includes('WRONG')
				)
			);
		});

		test('reports isCorrectAppealType mismatch', () => {
			const source = createSource({ lpaStatement: 'note', isCorrectAppealType: true });
			const lpaQuestionnaire = {
				lpaQuestionnaireSubmittedDate: null,
				lpaStatement: 'note',
				lpaProcedurePreference: null,
				importantInformation: null,
				isCorrectAppealType: false,
				inConservationArea: null,
				targetDate: null,
				lpaNotificationMethods: [],
				listedBuildingDetails: [],
				designatedSiteNames: []
			};
			const result = validateData({ type: 'has', data: source }, createSink({ lpaQuestionnaire }));

			const errors = result.errors.filter((e) => e.sourceField === 'lpaQuestionnaire');
			assert.ok(errors.some((e) => e.error.includes('isCorrectAppealType')));
		});

		test('reports lpaNotificationMethods failure', () => {
			const source = createSource({ lpaStatement: 'note', notificationMethod: '["site-notice"]' });
			const lpaQuestionnaire = {
				lpaQuestionnaireSubmittedDate: null,
				lpaStatement: 'note',
				lpaProcedurePreference: null,
				importantInformation: null,
				isCorrectAppealType: null,
				inConservationArea: null,
				targetDate: null,
				lpaNotificationMethods: [],
				listedBuildingDetails: [],
				designatedSiteNames: []
			};
			const result = validateData({ type: 'has', data: source }, createSink({ lpaQuestionnaire }));

			const errors = result.errors.filter((e) => e.sourceField === 'lpaQuestionnaire');
			assert.ok(errors.some((e) => e.error.includes('lpaNotificationMethods')));
		});

		test('no errors when lpaQuestionnaire matches', () => {
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
			const result = validateData({ type: 'has', data: source }, createSink({ lpaQuestionnaire }));

			const errors = result.errors.filter((e) => e.sourceField === 'lpaQuestionnaire');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('validateRepresentations errors', () => {
		test('reports count mismatch', () => {
			const source = createSource({ appellantStatementSubmittedDate: '2024-04-01T00:00:00.000Z' });
			const result = validateData({ type: 's78', data: source }, createSink(), [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'representations');
			assert.ok(errors.some((e) => e.error.includes('Expected 1') && e.error.includes('found 0')));
		});

		test('reports missing representation type', () => {
			const source = createSource({ appellantStatementSubmittedDate: '2024-04-01T00:00:00.000Z' });
			const result = validateData({ type: 's78', data: source }, createSink(), [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'representations');
			assert.ok(errors.some((e) => e.error.includes('appellant_statement') && e.error.includes('not found')));
		});

		test('reports unexpected representation type', () => {
			const sink = createSink({ representations: [{ representationType: 'appellant_statement' }] });
			const result = validateData({ type: 's78', data: createSource() }, sink, [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'representations');
			assert.ok(errors.some((e) => e.error.includes('Unexpected') && e.error.includes('appellant_statement')));
		});

		test('no errors when representations match', () => {
			const source = createSource({ appellantStatementSubmittedDate: '2024-04-01T00:00:00.000Z' });
			const sink = createSink({ representations: [{ representationType: 'appellant_statement' }] });
			const result = validateData({ type: 's78', data: source }, sink, [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'representations');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('validateEvents errors', () => {
		test('reports missing hearing in sink', () => {
			const event = createEvent({ eventType: 'hearing', eventStartDateTime: '2024-07-01T10:00:00.000Z' });
			const result = validateData({ type: 'has', data: createSource() }, createSink(), [event], []);

			const errors = result.errors.filter((e) => e.sourceField === 'events');
			assert.ok(errors.some((e) => e.error.includes('hearing') && e.error.includes('missing in sink')));
		});

		test('reports hearing start time mismatch', () => {
			const event = createEvent({ eventType: 'hearing', eventStartDateTime: '2024-07-01T10:00:00.000Z' });
			const sink = createSink({
				hearing: { hearingStartTime: new Date('2024-08-01T10:00:00.000Z'), hearingEndTime: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [event], []);

			const errors = result.errors.filter((e) => e.sourceField === 'events');
			assert.ok(errors.some((e) => e.error.includes('hearingStartTime')));
		});

		test('reports inquiry in sink but not in source', () => {
			const sink = createSink({
				inquiry: { inquiryStartTime: new Date('2024-08-01T10:00:00.000Z'), inquiryEndTime: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'events');
			assert.ok(errors.some((e) => e.error.includes('inquiry exists in sink')));
		});

		test('reports siteVisit in sink but not in source', () => {
			const sink = createSink({
				siteVisit: {
					visitDate: new Date('2024-07-15T09:00:00.000Z'),
					visitStartTime: new Date('2024-07-15T09:00:00.000Z'),
					visitEndTime: null
				}
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'events');
			assert.ok(errors.some((e) => e.error.includes('siteVisit exists in sink')));
		});

		test('reports siteVisit date mismatch', () => {
			const event = createEvent({
				eventType: 'site_visit_accompanied',
				eventStartDateTime: '2024-07-15T09:00:00.000Z'
			});
			const sink = createSink({
				siteVisit: {
					visitDate: new Date('2024-08-15T09:00:00.000Z'),
					visitStartTime: new Date('2024-08-15T09:00:00.000Z'),
					visitEndTime: null
				}
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [event], []);

			const errors = result.errors.filter((e) => e.sourceField === 'events');
			assert.ok(errors.some((e) => e.error.includes('siteVisit.visitDate')));
		});

		test('no errors when events match', () => {
			const event = createEvent({ eventType: 'hearing', eventStartDateTime: '2024-07-01T10:00:00.000Z' });
			const sink = createSink({
				hearing: { hearingStartTime: new Date('2024-07-01T10:00:00.000Z'), hearingEndTime: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [event], []);

			const errors = result.errors.filter((e) => e.sourceField === 'events');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('validateServiceUsers errors', () => {
		test('reports appellant validation failure', () => {
			const appellantUser = createServiceUser({
				serviceUserType: 'Appellant',
				firstName: 'Jane',
				lastName: 'Doe',
				emailAddress: 'jane@example.com'
			});
			const sink = createSink({
				appellant: { firstName: 'WRONG', lastName: 'Doe', email: 'jane@example.com', phoneNumber: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [], [appellantUser]);

			const errors = result.errors.filter((e) => e.sourceField === 'serviceUsers');
			assert.ok(errors.some((e) => e.error.includes('appellant')));
		});

		test('reports appellant exists in sink but not in source', () => {
			const sink = createSink({
				appellant: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phoneNumber: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [], []);

			const errors = result.errors.filter((e) => e.sourceField === 'serviceUsers');
			assert.ok(errors.some((e) => e.error.includes('appellant exists in sink')));
		});

		test('reports agent validation failure', () => {
			const agentUser = createServiceUser({
				serviceUserType: 'Agent',
				firstName: 'Bob',
				lastName: 'Agent',
				emailAddress: 'bob@example.com'
			});
			const sink = createSink({
				agent: { firstName: 'WRONG', lastName: 'Agent', email: 'bob@example.com', phoneNumber: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [], [agentUser]);

			const errors = result.errors.filter((e) => e.sourceField === 'serviceUsers');
			assert.ok(errors.some((e) => e.error.includes('agent')));
		});

		test('reports interestedParties mismatch', () => {
			const interestedParty = createServiceUser({
				serviceUserType: 'InterestedParty',
				firstName: 'Alice',
				lastName: 'Smith',
				emailAddress: 'alice@example.com'
			});
			const result = validateData({ type: 'has', data: createSource() }, createSink(), [], [interestedParty]);

			const errors = result.errors.filter((e) => e.sourceField === 'serviceUsers');
			assert.ok(errors.some((e) => e.error.includes('interestedParties')));
		});

		test('reports rule6Parties mismatch', () => {
			const rule6Party = createServiceUser({
				serviceUserType: 'Rule6Party',
				firstName: 'Bob',
				lastName: 'Jones',
				emailAddress: 'bob@example.com'
			});
			const result = validateData({ type: 'has', data: createSource() }, createSink(), [], [rule6Party]);

			const errors = result.errors.filter((e) => e.sourceField === 'serviceUsers');
			assert.ok(errors.some((e) => e.error.includes('rule6Parties')));
		});

		test('no errors when service users match', () => {
			const appellantUser = createServiceUser({
				serviceUserType: 'Appellant',
				firstName: 'Jane',
				lastName: 'Doe',
				emailAddress: 'jane@example.com'
			});
			const sink = createSink({
				appellant: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phoneNumber: null, address: null }
			});
			const result = validateData({ type: 'has', data: createSource() }, sink, [], [appellantUser]);

			const errors = result.errors.filter((e) => e.sourceField === 'serviceUsers');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('validateParentAppeals errors', () => {
		test('reports unexpected parent appeals when not a child case', () => {
			const source = createSource({ linkedCaseStatus: null });
			const sink = createSink({ parentAppeals: [{ parentRef: 'PARENT-001', childRef: 'CASE-001' }] });
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'parentAppeals');
			assert.ok(errors.some((e) => e.error.includes('Expected no parent appeals') && e.error.includes('found 1')));
		});

		test('reports missing leadCaseReference', () => {
			const source = createSource({ linkedCaseStatus: 'child', leadCaseReference: null });
			const result = validateData({ type: 'has', data: source }, createSink());

			const errors = result.errors.filter((e) => e.sourceField === 'parentAppeals');
			assert.ok(errors.some((e) => e.error.includes('leadCaseReference is missing')));
		});

		test('reports wrong parent appeal count', () => {
			const source = createSource({ linkedCaseStatus: 'child', leadCaseReference: 'PARENT-001' });
			const result = validateData({ type: 'has', data: source }, createSink({ parentAppeals: [] }));

			const errors = result.errors.filter((e) => e.sourceField === 'parentAppeals');
			assert.ok(errors.some((e) => e.error.includes('Expected 1') && e.error.includes('found 0')));
		});

		test('reports parentRef mismatch', () => {
			const source = createSource({ linkedCaseStatus: 'child', leadCaseReference: 'PARENT-001' });
			const sink = createSink({ parentAppeals: [{ parentRef: 'WRONG', childRef: 'CASE-001' }] });
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'parentAppeals');
			assert.ok(
				errors.some((e) => e.error.includes('parentRef') && e.error.includes('PARENT-001') && e.error.includes('WRONG'))
			);
		});

		test('reports childRef mismatch', () => {
			const source = createSource({ linkedCaseStatus: 'child', leadCaseReference: 'PARENT-001' });
			const sink = createSink({ parentAppeals: [{ parentRef: 'PARENT-001', childRef: 'WRONG' }] });
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'parentAppeals');
			assert.ok(
				errors.some((e) => e.error.includes('childRef') && e.error.includes('CASE-001') && e.error.includes('WRONG'))
			);
		});

		test('no errors when parentAppeals match', () => {
			const source = createSource({ linkedCaseStatus: 'child', leadCaseReference: 'PARENT-001' });
			const sink = createSink({ parentAppeals: [{ parentRef: 'PARENT-001', childRef: 'CASE-001' }] });
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'parentAppeals');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('validateAppealStatus errors', () => {
		test('reports count mismatch', () => {
			const source = createSource({ caseValidationDate: '2024-01-15T00:00:00.000Z' });
			const result = validateData({ type: 'has', data: source }, createSink());

			const errors = result.errors.filter((e) => e.sourceField === 'appealStatus');
			assert.ok(errors.some((e) => e.error.includes('Expected 2') && e.error.includes('found 1')));
		});

		test('reports missing status with date', () => {
			const source = createSource({ caseValidationDate: '2024-01-15T00:00:00.000Z' });
			const result = validateData({ type: 'has', data: source }, createSink());

			const errors = result.errors.filter((e) => e.sourceField === 'appealStatus');
			assert.ok(errors.some((e) => e.error.includes('ready_to_start') && e.error.includes('not found')));
		});

		test('reports unexpected status in sink', () => {
			const sink = createSink({
				appealStatus: [
					{ status: 'new', createdAt: new Date('2024-01-20T14:30:00.000Z') },
					{ status: 'unexpected_status', createdAt: new Date('2024-02-01T00:00:00.000Z') }
				]
			});
			const result = validateData({ type: 'has', data: createSource() }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'appealStatus');
			assert.ok(errors.some((e) => e.error.includes('Unexpected') && e.error.includes('unexpected_status')));
		});

		test('no errors when statuses match', () => {
			const result = validateData({ type: 'has', data: createSource() }, createSink());

			const errors = result.errors.filter((e) => e.sourceField === 'appealStatus');
			assert.strictEqual(errors.length, 0);
		});
	});

	describe('array order independence', () => {
		test('specialisms match regardless of order', () => {
			const source = createSource({ caseSpecialisms: '["enforcement","heritage","environment"]' });
			const sink = createSink({
				specialisms: [
					{ specialism: { name: 'environment' } },
					{ specialism: { name: 'enforcement' } },
					{ specialism: { name: 'heritage' } }
				]
			});
			assert.strictEqual(validate(source, sink), true);
		});

		test('child appeals match regardless of order', () => {
			const source = createSource({ nearbyCaseReferences: '["CASE-003","CASE-002","CASE-004"]' });
			const sink = createSink({
				childAppeals: [
					{ childRef: 'CASE-004', parentRef: 'CASE-001' },
					{ childRef: 'CASE-002', parentRef: 'CASE-001' },
					{ childRef: 'CASE-003', parentRef: 'CASE-001' }
				]
			});
			assert.strictEqual(validate(source, sink), true);
		});

		test('neighbouring sites match regardless of order', () => {
			const source = createSource({
				neighbouringSiteAddresses:
					'[{"neighbouringSiteAddressLine1":"3 High St"},{"neighbouringSiteAddressLine1":"1 Low St"},{"neighbouringSiteAddressLine1":"2 Mid St"}]'
			});
			const sink = createSink({
				neighbouringSites: [
					{ address: { addressLine1: '2 Mid St' } },
					{ address: { addressLine1: '3 High St' } },
					{ address: { addressLine1: '1 Low St' } }
				]
			});
			assert.strictEqual(validate(source, sink), true);
		});

		test('appeal statuses match regardless of order', () => {
			const source = createSource({
				caseValidationDate: '2024-01-15T00:00:00.000Z',
				caseCompletedDate: '2024-04-01T00:00:00.000Z'
			});
			const sink = createSink({
				appealStatus: [
					{ status: 'complete', createdAt: new Date('2024-04-01T00:00:00.000Z') },
					{ status: 'ready_to_start', createdAt: new Date('2024-01-15T00:00:00.000Z') },
					{ status: 'new', createdAt: new Date('2024-01-20T14:30:00.000Z') }
				]
			});
			assert.strictEqual(validate(source, sink), true);
		});

		test('representations match regardless of order', () => {
			const source = createSource({
				appellantStatementSubmittedDate: '2024-04-01T00:00:00.000Z',
				lpaStatementSubmittedDate: '2024-04-02T00:00:00.000Z',
				appellantCommentsSubmittedDate: '2024-04-03T00:00:00.000Z'
			});
			const sink = createSink({
				representations: [
					{ representationType: 'lpa_statement' },
					{ representationType: 'appellant_final_comment' },
					{ representationType: 'appellant_statement' }
				]
			});
			assert.strictEqual(validateData({ type: 's78', data: source }, sink, [], []).isValid, true);
		});

		test('appeal grounds match regardless of order', () => {
			const source = createSource({
				enforcementAppealGroundsDetails:
					'[{"appealGroundLetter":"c"},{"appealGroundLetter":"a"},{"appealGroundLetter":"b"}]'
			});
			const sink = createSink({
				appealGrounds: [
					{ ground: { groundRef: 'b' }, factsForGround: null },
					{ ground: { groundRef: 'a' }, factsForGround: null },
					{ ground: { groundRef: 'c' }, factsForGround: null }
				]
			});
			assert.strictEqual(validateData({ type: 's78', data: source }, sink, [], []).isValid, true);
		});

		test('lpa notification methods match regardless of order', () => {
			const source = createSource({
				lpaStatement: 'note',
				notificationMethod: '["site-notice","letter","press-advert"]'
			});
			const lpaQuestionnaire = {
				lpaQuestionnaireSubmittedDate: null,
				lpaStatement: 'note',
				lpaProcedurePreference: null,
				importantInformation: null,
				isCorrectAppealType: null,
				inConservationArea: null,
				targetDate: null,
				lpaNotificationMethods: [
					{ lpaNotificationMethod: { key: 'press-advert' } },
					{ lpaNotificationMethod: { key: 'site-notice' } },
					{ lpaNotificationMethod: { key: 'letter' } }
				],
				listedBuildingDetails: [],
				designatedSiteNames: []
			};
			assert.strictEqual(validate(source, createSink({ lpaQuestionnaire })), true);
		});

		test('listed building details match regardless of order', () => {
			const source = createSource({
				lpaStatement: 'note',
				affectedListedBuildingNumbers: '["LB-001","LB-003"]',
				changedListedBuildingNumbers: '["LB-002"]'
			});
			const lpaQuestionnaire = {
				lpaQuestionnaireSubmittedDate: null,
				lpaStatement: 'note',
				lpaProcedurePreference: null,
				importantInformation: null,
				isCorrectAppealType: null,
				inConservationArea: null,
				targetDate: null,
				lpaNotificationMethods: [],
				listedBuildingDetails: [{ listEntry: 'LB-002' }, { listEntry: 'LB-001' }, { listEntry: 'LB-003' }],
				designatedSiteNames: []
			};
			assert.strictEqual(validate(source, createSink({ lpaQuestionnaire })), true);
		});

		test('interested parties match regardless of order', () => {
			const ip1 = createServiceUser({
				serviceUserType: 'InterestedParty',
				firstName: 'Alice',
				lastName: 'Smith',
				emailAddress: 'alice@example.com'
			});
			const ip2 = createServiceUser({
				serviceUserType: 'InterestedParty',
				firstName: 'Bob',
				lastName: 'Jones',
				emailAddress: 'bob@example.com'
			});
			const sink = createSink({
				representations: [
					{
						representationType: 'comment',
						represented: { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' }
					},
					{
						representationType: 'comment',
						represented: { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }
					}
				]
			});
			assert.strictEqual(validate(createSource(), sink, [], [ip1, ip2]), true);
		});

		test('rule 6 parties match regardless of order', () => {
			const r6a = createServiceUser({
				serviceUserType: 'Rule6Party',
				firstName: 'Charlie',
				lastName: 'Brown',
				emailAddress: 'charlie@example.com'
			});
			const r6b = createServiceUser({
				serviceUserType: 'Rule6Party',
				firstName: 'Diana',
				lastName: 'Prince',
				emailAddress: 'diana@example.com'
			});
			const sink = createSink({
				appealRule6Parties: [
					{ serviceUser: { firstName: 'Diana', lastName: 'Prince', email: 'diana@example.com' } },
					{ serviceUser: { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com' } }
				]
			});
			assert.strictEqual(validate(createSource(), sink, [], [r6a, r6b]), true);
		});
	});

	describe('validateAppellantCase errors', () => {
		test('reports missing appellantCase', () => {
			const result = validateData({ type: 'has', data: createSource() }, createSink({ appellantCase: null }));

			const errors = result.errors.filter((e) => e.sourceField === 'appellantCase');
			assert.ok(errors.some((e) => e.error.includes('missing in sink')));
		});

		test('reports applicationDecision mismatch', () => {
			const source = createSource({ applicationDecision: 'refused' });
			const sink = createSink({ appellantCase: createAppellantCase({ applicationDecision: 'granted' }) });
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'appellantCase');
			assert.ok(
				errors.some(
					(e) => e.error.includes('applicationDecision') && e.error.includes('refused') && e.error.includes('granted')
				)
			);
		});

		test('reports caseSubmittedDate mismatch', () => {
			const source = createSource({ caseSubmittedDate: '2024-01-05T09:00:00.000Z' });
			const sink = createSink({
				appellantCase: createAppellantCase({ caseSubmittedDate: new Date('2024-02-05T09:00:00.000Z') })
			});
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'appellantCase');
			assert.ok(errors.some((e) => e.error.includes('caseSubmittedDate')));
		});

		test('reports ownsAllLand mismatch', () => {
			const source = createSource({ ownsAllLand: true });
			const sink = createSink({ appellantCase: createAppellantCase({ ownsAllLand: false }) });
			const result = validateData({ type: 'has', data: source }, sink);

			const errors = result.errors.filter((e) => e.sourceField === 'appellantCase');
			assert.ok(errors.some((e) => e.error.includes('ownsAllLand')));
		});

		test('no errors when appellantCase matches', () => {
			const result = validateData({ type: 'has', data: createSource() }, createSink());

			const errors = result.errors.filter((e) => e.sourceField === 'appellantCase');
			assert.strictEqual(errors.length, 0);
		});
	});
});
