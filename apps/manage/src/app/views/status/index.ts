import type { ManageService } from '#service';
import { asyncHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildListItems } from './list/controller.ts';
import { buildViewCase } from './view/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listItems = buildListItems(service);
	const viewCase = buildViewCase(service);

	router.get('/', asyncHandler(listItems));
	router.get('/case/:caseReference', asyncHandler(viewCase));

	return router;
}
