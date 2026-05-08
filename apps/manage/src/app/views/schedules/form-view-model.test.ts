import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
	buildFormViewModelForAdd,
	buildFormViewModelForEdit,
	parseFormBody,
	validateFormBody
} from './form-view-model.ts';

const validBody = {
	startDayIndex: '1',
	startTime: '09:00',
	endDayIndex: '5',
	endTime: '17:00'
};

describe('schedules/form-view-model', () => {
	describe('validateFormBody', () => {
		test('returns valid for a complete body', () => {
			const result = validateFormBody(validBody);
			assert.strictEqual(result.valid, true);
			assert.deepStrictEqual(result.errors, {});
			assert.deepStrictEqual(result.errorSummary, []);
		});

		test('accepts all valid day values (0-6)', () => {
			for (const day of ['0', '1', '2', '3', '4', '5', '6']) {
				const result = validateFormBody({ ...validBody, startDayIndex: day, endDayIndex: day });
				assert.strictEqual(result.valid, true, `day ${day} should be valid`);
			}
		});

		test('rejects missing startDayIndex', () => {
			const result = validateFormBody({ ...validBody, startDayIndex: '' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.startDayIndex);
			assert.strictEqual(result.errorSummary.length, 1);
		});

		test('rejects invalid startDayIndex', () => {
			const result = validateFormBody({ ...validBody, startDayIndex: '7' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.startDayIndex);
		});

		test('rejects missing startTime', () => {
			const result = validateFormBody({ ...validBody, startTime: '' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.startTime);
		});

		test('rejects invalid startTime format', () => {
			const result = validateFormBody({ ...validBody, startTime: '9:00' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.startTime);
		});

		test('rejects hours out of range (25:00)', () => {
			const result = validateFormBody({ ...validBody, startTime: '25:00' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.startTime);
		});

		test('rejects hours out of range (99:00)', () => {
			const result = validateFormBody({ ...validBody, startTime: '99:00' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.startTime);
		});

		test('rejects minutes out of range (12:60)', () => {
			const result = validateFormBody({ ...validBody, endTime: '12:60' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.endTime);
		});

		test('accepts boundary time values', () => {
			assert.strictEqual(validateFormBody({ ...validBody, startTime: '00:00' }).valid, true);
			assert.strictEqual(validateFormBody({ ...validBody, startTime: '23:59' }).valid, true);
			assert.strictEqual(validateFormBody({ ...validBody, endTime: '00:00' }).valid, true);
			assert.strictEqual(validateFormBody({ ...validBody, endTime: '23:59' }).valid, true);
		});

		test('rejects missing endDayIndex', () => {
			const result = validateFormBody({ ...validBody, endDayIndex: '' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.endDayIndex);
		});

		test('rejects missing endTime', () => {
			const result = validateFormBody({ ...validBody, endTime: '' });
			assert.strictEqual(result.valid, false);
			assert.ok(result.errors.endTime);
		});

		test('returns multiple errors when multiple fields are invalid', () => {
			const result = validateFormBody({ startDayIndex: '', startTime: '', endDayIndex: '', endTime: '' });
			assert.strictEqual(result.valid, false);
			assert.strictEqual(Object.keys(result.errors).length, 4);
			assert.strictEqual(result.errorSummary.length, 4);
		});

		test('error summary hrefs point to field IDs', () => {
			const result = validateFormBody({ startDayIndex: '', startTime: '', endDayIndex: '', endTime: '' });
			const hrefs = result.errorSummary.map((e) => e.href);
			assert.deepStrictEqual(hrefs, ['#startDayIndex', '#startTime', '#endDayIndex', '#endTime']);
		});

		test('trims whitespace from time values', () => {
			const result = validateFormBody({ ...validBody, startTime: ' 09:00 ', endTime: ' 17:00 ' });
			assert.strictEqual(result.valid, true);
		});
	});

	describe('parseFormBody', () => {
		test('parses a valid body into Prisma-compatible data', () => {
			const result = parseFormBody(validBody);
			assert.deepStrictEqual(result, {
				startDayIndex: 1,
				startTime: '09:00',
				endDayIndex: 5,
				endTime: '17:00'
			});
		});

		test('trims whitespace from time values', () => {
			const result = parseFormBody({ ...validBody, startTime: ' 10:30 ', endTime: ' 18:00 ' });
			assert.strictEqual(result.startTime, '10:30');
			assert.strictEqual(result.endTime, '18:00');
		});

		test('defaults empty time to 00:00', () => {
			const result = parseFormBody({ ...validBody, startTime: '', endTime: '' });
			assert.strictEqual(result.startTime, '00:00');
			assert.strictEqual(result.endTime, '00:00');
		});
	});

	describe('buildFormViewModelForAdd', () => {
		test('returns defaults when no values provided', () => {
			const vm = buildFormViewModelForAdd();
			assert.strictEqual(vm.pageHeading, 'Add migration schedule');
			assert.strictEqual(vm.isEdit, false);
			assert.strictEqual(vm.actionUrl, '/schedules/add');
			assert.strictEqual(vm.values.startDayIndex, '1');
			assert.strictEqual(vm.values.startTime, '09:00');
			assert.strictEqual(vm.values.endDayIndex, '5');
			assert.strictEqual(vm.values.endTime, '17:00');
		});

		test('uses provided values and selects matching day options', () => {
			const vm = buildFormViewModelForAdd({
				startDayIndex: '3',
				startTime: '10:00',
				endDayIndex: '4',
				endTime: '16:00'
			});
			assert.strictEqual(vm.values.startDayIndex, '3');
			assert.strictEqual(vm.values.startTime, '10:00');
			const selectedStart = vm.startDayOptions.find((o) => o.selected);
			assert.strictEqual(selectedStart?.value, '3');
			const selectedEnd = vm.endDayOptions.find((o) => o.selected);
			assert.strictEqual(selectedEnd?.value, '4');
		});
	});

	describe('buildFormViewModelForEdit', () => {
		test('populates view model from schedule data', () => {
			const vm = buildFormViewModelForEdit(42, {
				startDayIndex: 2,
				startTime: '08:00',
				endDayIndex: 6,
				endTime: '20:00'
			});
			assert.strictEqual(vm.pageHeading, 'Edit schedule 42');
			assert.strictEqual(vm.isEdit, true);
			assert.strictEqual(vm.actionUrl, '/schedules/edit/42');
			assert.strictEqual(vm.values.startDayIndex, '2');
			assert.strictEqual(vm.values.endDayIndex, '6');
			const selectedStart = vm.startDayOptions.find((o) => o.selected);
			assert.strictEqual(selectedStart?.value, '2');
		});
	});
});
