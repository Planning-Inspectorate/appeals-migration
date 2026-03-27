import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';

export function buildListItems(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list items');

		const cases = await db.caseToMigrate.findMany({
			include: {
				DataStep: true,
				DocumentListStep: true,
				DocumentsStep: true,
				ValidationStep: true
			},
			orderBy: { caseReference: 'asc' }
		});

		const items = cases.map((c) => ({
			caseReference: c.caseReference,
			dataStatus: c.DataStep.status,
			documentListStatus: c.DocumentListStep.status,
			documentsStatus: c.DocumentsStep.status,
			validationStatus: c.ValidationStep.status
		}));

		return res.render('views/home/list/view.njk', {
			pageHeading: 'Migration status',
			items
		});
	};
}
