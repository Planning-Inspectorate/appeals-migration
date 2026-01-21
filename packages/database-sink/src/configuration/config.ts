/**
 * Load configuration for seeding the database
 */
export function loadConfig(): { db: string } {
	const db = process.env.MANAGE_APPEALS_SQL_CONNECTION_STRING;
	if (!db) {
		throw new Error('SQL_CONNECTION_STRING is required');
	}
	return { db };
}
