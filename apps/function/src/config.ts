import { loadEnvFile } from 'node:process';

export interface Config {
	example: {
		schedule: string;
	};
	database: string;
}

export function loadConfig(): Config {
	// load configuration from .env file into process.env
	// prettier-ignore
	try {loadEnvFile()} catch {/* ignore errors*/}

	// get values from the environment
	const { EXAMPLE_SCHEDULE, SQL_CONNECTION_STRING } = process.env;

	if (!SQL_CONNECTION_STRING) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}

	return {
		example: {
			schedule: EXAMPLE_SCHEDULE || '0 0 0 * * *' // default to daily at midnight
		},
		database: SQL_CONNECTION_STRING
	};
}
