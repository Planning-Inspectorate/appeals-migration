import { loadEnvFile } from 'node:process';
import { HorizonWebClientOptions } from '@pins/appeals-migration-lib/horizon/web/horizon-web-client.ts';

export interface Config {
	database: string;
	sourceDatabase: string;
	sinkDatabase: string;
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
		HORIZON_WEB_BASE_URL,
		HORIZON_WEB_DNS_MAPPING,
		HORIZON_WEB_USERNAME,
		HORIZON_WEB_PASSWORD
	} = process.env;

	const requiredConfig = {
		MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
		MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME,
		MANAGE_APPEALS_SQL_CONNECTION_STRING,
		HORIZON_WEB_BASE_URL,
		HORIZON_WEB_USERNAME,
		HORIZON_WEB_PASSWORD,
		SQL_CONNECTION_STRING,
		ODW_CURATED_SQL_CONNECTION_STRING
	};

	for (const [k, v] of Object.entries(requiredConfig)) {
		if (!v) {
			throw new Error(`${k} is required`);
		}
	}

	return {
		database: SQL_CONNECTION_STRING!,
		sourceDatabase: ODW_CURATED_SQL_CONNECTION_STRING!,
		sinkDatabase: MANAGE_APPEALS_SQL_CONNECTION_STRING!,
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
