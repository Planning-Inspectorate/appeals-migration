import { loadEnvFile } from 'node:process';

export interface Config {
	database: string;
	functions: {
		aListBuilder: {
			schedule: string;
		};
		bTransformer: {
			schedule: string;
		};
		cDocumentHandler: {
			schedule: string;
		};
		dValidator: {
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
		FUNC_LIST_BUILDER_SCHEDULE,
		FUNC_TRANSFORMER_SCHEDULE,
		FUNC_DOCUMENT_HANDLER_SCHEDULE,
		FUNC_VALIDATOR_SCHEDULE,
		HORIZON_API_ENDPOINT,
		HORIZON_API_TIMEOUT_MS,
		MANAGE_APPEALS_API_ENDPOINT,
		MANAGE_APPEALS_DOCUMENTS_ACCOUNT_NAME,
		MANAGE_APPEALS_DOCUMENTS_CONTAINER_NAME,
		SQL_CONNECTION_STRING
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

	return {
		database: SQL_CONNECTION_STRING,
		functions: {
			aListBuilder: {
				schedule: FUNC_LIST_BUILDER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			bTransformer: {
				schedule: FUNC_TRANSFORMER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			cDocumentHandler: {
				schedule: FUNC_DOCUMENT_HANDLER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
			},
			dValidator: {
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
