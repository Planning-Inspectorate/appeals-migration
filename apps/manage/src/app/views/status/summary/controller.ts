import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildSummaryViewModel } from './view-model.ts';

function countByStatus(db: ManageService['db'], relation: string) {
	return db.migrationStep.groupBy({
		by: ['status'],
		where: { [relation]: { isNot: null } },
		_count: { status: true }
	});
}

export function buildSummary(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (_req, res) => {
		logger.info('migration summary');

		const [totalCases, data, documentList, documents, validation] = await Promise.all([
			db.caseToMigrate.count(),
			countByStatus(db, 'DataStepCase'),
			countByStatus(db, 'DocumentListStepCase'),
			countByStatus(db, 'DocumentsStepCase'),
			countByStatus(db, 'ValidationStepCase')
		]);

		const viewModel = buildSummaryViewModel(totalCases, { data, documentList, documents, validation });
		return res.render('views/status/summary/view.njk', viewModel);
	};
}
