import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';

export function buildAddCase(service: ManageService): { get: AsyncRequestHandler; post: AsyncRequestHandler } {
	const { db, logger, sourceDatabaseClient } = service;

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

		// verify the case exists in source and get the caseId
		const sourceCase =
			(await sourceDatabaseClient.appealHas.findFirst({
				where: { caseReference },
				select: { caseId: true }
			})) ??
			(await sourceDatabaseClient.appealS78.findFirst({
				where: { caseReference },
				select: { caseId: true }
			}));

		if (!sourceCase) {
			logger.warn({ caseReference }, 'case not found in source');
			return res.render('views/configure/add-case/form.njk', {
				pageHeading: 'Add a case',
				backLinkUrl: '/configure',
				errorMessage: `Case ${caseReference} not found in source database`
			});
		}

		const sourceCaseId = sourceCase.caseId?.toString();

		await db.caseToMigrate.createWithDefaults(caseReference, sourceCaseId);

		logger.info({ caseReference, sourceCaseId }, 'created case to migrate');

		// for success banner on configure list page
		if (req.session) {
			req.session.addCaseSuccess = caseReference;
		}

		return res.redirect('/configure');
	};

	return { get, post };
}
