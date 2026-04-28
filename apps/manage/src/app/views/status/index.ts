import type { ManageService } from '#service';
import { asyncHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import type { IRouter } from 'express';
import { Router as createRouter } from 'express';
import { buildActionController } from './action/controller.ts';
import { buildListItems } from './list/controller.ts';
import { buildSummary } from './summary/controller.ts';
import { buildViewCase } from './view/controller.ts';

export function createRoutes(service: ManageService): IRouter {
	const router = createRouter({ mergeParams: true });
	const listItems = buildListItems(service);
	const viewCase = buildViewCase(service);
	const summary = buildSummary(service);
	const actions = buildActionController(service);

	router.get('/', asyncHandler(summary));
	router.get('/cases', asyncHandler(listItems));
	router.get('/case/:caseReference', asyncHandler(viewCase));
	router.post('/case/:caseReference/migrate/:migrationAction', asyncHandler(actions));

	return router;
}
