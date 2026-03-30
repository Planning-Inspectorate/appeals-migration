import type { ManageService } from '#service';
import { asyncHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildListItems } from './list/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listItems = buildListItems(service);

	router.get('/', asyncHandler(listItems));

	return router;
}
