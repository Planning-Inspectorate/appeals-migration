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

const baseSource = {
	caseReference: 'CASE-001',
	caseStatus: 'new',
	caseType: 'D',
	caseProcedure: 'written',
	lpaCode: 'LPA001',
	caseOfficerId: null,
	inspectorId: null,
	padsSapId: null,
	linkedCaseStatus: null,
	leadCaseReference: null,
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

const baseSink = {
	reference: 'CASE-001',
	submissionId: null,
	appealType: { key: 'D' },
	procedureType: { key: 'written' },
	lpa: { lpaCode: 'LPA001' },
	caseOfficer: null,
	inspector: null,
	padsInspector: null,
	parentAppeals: [],
	applicationReference: 'APP-REF-001',
	caseCreatedDate: new Date('2024-01-10T09:00:00.000Z'),
	caseUpdatedDate: new Date('2024-01-20T14:30:00.000Z'),
	caseValidDate: new Date('2024-01-22T09:00:00.000Z'),
	caseExtensionDate: null,
	caseStartedDate: new Date('2024-01-25T11:00:00.000Z'),
	casePublishedDate: new Date('2024-01-28T16:00:00.000Z'),
	appealTimetable: null,
	allocation: null,
	appealStatus: [{ status: 'new', createdAt: new Date('2024-01-20T14:30:00.000Z') }],
	specialisms: [],
	address: null,
	inspectorDecision: null,
	appellantCase: { ...baseAppellantCase },
	childAppeals: [],
	neighbouringSites: [],
	lpaQuestionnaire: null,
	representations: [],
	appealRule6Parties: [],
	appealGrounds: [],
	hearing: null,
	inquiry: null,
	siteVisit: null,
	appellant: null,
	agent: null
};

const baseEvent = {
	eventType: null,
	eventStartDateTime: null,
	eventEndDateTime: null,
	addressLine1: null,
	addressLine2: null,
	addressTown: null,
	addressCounty: null,
	addressPostcode: null
};

const baseServiceUser = {
	serviceUserType: null,
	firstName: null,
	lastName: null,
	emailAddress: null,
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

export function createSource(overrides = {}) {
	return { ...baseSource, ...overrides };
}

export function createSink(overrides = {}) {
	return { ...baseSink, ...overrides };
}

export function createAppellantCase(overrides = {}) {
	return { ...baseAppellantCase, ...overrides };
}

export function createEvent(overrides = {}) {
	return { ...baseEvent, ...overrides };
}

export function createServiceUser(overrides = {}) {
	return { ...baseServiceUser, ...overrides };
}
