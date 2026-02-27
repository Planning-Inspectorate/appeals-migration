import type { Appeal } from '@pins/manage-appeals-database/src/client/client.ts';
import type { AppealHas, AppealS78 } from '@pins/odw-curated-database/src/client/client.ts';

export type SourceCase = { type: 'has'; data: AppealHas } | { type: 's78'; data: AppealS78 };

// TODO: Real implementation is a separate ticket
export function validateData(sourceCase: SourceCase, sinkCase: Appeal): boolean {
	// Use parameters minimally to pass ESLint checks
	console.debug('Stub validateData called with:', sourceCase.type, sinkCase.reference);
	return false;
}
