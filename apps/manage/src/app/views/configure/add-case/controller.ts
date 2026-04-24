import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';

export function buildAddCase(service: ManageService): { get: AsyncRequestHandler; post: AsyncRequestHandler } {
	const { db, logger } = service;

	const get: AsyncRequestHandler = async (_req, res) => {
		logger.info('add case form');
		const viewModel = {
			pageHeading: 'Add a case',
			backLinkUrl: '/configure'
		};
		return res.render('views/configure/add-case/form.njk', viewModel);
	};

	const post: AsyncRequestHandler = async (req, res) => {
		logger.info('add case submit');

		const body = req.body as Record<string, string>;
		const caseReference = body.caseReference?.trim();

		if (!caseReference) {
			return res.redirect('/configure');
		}

		// TODO: verify the case exists in source

		await db.caseToMigrate.createWithDefaults(caseReference);

		logger.info({ caseReference }, 'created case to migrate');
		return res.redirect('/configure');
	};

	return { get, post };
}
