import type { AppealHas, AppealS78 } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';

export function mapSourceToSinkAppeal(sourceCase: AppealHas | AppealS78): Prisma.AppealCreateInput {
	return {
		reference: sourceCase.caseReference
	} as Prisma.AppealCreateInput;
}
