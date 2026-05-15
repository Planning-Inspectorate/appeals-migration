import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildDocumentsDetailViewModel } from './view-model.ts';

export function buildViewDocuments(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		const caseReference = Array.isArray(req.params.caseReference)
			? req.params.caseReference.join('/')
			: req.params.caseReference;
		logger.info({ caseReference }, 'view document migration status');

		if (!caseReference) {
			return res.status(404).render('views/errors/404.njk');
		}

		const caseToMigrate = await db.caseToMigrate.findUnique({
			where: { caseReference },
			include: {
				DocumentToMigrate: {
					include: { MigrationStep: true }
				}
			}
		});

		if (!caseToMigrate) {
			return res.status(404).render('views/errors/404.njk');
		}

		const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;

		return res.render(
			'views/status/view/documents/documents.njk',
			buildDocumentsDetailViewModel(caseReference, caseToMigrate.DocumentToMigrate, statusFilter)
		);
	};
}
