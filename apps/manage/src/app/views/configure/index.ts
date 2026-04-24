import type { ManageService } from '#service';
import { asyncHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildAddCase } from './add-case/controller.ts';
import { buildAddParameter } from './add/controller.ts';
import { buildEditParameter } from './edit/controller.ts';
import { buildListParameters } from './list/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listParameters = buildListParameters(service);
	const addParameter = buildAddParameter(service);
	const editParameter = buildEditParameter(service);
	const addCase = buildAddCase(service);

	router.get('/', asyncHandler(listParameters));
	router.get('/add', asyncHandler(addParameter.get));
	router.post('/add', asyncHandler(addParameter.post));
	router.get('/add-case', asyncHandler(addCase.get));
	router.post('/add-case', asyncHandler(addCase.post));
	router.get('/edit/:id', asyncHandler(editParameter.get));
	router.post('/edit/:id', asyncHandler(editParameter.post));

	return router;
}
