import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';
import type { DocumentValidationResult, ValidationError } from '../types/validation-types.ts';
import { createValidationError } from '../types/validation-types.ts';

// TODO: Real implementation is a separate ticket
export async function validateDocuments(
	documents: AppealDocument[],
	sinkDatabase: SinkPrismaClient
): Promise<DocumentValidationResult> {
	// Use parameters minimally to pass ESLint checks
	console.debug('Stub validateDocuments called with:', documents.length, 'documents');
	console.debug('Sink database client available:', !!sinkDatabase);

	// For now, return a failure with a generic error since this is a stub
	const errors: ValidationError[] = [
		createValidationError('AppealDocument', 'validation', 'Document validation not yet implemented')
	];

	return {
		isValid: false,
		errors
	};
}
