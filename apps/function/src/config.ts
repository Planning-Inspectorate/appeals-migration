import type { HorizonWebClientOptions } from '@pins/appeals-migration-lib/horizon/web/horizon-web-client.ts';
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
		dispatcher: {
			schedule: string;
			endHour: number;
			endMinutes: number;
			queueTarget: number;
			migrationStepUpdateChunkSize: number;
			serviceBusParallelism: number;
		};
	};
	horizon: HorizonWebClientOptions;
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
		HORIZON_WEB_BASE_URL,
		HORIZON_WEB_USERNAME,
		HORIZON_WEB_PASSWORD,
		HORIZON_WEB_DNS_MAPPING,
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
		HORIZON_WEB_BASE_URL,
		HORIZON_WEB_USERNAME,
		HORIZON_WEB_PASSWORD,
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
			dispatcher: {
				schedule: dispatcherSchedule(),
				endHour: Number(DISPATCHER_END_HOUR),
				endMinutes: Number(DISPATCHER_END_MINUTES ?? 55),
				queueTarget: Math.floor(Number(MAXIMUM_PARALLELISM) * Number(BUFFER_PER_WORKER)),
				migrationStepUpdateChunkSize: Number(MIGRATION_STEP_UPDATE_CHUNK_SIZE ?? 1000),
				serviceBusParallelism: Number(SERVICE_BUS_PARALLELISM ?? 50)
			}
		},
		horizon: {
			baseUrl: HORIZON_WEB_BASE_URL!,
			username: HORIZON_WEB_USERNAME!,
			password: HORIZON_WEB_PASSWORD!,
			dnsEntries: parseDnsMapping(HORIZON_WEB_DNS_MAPPING)
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

/**
 * Mapping is provided in the form
 *
 * host1:ip1,host2:ip2
 */
function parseDnsMapping(dnsMapping: string | undefined) {
	if (!dnsMapping) {
		return undefined;
	}
	const entries = dnsMapping.split(',');
	const dnsEntries: Record<string, string> = {};
	for (const entry of entries) {
		const [host, ip] = entry.split(':');
		dnsEntries[host] = ip;
	}
	return dnsEntries;
}
