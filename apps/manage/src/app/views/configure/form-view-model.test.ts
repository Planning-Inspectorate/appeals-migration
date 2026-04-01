import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
	buildFormViewModelForAdd,
	buildFormViewModelFromRecord,
	parseFormBody,
	PROCEDURE_OPTIONS,
	STATUS_OPTIONS
} from './form-view-model.ts';

describe('form-view-model', () => {
	describe('buildFormViewModelForAdd', () => {
		it('should return a view model for adding a new parameter', () => {
			const result = buildFormViewModelForAdd();

			assert.strictEqual(result.pageHeading, 'Add migration parameter');
			assert.strictEqual(result.backLinkUrl, '/configure');
			assert.strictEqual(result.actionUrl, '/configure/add');
			assert.strictEqual(result.isEdit, false);
			assert.deepStrictEqual(result.values, {
				caseTypeName: '',
				lpa: '',
				procedureType: '',
				status: '',
				dateReceivedFrom: '',
				dateReceivedTo: '',
				decisionDateFrom: '',
				decisionDateTo: '',
				startDateFrom: '',
				startDateTo: ''
			});
			assert.strictEqual(result.errors, undefined);
			assert.strictEqual(result.errorSummary, undefined);
		});

		it('should include status options with "Any" selected by default', () => {
			const result = buildFormViewModelForAdd();

			assert.strictEqual(result.statusOptions[0].value, '');
			assert.strictEqual(result.statusOptions[0].text, 'Any');
			assert.strictEqual(result.statusOptions[0].selected, true);
			assert.strictEqual(result.statusOptions.length, STATUS_OPTIONS.length + 1);
			assert.ok(result.statusOptions.slice(1).every((o) => !o.selected));
		});

		it('should include procedure options with "Any" selected by default', () => {
			const result = buildFormViewModelForAdd();

			assert.strictEqual(result.procedureOptions[0].value, '');
			assert.strictEqual(result.procedureOptions[0].text, 'Any');
			assert.strictEqual(result.procedureOptions[0].selected, true);
			assert.strictEqual(result.procedureOptions.length, PROCEDURE_OPTIONS.length + 1);
			assert.ok(result.procedureOptions.slice(1).every((o) => !o.selected));
		});

		it('should use full names for procedure options', () => {
			const result = buildFormViewModelForAdd();

			const wr = result.procedureOptions.find((o) => o.value === 'WR');
			const li = result.procedureOptions.find((o) => o.value === 'LI');
			const ih = result.procedureOptions.find((o) => o.value === 'IH');
			assert.strictEqual(wr?.text, 'Written representations');
			assert.strictEqual(li?.text, 'Inquiry');
			assert.strictEqual(ih?.text, 'Hearing');
		});
	});

	describe('buildFormViewModelFromRecord', () => {
		it('should populate values from a full record', () => {
			const record = {
				id: 42,
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
			};

			const result = buildFormViewModelFromRecord(record);

			assert.strictEqual(result.pageHeading, 'Edit parameter 42');
			assert.strictEqual(result.backLinkUrl, '/configure');
			assert.strictEqual(result.actionUrl, '/configure/edit/42');
			assert.strictEqual(result.isEdit, true);
			assert.deepStrictEqual(result.values, {
				caseTypeName: 'appeal-s78',
				lpa: 'Q9999',
				procedureType: 'written',
				status: 'closed',
				dateReceivedFrom: '2025-01-01',
				dateReceivedTo: '2025-06-30',
				decisionDateFrom: '2025-02-01',
				decisionDateTo: '2025-07-31',
				startDateFrom: '2025-03-01',
				startDateTo: '2025-08-31'
			});
		});

		it('should use empty strings for null fields', () => {
			const record = {
				id: 1,
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
			};

			const result = buildFormViewModelFromRecord(record);

			assert.deepStrictEqual(result.values, {
				caseTypeName: '',
				lpa: '',
				procedureType: '',
				status: '',
				dateReceivedFrom: '',
				dateReceivedTo: '',
				decisionDateFrom: '',
				decisionDateTo: '',
				startDateFrom: '',
				startDateTo: ''
			});
		});

		it('should select the matching status option', () => {
			const record = {
				id: 1,
				caseTypeName: null,
				lpa: null,
				procedureType: null,
				status: 'Decision Issued',
				dateReceivedFrom: null,
				dateReceivedTo: null,
				decisionDateFrom: null,
				decisionDateTo: null,
				startDateFrom: null,
				startDateTo: null
			};

			const result = buildFormViewModelFromRecord(record);

			const selected = result.statusOptions.filter((o) => o.selected);
			assert.strictEqual(selected.length, 1);
			assert.strictEqual(selected[0].value, 'Decision Issued');
		});

		it('should select the matching procedure option', () => {
			const record = {
				id: 1,
				caseTypeName: null,
				lpa: null,
				procedureType: 'IH',
				status: null,
				dateReceivedFrom: null,
				dateReceivedTo: null,
				decisionDateFrom: null,
				decisionDateTo: null,
				startDateFrom: null,
				startDateTo: null
			};

			const result = buildFormViewModelFromRecord(record);

			const selected = result.procedureOptions.filter((o) => o.selected);
			assert.strictEqual(selected.length, 1);
			assert.strictEqual(selected[0].value, 'IH');
			assert.strictEqual(selected[0].text, 'Hearing');
		});

		it('should select "Any" when status is null', () => {
			const record = {
				id: 1,
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
			};

			const result = buildFormViewModelFromRecord(record);

			const selected = result.statusOptions.filter((o) => o.selected);
			assert.strictEqual(selected.length, 1);
			assert.strictEqual(selected[0].value, '');
			assert.strictEqual(selected[0].text, 'Any');
		});
	});

	describe('parseFormBody', () => {
		it('should parse a fully populated form body', () => {
			const body = {
				caseTypeName: 'appeal-s78',
				lpa: 'Q9999',
				procedureType: 'written',
				status: 'closed',
				dateReceivedFrom: '2025-01-01',
				dateReceivedTo: '2025-06-30',
				decisionDateFrom: '2025-02-01',
				decisionDateTo: '2025-07-31',
				startDateFrom: '2025-03-01',
				startDateTo: '2025-08-31'
			};

			const result = parseFormBody(body);

			assert.strictEqual(result.caseTypeName, 'appeal-s78');
			assert.strictEqual(result.lpa, 'Q9999');
			assert.strictEqual(result.procedureType, 'written');
			assert.strictEqual(result.status, 'closed');
			assert.deepStrictEqual(result.dateReceivedFrom, new Date('2025-01-01T00:00:00.000Z'));
			assert.deepStrictEqual(result.dateReceivedTo, new Date('2025-06-30T00:00:00.000Z'));
			assert.deepStrictEqual(result.decisionDateFrom, new Date('2025-02-01T00:00:00.000Z'));
			assert.deepStrictEqual(result.decisionDateTo, new Date('2025-07-31T00:00:00.000Z'));
			assert.deepStrictEqual(result.startDateFrom, new Date('2025-03-01T00:00:00.000Z'));
			assert.deepStrictEqual(result.startDateTo, new Date('2025-08-31T00:00:00.000Z'));
		});

		it('should return null for empty string fields', () => {
			const body = {
				caseTypeName: '',
				lpa: '',
				procedureType: '',
				status: '',
				dateReceivedFrom: '',
				dateReceivedTo: '',
				decisionDateFrom: '',
				decisionDateTo: '',
				startDateFrom: '',
				startDateTo: ''
			};

			const result = parseFormBody(body);

			assert.strictEqual(result.caseTypeName, null);
			assert.strictEqual(result.lpa, null);
			assert.strictEqual(result.procedureType, null);
			assert.strictEqual(result.status, null);
			assert.strictEqual(result.dateReceivedFrom, null);
			assert.strictEqual(result.dateReceivedTo, null);
			assert.strictEqual(result.decisionDateFrom, null);
			assert.strictEqual(result.decisionDateTo, null);
			assert.strictEqual(result.startDateFrom, null);
			assert.strictEqual(result.startDateTo, null);
		});

		it('should trim whitespace from string fields', () => {
			const body = {
				caseTypeName: '  appeal-s78  ',
				lpa: '  Q9999  ',
				procedureType: '  written  ',
				status: '  closed  ',
				dateReceivedFrom: '',
				dateReceivedTo: '',
				decisionDateFrom: '',
				decisionDateTo: '',
				startDateFrom: '',
				startDateTo: ''
			};

			const result = parseFormBody(body);

			assert.strictEqual(result.caseTypeName, 'appeal-s78');
			assert.strictEqual(result.lpa, 'Q9999');
			assert.strictEqual(result.procedureType, 'written');
			assert.strictEqual(result.status, 'closed');
		});

		it('should return null for whitespace-only string fields', () => {
			const body = {
				caseTypeName: '   ',
				lpa: '   ',
				procedureType: '   ',
				status: '   ',
				dateReceivedFrom: '',
				dateReceivedTo: '',
				decisionDateFrom: '',
				decisionDateTo: '',
				startDateFrom: '',
				startDateTo: ''
			};

			const result = parseFormBody(body);

			assert.strictEqual(result.caseTypeName, null);
			assert.strictEqual(result.lpa, null);
			assert.strictEqual(result.procedureType, null);
			assert.strictEqual(result.status, null);
		});

		it('should produce deterministic UTC midnight dates', () => {
			const body = {
				caseTypeName: '',
				lpa: '',
				procedureType: '',
				status: '',
				dateReceivedFrom: '2025-06-15',
				dateReceivedTo: '',
				decisionDateFrom: '',
				decisionDateTo: '',
				startDateFrom: '',
				startDateTo: ''
			};

			const result = parseFormBody(body);

			assert.ok(result.dateReceivedFrom);
			assert.strictEqual(result.dateReceivedFrom.toISOString(), '2025-06-15T00:00:00.000Z');
		});
	});
});
