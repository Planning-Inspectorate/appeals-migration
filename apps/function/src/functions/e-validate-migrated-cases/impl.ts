import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { fetchEventDetails } from '../b-migrate-data/source/event-details.ts';
import { fetchServiceUsers } from '../b-migrate-data/source/service-users.ts';
import { fetchSinkCaseDetails } from './sink/case-details.ts';
import { fetchSourceCaseDetails } from './source/case-details.ts';
import { fetchSourceDocuments } from './source/documents.ts';
import { validateData } from './validators/validate-data.ts';
import { validateDocuments } from './validators/validate-documents.ts';

type Source = {
	fetchSourceCaseDetails: typeof fetchSourceCaseDetails;
	fetchSourceDocuments: typeof fetchSourceDocuments;
	fetchSourceEvents: typeof fetchEventDetails;
	fetchSourceServiceUsers: typeof fetchServiceUsers;
};

type Sink = {
	fetchSinkCaseDetails: typeof fetchSinkCaseDetails;
};

type Validators = {
	validateData: typeof validateData;
	validateDocuments: typeof validateDocuments;
};

const defaultSource: Source = {
	fetchSourceCaseDetails,
	fetchSourceDocuments,
	fetchSourceEvents: fetchEventDetails,
	fetchSourceServiceUsers: fetchServiceUsers
};

const defaultSink: Sink = {
	fetchSinkCaseDetails
};

const defaultValidators: Validators = {
	validateData,
	validateDocuments
};

export function buildValidateMigratedCases(
	service: FunctionService,
	source: Source = defaultSource,
	sink: Sink = defaultSink,
	validators: Validators = defaultValidators
): MigrationFunction {
	return async (itemToMigrate, context) => {
		const caseToMigrate = itemToMigrate as CaseToMigrate;
		const caseReference = caseToMigrate.caseReference;
		context.log(`Validating case: ${caseReference}`);

		const sourceDatabase = service.sourceDatabaseClient;
		const sinkDatabase = service.sinkDatabaseClient;
		const sinkDocumentClient = service.sinkDocumentClient;
		const migrationDatabase = service.databaseClient;

		const [sourceCase, sinkCase, sourceDocuments, sourceEvents, sourceServiceUsers] = await Promise.all([
			source.fetchSourceCaseDetails(sourceDatabase, caseReference),
			sink.fetchSinkCaseDetails(sinkDatabase, caseReference),
			source.fetchSourceDocuments(sourceDatabase, caseReference),
			source.fetchSourceEvents(sourceDatabase, caseReference),
			source.fetchSourceServiceUsers(sourceDatabase, caseReference)
		]);

		if (!sourceCase) {
			throw new Error(`Case ${caseReference} not found in source database`);
		}

		if (!sinkCase) {
			throw new Error(`Case ${caseReference} not found in sink database`);
		}

		const dataValidationResult = validators.validateData(sourceCase, sinkCase, sourceEvents, sourceServiceUsers);
		context.log(`Case ${caseReference} data validation result: ${dataValidationResult.isValid}`);

		const documentsValidated = await validators.validateDocuments(sourceDocuments, sinkDocumentClient);
		context.log(`Case ${caseReference} documents validation result: ${documentsValidated}`);

		await withRetry(() =>
			migrationDatabase.caseToMigrate.update({
				where: { caseReference },
				data: {
					dataValidated: dataValidationResult.isValid,
					dataValidationErrors:
						dataValidationResult.errors.length > 0 ? JSON.stringify(dataValidationResult.errors) : null,
					documentsValidated
				}
			})
		);

		context.log(`Case ${caseReference} validation results saved`);
	};
}
