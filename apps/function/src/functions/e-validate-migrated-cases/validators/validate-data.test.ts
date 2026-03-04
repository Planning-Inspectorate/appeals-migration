// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { validateData } from './validate-data.ts';

const baseSource = {
	caseReference: 'CASE-001',
	caseStatus: 'new',
	submissionId: null,
	applicationReference: 'APP-REF-001',
	caseCreatedDate: '2024-01-10T09:00:00.000Z',
	caseUpdatedDate: '2024-01-20T14:30:00.000Z',
	caseValidDate: '2024-01-22T09:00:00.000Z',
	caseExtensionDate: null,
	caseStartedDate: '2024-01-25T11:00:00.000Z',
	casePublishedDate: '2024-01-28T16:00:00.000Z',
	caseSubmittedDate: '2024-01-05T09:00:00.000Z',
	applicationDecision: 'refused'
};

const baseAppellantCase = {
	caseSubmittedDate: new Date('2024-01-05T09:00:00.000Z'),
	applicationDecision: 'refused',
	applicationDate: null,
	applicationDecisionDate: null,
	siteAccessDetails: null,
	siteSafetyDetails: null,
	originalDevelopmentDescription: null,
	ownsAllLand: null,
	ownsSomeLand: null,
	typeOfPlanningApplication: null,
	jurisdiction: null,
	enforcementIssueDate: null,
	interestInLand: null,
	appellantProcedurePreference: null,
	appellantProcedurePreferenceDuration: null
};

const baseSink = {
	reference: 'CASE-001',
	submissionId: null,
	applicationReference: 'APP-REF-001',
	caseCreatedDate: new Date('2024-01-10T09:00:00.000Z'),
	caseUpdatedDate: new Date('2024-01-20T14:30:00.000Z'),
	caseValidDate: new Date('2024-01-22T09:00:00.000Z'),
	caseExtensionDate: null,
	caseStartedDate: new Date('2024-01-25T11:00:00.000Z'),
	casePublishedDate: new Date('2024-01-28T16:00:00.000Z'),
	appealTimetable: null,
	allocation: null,
	appealStatus: [{ status: 'new' }],
	specialisms: [],
	address: null,
	inspectorDecision: null,
	appellantCase: { ...baseAppellantCase },
	childAppeals: [],
	neighbouringSites: [],
	lpaQuestionnaire: null,
	representations: [],
	appealGrounds: [],
	hearing: null,
	inquiry: null,
	siteVisit: null,
	appellant: null,
	agent: null
};

const validate = (source, sink, events = [], serviceUsers = []) =>
	validateData({ type: 'has', data: source }, sink, events, serviceUsers);

