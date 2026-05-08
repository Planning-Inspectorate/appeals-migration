import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';

function parseId(raw: string | string[]): number | null {
	if (typeof raw !== 'string') {
		return null;
	}
	const id = parseInt(raw, 10);
	if (isNaN(id) || String(id) !== raw) {
		return null;
	}
	return id;
}

export function buildDeleteSchedule(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		const id = parseId(req.params.id);
		if (id === null) {
			return res.status(400).render('views/errors/404.njk');
		}

		logger.info({ id }, 'delete schedule');

		const schedule = await db.migrationSchedule.findUnique({ where: { id } });
		if (!schedule) {
			return res.status(404).render('views/errors/404.njk');
		}

		await db.migrationSchedule.delete({ where: { id } });

		logger.info({ id }, 'deleted migration schedule');
		req.session.scheduleSuccess = 'Schedule deleted successfully.';
		return res.redirect('/schedules');
	};
}
