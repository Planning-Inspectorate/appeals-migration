import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const schemaFile =
	process.env.MANAGE_APPEALS_SCHEMA_URL ||
	`https://raw.githubusercontent.com/Planning-Inspectorate/appeals-back-office/refs/heads/main/appeals/api/src/database/schema.prisma`;

/**
 * Fetch the manage appeals database schema file and save it locally
 */
async function fetchManageAppealsSchema() {
	const res = await fetch(schemaFile);
	if (!res.ok) {
		try {
			console.log('manage appeals schema fetch error', await res.text());
			// eslint-disable-next-line no-empty
		} catch {} // ignore errors
		throw new Error(`error fetching schema file ${res.statusText} ${res.status}`);
	}

	let schema = await res.text();
	if (!schema.startsWith('generator client')) {
		console.log('schema', schema.substring(0, 100) + '...');
		throw new Error('unexpected schema content');
	}

	// replace the generator header to control the client output directory
	const generator = `generator client {
  provider = "prisma-client"
  output   = "./client"

  engineType = "client"
  runtime    = "nodejs"
}
`;

	schema = schema.replace(/generator\sclient\s{[\s\S]*?\n}\n/, generator);

	await writeFile(path.join(import.meta.dirname, 'schema.prisma'), schema);
	console.log('manage appeals schema written to file');
}

fetchManageAppealsSchema();
