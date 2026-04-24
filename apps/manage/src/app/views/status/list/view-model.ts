import type { Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import type { buildPagination } from './pagination.ts';

type CaseToMigrateWithSteps = Prisma.CaseToMigrateGetPayload<{
	include: { DataStep: true; DocumentsStep: true; DocumentListStep: true; ValidationStep: true };
}>;

interface ListItem {
	caseReference: string;
	dataStatus: string;
	documentListStatus: string;
	documentsStatus: string;
	validationStatus: string;
}

export interface ListViewModel {
	pageHeading: string;
	search: string;
	items: ListItem[];
	pagination: ReturnType<typeof buildPagination>;
}

function mapListItem(c: CaseToMigrateWithSteps): ListItem {
	return {
		caseReference: c.caseReference,
		dataStatus: c.DataStep.status,
		documentListStatus: c.DocumentListStep.status,
		documentsStatus: c.DocumentsStep.status,
		validationStatus: c.ValidationStep.status
	};
}

export function buildListViewModel(
	cases: CaseToMigrateWithSteps[],
	search: string,
	pagination: ReturnType<typeof buildPagination>
): ListViewModel {
	return {
		pageHeading: 'Case list',
		search,
		items: cases.map(mapListItem),
		pagination
	};
}
