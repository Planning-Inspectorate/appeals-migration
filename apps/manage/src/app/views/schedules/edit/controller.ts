import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildFormViewModelForEdit, parseFormBody, validateFormBody } from '../form-view-model.ts';

const FORM_TEMPLATE = 'views/schedules/form.njk';

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

export function buildEditSchedule(service: ManageService): { get: AsyncRequestHandler; post: AsyncRequestHandler } {
	const { db, logger } = service;

	const get: AsyncRequestHandler = async (req, res) => {
		const id = parseId(req.params.id);
		if (id === null) {
			return res.status(400).render('views/errors/404.njk');
		}

		logger.info({ id }, 'edit schedule form');

		const schedule = await db.migrationSchedule.findUnique({ where: { id } });
		if (!schedule) {
			return res.status(404).render('views/errors/404.njk');
		}

		const viewModel = buildFormViewModelForEdit(schedule.id, schedule);
		return res.render(FORM_TEMPLATE, viewModel);
	};

	const post: AsyncRequestHandler = async (req, res) => {
		const id = parseId(req.params.id);
		if (id === null) {
			return res.status(400).render('views/errors/404.njk');
		}

		logger.info({ id }, 'edit schedule submit');

		const schedule = await db.migrationSchedule.findUnique({ where: { id } });
		if (!schedule) {
			return res.status(404).render('views/errors/404.njk');
		}

		const body = req.body as Record<string, string>;
		const validation = validateFormBody(body);

		if (!validation.valid) {
			const startDayIndex = parseInt(body.startDayIndex, 10);
			const endDayIndex = parseInt(body.endDayIndex, 10);
			const viewModel = {
				...buildFormViewModelForEdit(id, {
					startDayIndex: isNaN(startDayIndex) ? schedule.startDayIndex : startDayIndex,
					startTime: body.startTime || schedule.startTime,
					endDayIndex: isNaN(endDayIndex) ? schedule.endDayIndex : endDayIndex,
					endTime: body.endTime || schedule.endTime
				}),
				errors: validation.errors,
				errorSummary: validation.errorSummary
			};
			return res.status(400).render(FORM_TEMPLATE, viewModel);
		}

		const data = parseFormBody(body);

		await db.migrationSchedule.update({
			where: { id },
			data
		});

		logger.info({ id }, 'updated migration schedule');
		req.session.scheduleSuccess = 'Schedule updated successfully.';
		return res.redirect('/schedules');
	};

	return { get, post };
}
