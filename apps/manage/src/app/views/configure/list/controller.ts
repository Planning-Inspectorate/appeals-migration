import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildListViewModel } from './view-model.ts';

export function buildListParameters(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list migrate parameters');

		const parameters = await db.toMigrateParameter.findMany({
			orderBy: { id: 'asc' }
		});

		// flash messages
		const addCaseSuccess = req.session?.addCaseSuccess;
		delete req.session?.addCaseSuccess;
		const parameterSuccess = req.session?.parameterSuccess;
		delete req.session?.parameterSuccess;

		const viewModel = { ...buildListViewModel(parameters), addCaseSuccess, parameterSuccess };
		return res.render('views/configure/list/view.njk', viewModel);
	};
}
