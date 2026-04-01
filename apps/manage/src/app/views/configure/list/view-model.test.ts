import assert from 'node:assert';
import { describe, it } from 'node:test';
import { buildListViewModel } from './view-model.ts';

describe('list/view-model', () => {
	describe('buildListViewModel', () => {
		it('should return the page heading', () => {
			const result = buildListViewModel([]);

			assert.strictEqual(result.pageHeading, 'Configure migration');
		});

		it('should return an empty items array when given no parameters', () => {
			const result = buildListViewModel([]);

			assert.deepStrictEqual(result.items, []);
		});

		it('should map a fully populated parameter', () => {
			const result = buildListViewModel([
				{
					id: 1,
					caseTypeName: 'appeal-s78',
					lpa: 'Q9999',
					procedureType: 'written',
					status: 'closed',
					dateReceivedFrom: new Date('2025-01-01T00:00:00.000Z'),
					dateReceivedTo: new Date('2025-06-30T00:00:00.000Z'),
					decisionDateFrom: new Date('2025-02-01T00:00:00.000Z'),
					decisionDateTo: new Date('2025-07-31T00:00:00.000Z'),
					startDateFrom: new Date('2025-03-01T00:00:00.000Z'),
					startDateTo: new Date('2025-08-31T00:00:00.000Z')
				}
			]);

			assert.strictEqual(result.items.length, 1);
			const item = result.items[0];
			assert.strictEqual(item.id, 1);
			assert.strictEqual(item.caseTypeName, 'appeal-s78');
			assert.strictEqual(item.lpa, 'Q9999');
			assert.strictEqual(item.procedureType, 'written');
			assert.strictEqual(item.status, 'closed');
			assert.strictEqual(item.dateReceived, '01/01/2025 - 30/06/2025');
			assert.strictEqual(item.decisionDate, '01/02/2025 - 31/07/2025');
			assert.strictEqual(item.startDate, '01/03/2025 - 31/08/2025');
		});

		it('should use "any" for null string fields', () => {
			const result = buildListViewModel([
				{
					id: 2,
					caseTypeName: null,
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: null,
					dateReceivedTo: null,
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				}
			]);

			const item = result.items[0];
			assert.strictEqual(item.caseTypeName, 'any');
			assert.strictEqual(item.lpa, 'any');
			assert.strictEqual(item.procedureType, 'any');
			assert.strictEqual(item.status, 'any');
		});

		it('should format date range as "from - to" when both dates present', () => {
			const result = buildListViewModel([
				{
					id: 3,
					caseTypeName: null,
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: new Date('2025-04-01T00:00:00.000Z'),
					dateReceivedTo: new Date('2025-09-30T00:00:00.000Z'),
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				}
			]);

			assert.strictEqual(result.items[0].dateReceived, '01/04/2025 - 30/09/2025');
		});

		it('should format date range as "after from" when only from date present', () => {
			const result = buildListViewModel([
				{
					id: 4,
					caseTypeName: null,
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: new Date('2025-04-01T00:00:00.000Z'),
					dateReceivedTo: null,
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				}
			]);

			assert.strictEqual(result.items[0].dateReceived, 'after 01/04/2025');
		});

		it('should format date range as "before to" when only to date present', () => {
			const result = buildListViewModel([
				{
					id: 5,
					caseTypeName: null,
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: null,
					dateReceivedTo: new Date('2025-09-30T00:00:00.000Z'),
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				}
			]);

			assert.strictEqual(result.items[0].dateReceived, 'before 30/09/2025');
		});

		it('should format date range as "any" when neither date present', () => {
			const result = buildListViewModel([
				{
					id: 6,
					caseTypeName: null,
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: null,
					dateReceivedTo: null,
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				}
			]);

			assert.strictEqual(result.items[0].dateReceived, 'any');
			assert.strictEqual(result.items[0].decisionDate, 'any');
			assert.strictEqual(result.items[0].startDate, 'any');
		});

		it('should map multiple parameters', () => {
			const result = buildListViewModel([
				{
					id: 10,
					caseTypeName: 'type-a',
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: null,
					dateReceivedTo: null,
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				},
				{
					id: 20,
					caseTypeName: 'type-b',
					lpa: null,
					procedureType: null,
					status: null,
					dateReceivedFrom: null,
					dateReceivedTo: null,
					decisionDateFrom: null,
					decisionDateTo: null,
					startDateFrom: null,
					startDateTo: null
				}
			]);

			assert.strictEqual(result.items.length, 2);
			assert.strictEqual(result.items[0].id, 10);
			assert.strictEqual(result.items[0].caseTypeName, 'type-a');
			assert.strictEqual(result.items[1].id, 20);
			assert.strictEqual(result.items[1].caseTypeName, 'type-b');
		});
	});
});