describe('validateData', () => {
	test('returns true for fully matching HAS and S78 case', () => {
		assert.strictEqual(validate(baseSource, baseSink), true);
		assert.strictEqual(validateData({ type: 's78', data: { ...baseSource } }, baseSink, [], []), true);
	});

	test('returns false for scalar field mismatch', () => {
		const cases = [
			[{ ...baseSource, caseReference: 'WRONG' }, baseSink],
			[baseSource, { ...baseSink, applicationReference: 'WRONG' }],
			[{ ...baseSource, caseCreatedDate: '2024-02-01T00:00:00.000Z' }, baseSink],
			[
				{ ...baseSource, caseExtensionDate: '2024-05-15T10:00:00.000Z' },
				{ ...baseSink, caseExtensionDate: null }
			]
		];
		for (const [src, snk] of cases) {
			assert.strictEqual(validate(src, snk), false);
		}
	});

	test('handles null/undefined equivalence correctly', () => {
		assert.strictEqual(validate({ ...baseSource, submissionId: null }, { ...baseSink, submissionId: null }), true);
		assert.strictEqual(validate({ ...baseSource, submissionId: null }, { ...baseSink, submissionId: 'SUB-X' }), false);
		assert.strictEqual(
			validate({ ...baseSource, caseExtensionDate: null }, { ...baseSink, caseExtensionDate: null }),
			true
		);
	});

	test('validates appeal timetable', () => {
		const srcWithDates = { ...baseSource, lpaQuestionnaireDueDate: '2024-03-01T00:00:00.000Z' };
		const sinkWithDates = {
			...baseSink,
			appealTimetable: {
				lpaQuestionnaireDueDate: new Date('2024-03-01T00:00:00.000Z'),
				planningObligationDueDate: null,
				finalCommentsDueDate: null,
				ipCommentsDueDate: null,
				proofOfEvidenceAndWitnessesDueDate: null,
				lpaStatementDueDate: null,
				statementOfCommonGroundDueDate: null
			}
		};
		assert.strictEqual(validate(srcWithDates, sinkWithDates), true);
		assert.strictEqual(validate(srcWithDates, { ...baseSink, appealTimetable: null }), false);
		assert.strictEqual(validate(baseSource, sinkWithDates), false);
	});

	test('validates allocation', () => {
		const srcWithAlloc = { ...baseSource, allocationLevel: 'A', allocationBand: 1 };
		const sinkWithAlloc = { ...baseSink, allocation: { level: 'A', band: 1 } };
		assert.strictEqual(validate(srcWithAlloc, sinkWithAlloc), true);
		assert.strictEqual(validate(srcWithAlloc, { ...baseSink, allocation: { level: 'B', band: 1 } }), false);
		assert.strictEqual(validate(baseSource, { ...baseSink, allocation: { level: 'A', band: 1 } }), false);
	});

	test('validates appeal statuses', () => {
		const srcWithHistory = { ...baseSource, caseValidationDate: '2024-01-15T00:00:00.000Z' };
		const sinkWithHistory = {
			...baseSink,
			appealStatus: [{ status: 'new' }, { status: 'ready_to_start' }]
		};
		assert.strictEqual(validate(srcWithHistory, sinkWithHistory), true);
		assert.strictEqual(validate(srcWithHistory, baseSink), false);
		assert.strictEqual(validate(baseSource, { ...baseSink, appealStatus: [{ status: 'wrong' }] }), false);
	});

	test('validates specialisms', () => {
		const srcWithSpec = { ...baseSource, caseSpecialisms: '["enforcement"]' };
		const sinkWithSpec = { ...baseSink, specialisms: [{ specialism: { name: 'enforcement' } }] };
		assert.strictEqual(validate(srcWithSpec, sinkWithSpec), true);
		assert.strictEqual(validate(srcWithSpec, baseSink), false);
	});

	test('validates address', () => {
		const srcWithAddr = { ...baseSource, siteAddressLine1: '1 Test St' };
		const sinkWithAddr = {
			...baseSink,
			address: { addressLine1: '1 Test St', addressLine2: null, addressTown: null, addressCounty: null, postcode: null }
		};
		assert.strictEqual(validate(srcWithAddr, sinkWithAddr), true);
		assert.strictEqual(validate(srcWithAddr, baseSink), false);
	});

	test('validates inspector decision', () => {
		const srcWithDecision = {
			...baseSource,
			caseDecisionOutcome: 'allowed',
			caseDecisionOutcomeDate: '2024-06-01T00:00:00.000Z'
		};
		const sinkWithDecision = {
			...baseSink,
			inspectorDecision: { outcome: 'allowed', caseDecisionOutcomeDate: new Date('2024-06-01T00:00:00.000Z') }
		};
		assert.strictEqual(validate(srcWithDecision, sinkWithDecision), true);
		assert.strictEqual(validate(srcWithDecision, baseSink), false);
	});

	test('validates appellantCase fields', () => {
		const srcWithSite = { ...baseSource, siteAccessDetails: 'ring bell' };
		const sinkWithSite = { ...baseSink, appellantCase: { ...baseAppellantCase, siteAccessDetails: 'ring bell' } };
		assert.strictEqual(validate(srcWithSite, sinkWithSite), true);
		assert.strictEqual(validate(srcWithSite, baseSink), false);
		assert.strictEqual(validate(baseSource, { ...baseSink, appellantCase: null }), false);
	});

	test('validates child appeals', () => {
		const srcWithChild = { ...baseSource, nearbyCaseReferences: '["CASE-002"]' };
		const sinkWithChild = { ...baseSink, childAppeals: [{ childRef: 'CASE-002', parentRef: 'CASE-001' }] };
		assert.strictEqual(validate(srcWithChild, sinkWithChild), true);
		assert.strictEqual(validate(srcWithChild, baseSink), false);
	});

	test('validates neighbouring sites', () => {
		const srcWithSites = {
			...baseSource,
			neighbouringSiteAddresses: '[{"neighbouringSiteAddressLine1":"2 High St"}]'
		};
		const sinkWithSites = { ...baseSink, neighbouringSites: [{ address: { addressLine1: '2 High St' } }] };
		assert.strictEqual(validate(srcWithSites, sinkWithSites), true);
		assert.strictEqual(validate(srcWithSites, baseSink), false);
	});

	test('validates lpaQuestionnaire', () => {
		const srcWithLpaq = { ...baseSource, lpaStatement: 'We object', isCorrectAppealType: true };
		const sinkWithLpaq = {
			...baseSink,
			lpaQuestionnaire: {
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
			}
		};
		assert.strictEqual(validate(srcWithLpaq, sinkWithLpaq), true);
		assert.strictEqual(validate(srcWithLpaq, baseSink), false);
		assert.strictEqual(
			validate(srcWithLpaq, {
				...baseSink,
				lpaQuestionnaire: { ...sinkWithLpaq.lpaQuestionnaire, lpaStatement: 'WRONG' }
			}),
			false
		);
	});

	test('validates lpaQuestionnaire notification methods', () => {
		const srcWithMethods = { ...baseSource, lpaStatement: 'note', notificationMethod: '["site-notice"]' };
		const sinkWithMethods = {
			...baseSink,
			lpaQuestionnaire: {
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
			}
		};
		assert.strictEqual(validate(srcWithMethods, sinkWithMethods), true);
		assert.strictEqual(
			validate(srcWithMethods, {
				...baseSink,
				lpaQuestionnaire: { ...sinkWithMethods.lpaQuestionnaire, lpaNotificationMethods: [] }
			}),
			false
		);
	});

	test('validates representations (S78 only)', () => {
		const s78Source = { ...baseSource, appellantStatementSubmittedDate: '2024-04-01T00:00:00.000Z' };
		const sinkWithRep = { ...baseSink, representations: [{ representationType: 'appellant_statement' }] };
		assert.strictEqual(validateData({ type: 's78', data: s78Source }, sinkWithRep, [], []), true);
		assert.strictEqual(validateData({ type: 's78', data: s78Source }, baseSink, [], []), false);
		assert.strictEqual(validate(baseSource, sinkWithRep), false);
	});

	test('validates appeal grounds (S78 only)', () => {
		const s78Source = {
			...baseSource,
			enforcementAppealGroundsDetails: '[{"appealGroundLetter":"a","groundFacts":"test facts"}]'
		};
		const sinkWithGrounds = {
			...baseSink,
			appealGrounds: [{ ground: { groundRef: 'a' }, factsForGround: 'test facts' }]
		};
		assert.strictEqual(validateData({ type: 's78', data: s78Source }, sinkWithGrounds, [], []), true);
		assert.strictEqual(validateData({ type: 's78', data: s78Source }, baseSink, [], []), false);
		assert.strictEqual(validate(baseSource, sinkWithGrounds), false);
	});

	test('validates hearing event', () => {
		const hearingEvent = {
			eventType: 'hearing',
			eventStartDateTime: '2024-07-01T10:00:00.000Z',
			eventEndDateTime: null,
			addressLine1: null,
			addressLine2: null,
			addressTown: null,
			addressCounty: null,
			addressPostcode: null
		};
		const sinkWithHearing = {
			...baseSink,
			hearing: { hearingStartTime: new Date('2024-07-01T10:00:00.000Z'), hearingEndTime: null }
		};
		assert.strictEqual(validate(baseSource, sinkWithHearing, [hearingEvent]), true);
		assert.strictEqual(validate(baseSource, baseSink, [hearingEvent]), false);
	});

	test('validates inquiry event', () => {
		const inquiryEvent = {
			eventType: 'inquiry',
			eventStartDateTime: '2024-08-01T10:00:00.000Z',
			eventEndDateTime: null,
			addressLine1: null,
			addressLine2: null,
			addressTown: null,
			addressCounty: null,
			addressPostcode: null
		};
		const sinkWithInquiry = {
			...baseSink,
			inquiry: { inquiryStartTime: new Date('2024-08-01T10:00:00.000Z'), inquiryEndTime: null }
		};
		assert.strictEqual(validate(baseSource, sinkWithInquiry, [inquiryEvent]), true);
		assert.strictEqual(validate(baseSource, baseSink, [inquiryEvent]), false);
	});

	test('validates site visit event', () => {
		const siteVisitEvent = {
			eventType: 'site_visit_accompanied',
			eventStartDateTime: '2024-07-15T09:00:00.000Z',
			eventEndDateTime: null,
			addressLine1: null,
			addressLine2: null,
			addressTown: null,
			addressCounty: null,
			addressPostcode: null
		};
		const sinkWithVisit = {
			...baseSink,
			siteVisit: {
				visitDate: new Date('2024-07-15T09:00:00.000Z'),
				visitStartTime: new Date('2024-07-15T09:00:00.000Z'),
				visitEndTime: null
			}
		};
		assert.strictEqual(validate(baseSource, sinkWithVisit, [siteVisitEvent]), true);
		assert.strictEqual(validate(baseSource, baseSink, [siteVisitEvent]), false);
	});

	test('returns false when sink has events but source has none', () => {
		const sinkWithHearing = {
			...baseSink,
			hearing: { hearingStartTime: new Date('2024-07-01T10:00:00.000Z'), hearingEndTime: null }
		};
		assert.strictEqual(validate(baseSource, sinkWithHearing, []), false);

		const sinkWithInquiry = {
			...baseSink,
			inquiry: { inquiryStartTime: new Date('2024-08-01T10:00:00.000Z'), inquiryEndTime: null }
		};
		assert.strictEqual(validate(baseSource, sinkWithInquiry, []), false);

		const sinkWithSiteVisit = {
			...baseSink,
			siteVisit: {
				visitDate: new Date('2024-07-15T09:00:00.000Z'),
				visitStartTime: new Date('2024-07-15T09:00:00.000Z'),
				visitEndTime: null
			}
		};
		assert.strictEqual(validate(baseSource, sinkWithSiteVisit, []), false);
	});

	test('validates service users (appellant and agent)', () => {
		const appellantUser = {
			serviceUserType: 'Appellant',
			firstName: 'Jane',
			lastName: 'Doe',
			emailAddress: 'jane@example.com',
			telephoneNumber: null,
			organisation: null,
			salutation: null,
			webAddress: null,
			addressLine1: null,
			addressLine2: null,
			addressTown: null,
			addressCounty: null,
			postcode: null,
			addressCountry: null
		};
		const sinkWithAppellant = {
			...baseSink,
			appellant: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phoneNumber: null, address: null }
		};
		assert.strictEqual(validate(baseSource, sinkWithAppellant, [], [appellantUser]), true);
		assert.strictEqual(validate(baseSource, baseSink, [], [appellantUser]), false);
		assert.strictEqual(validate(baseSource, sinkWithAppellant, [], []), false);
	});
});
