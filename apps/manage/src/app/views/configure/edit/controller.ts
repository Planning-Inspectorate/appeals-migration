import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildFormViewModelFromRecord, parseFormBody } from '../form-view-model.ts';

const FORM_TEMPLATE = 'views/configure/form.njk';

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

export function buildEditParameter(service: ManageService): { get: AsyncRequestHandler; post: AsyncRequestHandler } {
	const { db, logger } = service;

	const get: AsyncRequestHandler = async (req, res) => {
		const id = parseId(req.params.id);
		if (id === null) {
			return res.status(400).render('views/errors/404.njk');
		}

		logger.info({ id }, 'edit parameter form');

		const parameter = await db.toMigrateParameter.findUnique({ where: { id } });
		if (!parameter) {
			return res.status(404).render('views/errors/404.njk');
		}

		const viewModel = buildFormViewModelFromRecord(parameter);
		return res.render(FORM_TEMPLATE, viewModel);
	};

	const post: AsyncRequestHandler = async (req, res) => {
		const id = parseId(req.params.id);
		if (id === null) {
			return res.status(400).render('views/errors/404.njk');
		}

		logger.info({ id }, 'edit parameter submit');

		const parameter = await db.toMigrateParameter.findUnique({ where: { id } });
		if (!parameter) {
			return res.status(404).render('views/errors/404.njk');
		}

		const body = req.body as Record<string, string>;
		const data = parseFormBody(body);

		await db.toMigrateParameter.update({
			where: { id },
			data
		});

		logger.info({ id }, 'updated migrate parameter');
		return res.redirect('/configure');
	};

	return { get, post };
}
