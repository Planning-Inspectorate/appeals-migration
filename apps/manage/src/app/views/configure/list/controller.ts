import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildListViewModel } from './view-model.ts';

export function buildListParameters(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (_req, res) => {
		logger.info('list migrate parameters');

		const parameters = await db.toMigrateParameter.findMany({
			orderBy: { id: 'asc' }
		});

		const viewModel = buildListViewModel(parameters);
		return res.render('views/configure/list/view.njk', viewModel);
	};
}
