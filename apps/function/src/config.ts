import { loadEnvFile } from 'node:process';

export interface Config {
	database: string;
	sourceDatabase: string;
	sinkDatabase: string;
	functions: {
		aListCasesToMigrate: {
			schedule: string;
		};
		bTransformer: {
			schedule: string;
		};
		cDocumentListBuilder: {
			schedule: string;
		};
		dDocumentHandler: {
			schedule: string;
		};
		eValidator: {
			schedule: string;
		};
	};
	horizon: {
		apiEndpoint: string;
		apiTimeoutMs?: number;
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
	try {loadEnvFile()} catch {/* ignore errors*/}

	// get values from the environment
	const {
		FUNC_LIST_CASE_TO_MIGRATE_SCHEDULE,
		FUNC_TRANSFORMER_SCHEDULE,
		FUNC_DOCUMENT_LIST_BUILDER_SCHEDULE,
		FUNC_DOCUMENT_HANDLER_SCHEDULE,
		FUNC_VALIDATOR_SCHEDULE,
		HORIZON_API_ENDPOINT,
		HORIZON_API_TIMEOUT_MS,
		MANAGE_APPEALS_API_ENDPOINT,
		MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
		MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME,
		SQL_CONNECTION_STRING,
		ODW_CURATED_SQL_CONNECTION_STRING,
		MANAGE_APPEALS_SQL_CONNECTION_STRING
	} = process.env;

	if (!HORIZON_API_ENDPOINT) {
		throw new Error('MANAGE_APPEALS_API_ENDPOINT is required');
	}
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

	return {
		database: SQL_CONNECTION_STRING,
		sourceDatabase: ODW_CURATED_SQL_CONNECTION_STRING,
		sinkDatabase: MANAGE_APPEALS_SQL_CONNECTION_STRING,
		functions: {
			aListCasesToMigrate: {
				schedule: FUNC_LIST_CASE_TO_MIGRATE_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			bTransformer: {
				schedule: FUNC_TRANSFORMER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			cDocumentListBuilder: {
				schedule: FUNC_DOCUMENT_LIST_BUILDER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			dDocumentHandler: {
				schedule: FUNC_DOCUMENT_HANDLER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			eValidator: {
				schedule: FUNC_VALIDATOR_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			}
		},
		horizon: {
			apiEndpoint: HORIZON_API_ENDPOINT,
			apiTimeoutMs: HORIZON_API_TIMEOUT_MS ? parseInt(HORIZON_API_TIMEOUT_MS) : undefined
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
