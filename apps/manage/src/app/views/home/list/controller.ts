import type { ManageService } from '#service';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { buildPaginationItems } from './pagination.ts';

const PAGE_SIZE = 50;

export function buildListItems(service: ManageService): AsyncRequestHandler {
	const { db, logger } = service;
	return async (req, res) => {
		logger.info('list items');

		const page = Math.max(1, parseInt(String(req.query?.page), 10) || 1);
		const search = typeof req.query?.search === 'string' ? req.query.search.trim() : '';
		const skip = (page - 1) * PAGE_SIZE;

		const where = search ? { caseReference: { contains: search } } : undefined;

		const [totalItems, cases] = await Promise.all([
			db.caseToMigrate.count({ where }),
			db.caseToMigrate.findMany({
				where,
				include: {
					DataStep: true,
					DocumentListStep: true,
					DocumentsStep: true,
					ValidationStep: true
				},
				orderBy: { caseReference: 'asc' },
				take: PAGE_SIZE,
				skip
			})
		]);

		const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

		const items = cases.map((c) => ({
			caseReference: c.caseReference,
			dataStatus: c.DataStep.status,
			documentListStatus: c.DocumentListStep.status,
			documentsStatus: c.DocumentsStep.status,
			validationStatus: c.ValidationStep.status
		}));

		const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
		const paginationItems = buildPaginationItems(page, totalPages, searchParam);

		return res.render('views/home/list/view.njk', {
			pageHeading: 'Migration status',
			search,
			items,
			pagination: {
				previous: page > 1 ? { href: `?page=${page - 1}${searchParam}` } : undefined,
				next: page < totalPages ? { href: `?page=${page + 1}${searchParam}` } : undefined,
				items: paginationItems.length > 0 ? paginationItems : undefined
			}
		});
	};
}
