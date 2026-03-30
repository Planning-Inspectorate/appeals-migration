import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildCaseStatusViewModel } from './view-model.ts';

export function buildViewCase(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const { caseReference } = req.params;
		logger.info({ caseReference }, 'view case status');

		if (!caseReference || typeof caseReference !== 'string') {
			return res.status(404).render('views/errors/404.njk');
		}

		const caseToMigrate = await db.caseToMigrate.findUnique({
			where: { caseReference },
			include: {
				DataStep: true,
				DocumentListStep: true,
				DocumentsStep: true,
				ValidationStep: true
			}
		});

		if (!caseToMigrate) {
			return res.status(404).render('views/errors/404.njk');
		}

		return res.render('views/status/view/view.njk', buildCaseStatusViewModel(caseToMigrate));
	};
}
