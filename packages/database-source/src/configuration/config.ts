/**
 * Load configuration for seeding the database
 */
export function loadConfig(): { db: string } {
	const db = process.env.ODW_CURATED_SQL_CONNECTION_STRING;
	if (!db) {
		throw new Error('ODW_CURATED_SQL_CONNECTION_STRING is required');
	}
	return { db };
}
