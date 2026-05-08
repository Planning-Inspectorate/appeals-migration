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

export function buildDeleteParameter(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;

	return async (req, res) => {
		const id = parseId(req.params.id);
		if (id === null) {
			return res.status(400).render('views/errors/404.njk');
		}

		logger.info({ id }, 'delete parameter');

		const parameter = await db.toMigrateParameter.findUnique({ where: { id } });
		if (!parameter) {
			return res.status(404).render('views/errors/404.njk');
		}

		await db.toMigrateParameter.delete({ where: { id } });

		logger.info({ id }, 'deleted migration parameter');
		req.session.parameterSuccess = 'Parameter deleted successfully.';
		return res.redirect('/configure');
	};
}
