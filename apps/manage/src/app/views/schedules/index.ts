import type { ManageService } from '#service';
import { asyncHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildAddSchedule } from './add/controller.ts';
import { buildDeleteSchedule } from './delete/controller.ts';
import { buildEditSchedule } from './edit/controller.ts';
import { buildListSchedules } from './list/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listSchedules = buildListSchedules(service);
	const addSchedule = buildAddSchedule(service);
	const editSchedule = buildEditSchedule(service);
	const deleteSchedule = buildDeleteSchedule(service);

	router.get('/', asyncHandler(listSchedules));
	router.get('/add', asyncHandler(addSchedule.get));
	router.post('/add', asyncHandler(addSchedule.post));
	router.get('/edit/:id', asyncHandler(editSchedule.get));
	router.post('/edit/:id', asyncHandler(editSchedule.post));
	router.post('/delete/:id', asyncHandler(deleteSchedule));

	return router;
}
