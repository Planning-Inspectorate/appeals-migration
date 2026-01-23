import { initOdwDatabaseClient } from './index.ts';
import pino from 'pino';
import { loadEnvFile } from 'node:process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { Prisma } from './client/client.ts';

/**
 * Connects to the ODW test instance to read the database schema
 * Maps each schema to a Prisma model
 *
 * This is to allow using a Prisma client with the ODW databases, and to setup a local instance for development
 *
 * process.env.ODW_CURATED_SQL_CONNECTION_STRING  must be set, use `authentication=DefaultAzureCredential`
 * to authenticate using an Azure Entra account
 *
 * The first column name with 'id' at the end is marked as the model ID, and not nullable.
 */
async function run() {
	loadEnvFile('../.env');
	const logger = pino();
	const dbStr = process.env.ODW_CURATED_SQL_CONNECTION_STRING;
	if (!dbStr) {
		throw new Error('Missing database connection');
	}
	const db = initOdwDatabaseClient({ database: dbStr, NODE_ENV: 'development' }, logger);
	const query = Prisma.raw(`SELECT TABLE_CATALOG,
															TABLE_SCHEMA,
															TABLE_NAME,
															COLUMN_NAME,
															COLUMN_DEFAULT,
															IS_NULLABLE,
															DATA_TYPE,
															CHARACTER_MAXIMUM_LENGTH
											 FROM INFORMATION_SCHEMA.COLUMNS
											 WHERE TABLE_NAME IN (${TABLES.map((t) => `'${t}'`).join(',')})`);

	const res: ColumnSchema[] = await db.$queryRaw(query);
	await db.$disconnect(); // we're done with the database connection

	// sort the results into tables
	const columnsByTable: Record<string, ColumnSchema[]> = {};
	for (const entry of res) {
		const columns = columnsByTable[entry.TABLE_NAME] || (columnsByTable[entry.TABLE_NAME] = []);
		columns.push(entry);
	}

	let schema = `generator client {
  provider = "prisma-client"
  output   = "./client"

  engineType = "client"
  runtime    = "nodejs"
}

datasource db {
  provider = "sqlserver"
}

`;

	// map each table into a Prisma model
	for (const [k, v] of Object.entries(columnsByTable)) {
		logger.info('mapping ' + k);
		schema += tableToModel(k, v);
		schema += '\n\n';
	}
	// write and format the schema file
	const schemaPath = path.join(import.meta.dirname, 'schema.prisma');
	await fs.writeFile(schemaPath, schema);
	logger.info('schema written to file');
	await formatFile(schemaPath);
	logger.info('schema formatted');
}

function tableToModel(modelName: string, columns: ColumnSchema[]): string {
	let hasId = false;
	let schema = `model ${toPascalCase(modelName)} {\n`;
	for (const column of columns) {
		// column name and basic type
		schema += `${column.COLUMN_NAME} ${mapDataType(column.DATA_TYPE)}`;
		// crudely assume an ID field - only one ID field per model
		const isId = !hasId && column.COLUMN_NAME.toLowerCase().endsWith('id');
		if (isId) {
			hasId = true;
			schema += ' @id';
		} else if (column.IS_NULLABLE === 'YES') {
			schema += '?'; // nullable
		}
		// set string size, if not an ID field
		if (isString(column.DATA_TYPE) && !isId) {
			let maxChars: number | string = column.CHARACTER_MAXIMUM_LENGTH;
			if (column.CHARACTER_MAXIMUM_LENGTH === -1) {
				maxChars = 'MAX';
			}
			schema += ` @db.NVarChar(${maxChars})`;
		}
		schema += '\n';
	}
	schema += ` @@map("${modelName}")\n`;
	schema += `}`;
	return schema;
}

function formatFile(path: string): Promise<void> {
	return new Promise((resolve, reject) => {
		exec(`npx prettier --write ${path}`, (error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
}

function toPascalCase(str: string) {
	return str
		.split('_')
		.map((v) => v.charAt(0).toUpperCase() + v.slice(1))
		.join('');
}

function isString(dateType: string) {
	return mapDataType(dateType) === 'String';
}

function mapDataType(dataType: string) {
	return DATA_TYPES.get(dataType) || dataType;
}

const DATA_TYPES = new Map([
	['bigint', 'Int'],
	['bit', 'Boolean'],
	['float', 'Decimal'],
	['int', 'Int'],
	['varchar', 'String']
]);

/**
 * The list of tables to pull from the database
 */
const TABLES = [
	'appeal_document',
	'appeal_event',
	'appeal_event_estimate',
	'appeal_folder',
	'appeal_has',
	'appeal_representation',
	'appeal_s78',
	'appeal_service_user'
];

interface ColumnSchema {
	TABLE_CATALOG: string;
	TABLE_SCHEMA: string;
	TABLE_NAME: string;
	COLUMN_NAME: string;
	COLUMN_DEFAULT: null | any;
	IS_NULLABLE: string;
	DATA_TYPE: string;
	CHARACTER_MAXIMUM_LENGTH: number;
}

run().catch(console.error);
