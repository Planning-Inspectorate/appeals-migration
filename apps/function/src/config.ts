import { loadEnvFile } from 'node:process';

export interface Config {
	database: string;
	sourceDatabase: string;
	sinkDatabase: string;
	serviceBus: string;
	functions: {
		aListCasesToMigrate: {
			schedule: string;
		};
		bMigrateData: {
			schedule: string;
		};
		cListDocumentsToMigrate: {
			schedule: string;
		};
		dMigrateDocuments: {
			schedule: string;
		};
		eValidateMigratedCases: {
			schedule: string;
		};
		dispatcher: {
			schedule: string;
			endHour: number;
			endMinutes: number;
			queueTarget: number;
		};
	};
	manageAppeals: {
		apiEndpoint: string;
		documents: {
			accountName: string;
			containerName: string;
		};
	};
}

export function loadConfig(): Config {
	// load configuration from .env file into process.env
	// prettier-ignore
	try { loadEnvFile() } catch {/* ignore errors*/ }

	// get values from the environment
	const {
		FUNC_LIST_CASE_TO_MIGRATE_SCHEDULE,
		FUNC_TRANSFORMER_SCHEDULE,
		FUNC_LIST_DOCUMENTS_TO_MIGRATE_SCHEDULE,
		FUNC_MIGRATE_DOCUMENTS_SCHEDULE,
		FUNC_VALIDATE_MIGRATED_CASES_SCHEDULE,
		MANAGE_APPEALS_API_ENDPOINT,
		MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
		MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME,
		SQL_CONNECTION_STRING,
		ODW_CURATED_SQL_CONNECTION_STRING,
		MANAGE_APPEALS_SQL_CONNECTION_STRING,
		SERVICE_BUS_CONNECTION_STRING,
		DISPATCHER_START_HOUR,
		DISPATCHER_END_HOUR,
		DISPATCHER_CADENCE_MINUTES,
		DISPATCHER_END_MINUTES,
		MAXIMUM_PARALLELISM,
		BUFFER_PER_WORKER
	} = process.env;

	if (!MANAGE_APPEALS_API_ENDPOINT) {
		throw new Error('MANAGE_APPEALS_API_ENDPOINT is required');
	}
	if (!MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME) {
		throw new Error('MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME is required');
	}
	if (!MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME) {
		throw new Error('MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME is required');
	}
	if (!SQL_CONNECTION_STRING) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}
	if (!ODW_CURATED_SQL_CONNECTION_STRING) {
		throw new Error('ODW_CURATED_SQL_CONNECTION_STRING is required');
	}
	if (!MANAGE_APPEALS_SQL_CONNECTION_STRING) {
		throw new Error('MANAGE_APPEALS_SQL_CONNECTION_STRING is required');
	}
	if (!SERVICE_BUS_CONNECTION_STRING) {
		throw new Error('SERVICE_BUS_CONNECTION_STRING is required');
	}

	['DISPATCHER_START_HOUR', 'DISPATCHER_END_HOUR', 'MAXIMUM_PARALLELISM', 'BUFFER_PER_WORKER'].forEach((key) => {
		if (!process.env[key]) {
			throw new Error(`${key} is required`);
		}
	});

	function dispatcherSchedule(): string {
		const start = Number(DISPATCHER_START_HOUR);
		const end = Number(DISPATCHER_END_HOUR);
		const cadence = Number(DISPATCHER_CADENCE_MINUTES ?? 1);
		const hours = start <= end ? `${start}-${end}` : `0-${end},${start}-23`;
		return `0 */${cadence} ${hours} * * *`;
	}

	return {
		database: SQL_CONNECTION_STRING,
		sourceDatabase: ODW_CURATED_SQL_CONNECTION_STRING,
		sinkDatabase: MANAGE_APPEALS_SQL_CONNECTION_STRING,
		serviceBus: SERVICE_BUS_CONNECTION_STRING,
		functions: {
			aListCasesToMigrate: {
				schedule: FUNC_LIST_CASE_TO_MIGRATE_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			bMigrateData: {
				schedule: FUNC_TRANSFORMER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			cListDocumentsToMigrate: {
				schedule: FUNC_LIST_DOCUMENTS_TO_MIGRATE_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			dMigrateDocuments: {
				schedule: FUNC_MIGRATE_DOCUMENTS_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			eValidateMigratedCases: {
				schedule: FUNC_VALIDATE_MIGRATED_CASES_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			dispatcher: {
				schedule: dispatcherSchedule(),
				endHour: Number(DISPATCHER_END_HOUR),
				endMinutes: Number(DISPATCHER_END_MINUTES ?? 55),
				queueTarget: Math.floor(Number(MAXIMUM_PARALLELISM) * Number(BUFFER_PER_WORKER))
			}
		},
		manageAppeals: {
			apiEndpoint: MANAGE_APPEALS_API_ENDPOINT,
			documents: {
				accountName: MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
				containerName: MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME
			}
		}
	};
}
