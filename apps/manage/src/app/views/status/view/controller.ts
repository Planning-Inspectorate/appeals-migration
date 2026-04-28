import type { ManageService } from '#service';
import { getPreviousUrlFromSession } from '#util/session.ts';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { getSessionActionSuccess, getSessionActionWarning } from '../action/actions.ts';
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

		const previousUrl = getPreviousUrlFromSession(req);
		// for success banner
		const actionSuccess = getSessionActionSuccess(req);
		const actionWarning = getSessionActionWarning(req);

		return res.render(
			'views/status/view/view.njk',
			buildCaseStatusViewModel(caseToMigrate, previousUrl, actionSuccess, actionWarning)
		);
	};
}
