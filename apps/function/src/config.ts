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
			migrationStepUpdateChunkSize: number;
			serviceBusParallelism: number;
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
		BUFFER_PER_WORKER,
		DISPATCHER_CADENCE_MINUTES,
		DISPATCHER_END_HOUR,
		DISPATCHER_END_MINUTES,
		DISPATCHER_START_HOUR,
		FUNC_LIST_CASE_TO_MIGRATE_SCHEDULE,
		FUNC_LIST_DOCUMENTS_TO_MIGRATE_SCHEDULE,
		FUNC_MIGRATE_DOCUMENTS_SCHEDULE,
		FUNC_TRANSFORMER_SCHEDULE,
		FUNC_VALIDATE_MIGRATED_CASES_SCHEDULE,
		MANAGE_APPEALS_API_ENDPOINT,
		MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
		MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME,
		MANAGE_APPEALS_SQL_CONNECTION_STRING,
		MAXIMUM_PARALLELISM,
		MIGRATION_STEP_UPDATE_CHUNK_SIZE,
		ODW_CURATED_SQL_CONNECTION_STRING,
		SERVICE_BUS_CONNECTION_STRING,
		SERVICE_BUS_PARALLELISM,
		SQL_CONNECTION_STRING
	} = process.env;

	const requiredConfig = {
		BUFFER_PER_WORKER,
		DISPATCHER_END_HOUR,
		DISPATCHER_START_HOUR,
		MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
		MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME,
		MANAGE_APPEALS_SQL_CONNECTION_STRING,
		MAXIMUM_PARALLELISM,
		ODW_CURATED_SQL_CONNECTION_STRING,
		SERVICE_BUS_CONNECTION_STRING,
		SQL_CONNECTION_STRING
	};

	for (const [k, v] of Object.entries(requiredConfig)) {
		if (!v) {
			throw new Error(`${k} is required`);
		}
	}

	function dispatcherSchedule(): string {
		const start = Number(DISPATCHER_START_HOUR);
		const end = Number(DISPATCHER_END_HOUR);
		const cadence = Number(DISPATCHER_CADENCE_MINUTES ?? 1);
		const hours = start <= end ? `${start}-${end}` : `0-${end},${start}-23`;
		return `0 */${cadence} ${hours} * * *`;
	}

	return {
		database: SQL_CONNECTION_STRING!,
		sourceDatabase: ODW_CURATED_SQL_CONNECTION_STRING!,
		sinkDatabase: MANAGE_APPEALS_SQL_CONNECTION_STRING!,
		serviceBus: SERVICE_BUS_CONNECTION_STRING!,
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
				queueTarget: Math.floor(Number(MAXIMUM_PARALLELISM) * Number(BUFFER_PER_WORKER)),
				migrationStepUpdateChunkSize: Number(MIGRATION_STEP_UPDATE_CHUNK_SIZE ?? 1000),
				serviceBusParallelism: Number(SERVICE_BUS_PARALLELISM ?? 50)
			}
		},
		manageAppeals: {
			apiEndpoint: MANAGE_APPEALS_API_ENDPOINT!,
			documents: {
				accountName: MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME!,
				containerName: MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME!
			}
		}
	};
}
