import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildFormViewModelForAdd, parseFormBody, validateFormBody } from '../form-view-model.ts';

const FORM_TEMPLATE = 'views/schedules/form.njk';

export function buildAddSchedule(service: ManageService): { get: AsyncRequestHandler; post: AsyncRequestHandler } {
	const { db, logger } = service;

	const get: AsyncRequestHandler = async (_req, res) => {
		logger.info('add schedule form');
		const viewModel = buildFormViewModelForAdd();
		return res.render(FORM_TEMPLATE, viewModel);
	};

	const post: AsyncRequestHandler = async (req, res) => {
		logger.info('add schedule submit');

		const body = req.body as Record<string, string>;
		const validation = validateFormBody(body);

		if (!validation.valid) {
			const viewModel = {
				...buildFormViewModelForAdd({
					startDayIndex: body.startDayIndex || '1',
					startTime: body.startTime || '',
					endDayIndex: body.endDayIndex || '5',
					endTime: body.endTime || ''
				}),
				errors: validation.errors,
				errorSummary: validation.errorSummary
			};
			return res.status(400).render(FORM_TEMPLATE, viewModel);
		}

		const data = parseFormBody(body);

		await db.migrationSchedule.create({ data });

		logger.info('created migration schedule');
		req.session.scheduleSuccess = 'Schedule added successfully.';
		return res.redirect('/schedules');
	};

	return { get, post };
}
