import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildListViewModel } from './view-model.ts';

export function buildListSchedules(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list migration schedules');

		const schedules = await db.migrationSchedule.findMany({
			orderBy: { id: 'asc' }
		});

		const scheduleSuccess = req.session?.scheduleSuccess;
		delete req.session?.scheduleSuccess;

		const viewModel = { ...buildListViewModel(schedules), scheduleSuccess };
		return res.render('views/schedules/list/view.njk', viewModel);
	};
}
