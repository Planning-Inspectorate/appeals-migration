import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * A script to read the source & sink schemas, do some basic parsing, and check for direct field mappings
 * Outputs to a CSV
 */

const sourceSchema = path.join(import.meta.dirname, '../../database-source/src/schema.prisma');
const sinkSchema = path.join(import.meta.dirname, '../../database-sink/src/schema.prisma');

type Models = Record<string, Record<string, string>>;
type FieldCounts = Record<string, number>;
const NOT_FOUND = 'NOT_FOUND';
const MULTIPLE_MATCHES = 'MULTIPLE_MATCHES';

async function run() {
	const source = await parseSchemaByPath(sourceSchema);
	const sink = await parseSchemaByPath(sinkSchema);

	const appealHasFields = Object.keys(source.models['AppealHas']);
	const appealS78Fields = Object.keys(source.models['AppealS78']).filter((key) => !appealHasFields.includes(key));

	const hasFieldMappings = appealHasFields.map(matchField(sink.models, sink.fieldCount));
	const s78FieldMappings = appealS78Fields.map(matchField(sink.models, sink.fieldCount));

	const csvRows = [['Field', 'Mapping', 'S78 Only']];

	for (let i = 0; i < hasFieldMappings.length; i++) {
		const field = appealHasFields[i];
		const mapping = hasFieldMappings[i];
		csvRows.push([field, mapping, 'False']);
	}

	for (let i = 0; i < s78FieldMappings.length; i++) {
		const field = appealS78Fields[i];
		const mapping = s78FieldMappings[i];
		csvRows.push([field, mapping, 'True']);
	}

	await fs.writeFile('./basic-field-mapping.csv', csvRows.map((row) => row.join(',')).join('\r\n'));
}

function matchField(models: Models, fieldCounts: FieldCounts) {
	return (field: string) => {
		if (fieldCounts[field] === 0) {
			return NOT_FOUND;
		} else if (fieldCounts[field] === 1) {
			for (const [k, v] of Object.entries(models)) {
				const modelFields = Object.keys(v);
				if (modelFields.includes(field)) {
					return k;
				}
			}
			throw new Error(`expected to find ${field} by did not`);
		} else {
			return MULTIPLE_MATCHES;
		}
	};
}

async function parseSchemaByPath(schemaPath: string) {
	const schemaFile = await fs.readFile(schemaPath);
	const schemaRows: string[] = schemaFile.toString().split('\n');
	return parsePrismaSchema(schemaRows);
}

function parsePrismaSchema(schemaRows: string[]) {
	const models: Models = {};
	const fieldCount: FieldCounts = {};
	let currentModel: Record<string, string> | null = null;
	for (const row of schemaRows) {
		if (row.startsWith('model')) {
			const modelName = row.substring('model '.length, row.length - 2).trim();
			models[modelName] = {};
			currentModel = models[modelName];
		} else if (row.startsWith('}')) {
			currentModel = null;
		} else if (currentModel) {
			if (row.trim().startsWith('@')) {
				continue;
			}
			const parts = row
				.split(/\s+/)
				.map((p) => p.trim())
				.filter(Boolean);
			if (parts.length >= 2) {
				currentModel[parts[0]] = parts[1];
				if (!fieldCount[parts[0]]) {
					fieldCount[parts[0]] = 0;
				}
				fieldCount[parts[0]]++;
			}
		}
	}
	return { models, fieldCount };
}

run();
