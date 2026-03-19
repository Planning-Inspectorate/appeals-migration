import type { Readable } from 'node:stream';

export type MockFunctionService = {
	databaseClient: any;
	sourceDatabaseClient: any;
	sinkDatabaseClient: any;
	serviceBusClient: any;
	serviceBusAdministrationClient: any;
	sourceDocumentClient: any;
	sinkDocumentClient: any;
	documentsContainerName: string;
	aListCasesToMigrateSchedule: string;
	dispatcherSchedule: string;
	dispatcherEndWindow: any;
	dispatcherQueueTarget: string;
	migrationStepUpdateChunkSize: number;
	serviceBusParallelism: number;
};

export type MockSource = {
	fetchCaseDetails: () => Promise<any>;
	fetchEventDetails: () => Promise<any[]>;
	fetchServiceUsers: () => Promise<any[]>;
};

export type MockContext = {
	log: (message: string) => void;
	error: (message: string) => void;
	warn: (message: string) => void;
	info: (message: string) => void;
	trace: (message: string) => void;
	debug: (message: string) => void;
	invocationId: string;
	functionName: string;
	extraInputs: any;
	extraOutputs: any;
	traceContext: any;
	logLevel: string;
	retryOptions: any;
	options: any;
};

export const createMockContext = (): MockContext => ({
	log: () => {},
	error: () => {},
	warn: () => {},
	info: () => {},
	trace: () => {},
	debug: () => {},
	invocationId: 'test-invocation',
	functionName: 'test-function',
	extraInputs: (input: any) => input,
	extraOutputs: (output: any) => output,
	traceContext: {},
	logLevel: 'info',
	retryOptions: {},
	options: { trigger: { type: 'test', name: 'test' }, extraInputs: [], extraOutputs: [] }
});

export const createMockSource = (overrides = {}): MockSource => ({
	fetchCaseDetails: async () => ({
		type: 'has' as const,
		data: {
			caseId: 1,
			caseReference: 'TEST/123',
			submissionId: 'SUB123',
			caseStatus: 'status',
			caseType: 'type',
			caseProcedure: 'procedure',
			appealType: 'appeal',
			appealProcedure: 'appealProcedure',
			decisionDate: null,
			decisionType: null,
			enforcementNoticeDate: null,
			finalComments: '',
			hearingDate: null,
			lpaApplicationDate: null,
			lpaDecisionDate: null,
			lpaQuestionnaireDueDate: null,
			nationalPark: false,
			padsSapId: 'SAP123'
		}
	}),
	fetchEventDetails: async () => [],
	fetchServiceUsers: async () => [],
	...overrides
});

export const createMockService = (overrides = {}): MockFunctionService => ({
	sourceDatabaseClient: {
		appealDocument: {
			findMany: async () => [
				{
					documentId: 'DOC123',
					caseReference: 'TEST/123',
					filename: 'test.pdf',
					version: 1,
					documentType: null
				}
			]
		}
	},
	sinkDatabaseClient: {
		appellantCaseIncompleteReason: { findMany: async () => [] },
		appellantCaseInvalidReason: { findMany: async () => [] },
		lPAQuestionnaireIncompleteReason: { findMany: async () => [] },
		appeal: { findUnique: async () => ({ id: 1 }) },
		folder: { findFirst: async () => ({ id: 1 }) }
	},
	sourceDocumentClient: {
		getDocument: async () => ({ filename: 'test.pdf', stream: {} as Readable })
	},
	sinkDocumentClient: {
		getBlockBlobClient: () => ({
			uploadStream: async () => {},
			getProperties: async () => ({})
		})
	},
	documentsContainerName: 'test-container',
	databaseClient: {},
	serviceBusClient: {},
	serviceBusAdministrationClient: {},
	aListCasesToMigrateSchedule: '0 0 * * *',
	dispatcherSchedule: '0 0 * * *',
	dispatcherEndWindow: 5,
	dispatcherQueueTarget: 'test-queue',
	migrationStepUpdateChunkSize: 10,
	serviceBusParallelism: 1,
	...overrides
});
