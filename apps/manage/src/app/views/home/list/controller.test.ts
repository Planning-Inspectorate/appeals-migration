import { mockLogger } from '@pins/appeals-migration-lib/testing/mock-logger.ts';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { configureNunjucks } from '../../../nunjucks.ts';
import { buildListItems } from './controller.ts';

describe('list items', () => {
	it('should render without error', async () => {
		const nunjucks = configureNunjucks();
		// mock response that calls nunjucks to render a result
		const mockRes = {
			render: mock.fn((view, data) => nunjucks.render(view, data))
		};
		const mockDb = {
			caseToMigrate: {
				count: mock.fn(),
				findMany: mock.fn(() => [])
			}
		};
		const listItems = buildListItems({ db: mockDb, logger: mockLogger() });
		await assert.doesNotReject(() => listItems({}, mockRes));
		assert.strictEqual(mockRes.render.mock.callCount(), 1);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments.length, 2);
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/home/list/view.njk');
		assert.strictEqual(mockRes.render.mock.calls[0].arguments[1].pageHeading, 'Migration status');
	});
});
