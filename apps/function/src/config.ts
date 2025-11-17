import { loadEnvFile } from 'node:process';

export interface Config {
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
	database: string;
}

export function loadConfig(): Config {
	// load configuration from .env file into process.env
	// prettier-ignore
	try {loadEnvFile()} catch {/* ignore errors*/}

	// get values from the environment
	const {
		LIST_BUILDER_SCHEDULE,
		TRANSFORMER_SCHEDULE,
		DOCUMENT_HANDLER_SCHEDULE,
		VALIDATOR_SCHEDULE,
		SQL_CONNECTION_STRING
	} = process.env;

	if (!SQL_CONNECTION_STRING) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}

	return {
		aListBuilder: {
			schedule: LIST_BUILDER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
		},
		bTransformer: {
			schedule: TRANSFORMER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
		},
		cDocumentHandler: {
			schedule: DOCUMENT_HANDLER_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
		},
		dValidator: {
			schedule: VALIDATOR_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
		},
		database: SQL_CONNECTION_STRING
	};
}
