import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildFormViewModelForAdd, parseFormBody } from '../form-view-model.ts';

const FORM_TEMPLATE = 'views/configure/form.njk';

export function buildAddParameter(service: ManageService): { get: AsyncRequestHandler; post: AsyncRequestHandler } {
	const { db, logger } = service;

	const get: AsyncRequestHandler = async (_req, res) => {
		logger.info('add parameter form');
		const viewModel = buildFormViewModelForAdd();
		return res.render(FORM_TEMPLATE, viewModel);
	};

	const post: AsyncRequestHandler = async (req, res) => {
		logger.info('add parameter submit');

		const body = req.body as Record<string, string>;
		const data = parseFormBody(body);

		const created = await db.toMigrateParameter.create({ data });

		logger.info({ id: created.id }, 'created migrate parameter');
		return res.redirect('/configure');
	};

	return { get, post };
}
