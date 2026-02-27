import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { saveValidationResult } from './migration/save-validation-result.ts';
import { fetchSinkCaseDetails } from './sink/case-details.ts';
import { fetchSourceCaseDetails } from './source/case-details.ts';
import { fetchSourceDocuments } from './source/documents.ts';
import { validateData } from './validators/validate-data.ts';
import { validateDocuments } from './validators/validate-documents.ts';

type Source = {
	fetchSourceCaseDetails: typeof fetchSourceCaseDetails;
	fetchSourceDocuments: typeof fetchSourceDocuments;
};

type Sink = {
	fetchSinkCaseDetails: typeof fetchSinkCaseDetails;
};

type Validators = {
	validateData: typeof validateData;
	validateDocuments: typeof validateDocuments;
};

type Migration = {
	saveValidationResult: typeof saveValidationResult;
};

const defaultSource: Source = {
	fetchSourceCaseDetails,
	fetchSourceDocuments
};

const defaultSink: Sink = {
	fetchSinkCaseDetails
};

const defaultValidators: Validators = {
	validateData,
	validateDocuments
};

const defaultMigration: Migration = {
	saveValidationResult
};

export function buildValidateMigratedCases(
	service: FunctionService,
	source: Source = defaultSource,
	sink: Sink = defaultSink,
	validators: Validators = defaultValidators,
	migration: Migration = defaultMigration
): MigrationFunction {
	return async (itemToMigrate, context) => {
		const caseToMigrate = itemToMigrate as CaseToMigrate;
		const caseReference = caseToMigrate.caseReference;
		context.log(`Validating case: ${caseReference}`);

		const sourceDatabase = service.sourceDatabaseClient;
		const sinkDatabase = service.sinkDatabaseClient;
		const migrationDatabase = service.databaseClient;

		const [sourceCase, sinkCase, sourceDocuments] = await Promise.all([
			source.fetchSourceCaseDetails(sourceDatabase, caseReference),
			sink.fetchSinkCaseDetails(sinkDatabase, caseReference),
			source.fetchSourceDocuments(sourceDatabase, caseReference)
		]);

		if (!sourceCase) {
			throw new Error(`Case ${caseReference} not found in source database`);
		}

		if (!sinkCase) {
			throw new Error(`Case ${caseReference} not found in sink database`);
		}

		const dataValidated = validators.validateData(sourceCase, sinkCase);
		context.log(`Case ${caseReference} data validation result: ${dataValidated}`);

		const documentsValidated = await validators.validateDocuments(sourceDocuments, sinkDatabase);
		context.log(`Case ${caseReference} documents validation result: ${documentsValidated}`);

		await migration.saveValidationResult(migrationDatabase, caseReference, {
			dataValidated,
			documentsValidated
		});

		context.log(`Case ${caseReference} validation results saved`);
	};
}
