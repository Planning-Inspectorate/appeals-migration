import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createDateRange, formatDateToISO, parseDate, parseDateOrUndefined } from '../date.ts';

describe('parseDate', () => {
	test('returns null for null input', () => {
		assert.strictEqual(parseDate(null), null);
	});

	test('returns null for undefined input', () => {
		assert.strictEqual(parseDate(undefined), null);
	});

	test('returns null for empty string', () => {
		assert.strictEqual(parseDate(''), null);
	});

	test('parses valid ISO date string', () => {
		const result = parseDate('2024-01-15T10:00:00Z');
		assert.ok(result instanceof Date);
		assert.strictEqual(result?.toISOString(), '2024-01-15T10:00:00.000Z');
	});

	test('returns null for invalid date string', () => {
		assert.strictEqual(parseDate('not-a-date'), null);
	});

	test('returns Date object unchanged if valid', () => {
		const date = new Date('2024-01-15T10:00:00Z');
		const result = parseDate(date);
		assert.strictEqual(result, date);
	});

	test('returns null for invalid Date object', () => {
		const invalidDate = new Date('invalid');
		assert.strictEqual(parseDate(invalidDate), null);
	});
});

describe('parseDateOrUndefined', () => {
	test('returns undefined for null input', () => {
		assert.strictEqual(parseDateOrUndefined(null), undefined);
	});

	test('returns undefined for undefined input', () => {
		assert.strictEqual(parseDateOrUndefined(undefined), undefined);
	});

	test('returns undefined for empty string', () => {
		assert.strictEqual(parseDateOrUndefined(''), undefined);
	});

	test('parses valid ISO date string', () => {
		const result = parseDateOrUndefined('2024-01-15T10:00:00Z');
		assert.ok(result instanceof Date);
		assert.strictEqual(result?.toISOString(), '2024-01-15T10:00:00.000Z');
	});

	test('returns undefined for invalid date string', () => {
		assert.strictEqual(parseDateOrUndefined('not-a-date'), undefined);
	});

	test('returns Date object unchanged if valid', () => {
		const date = new Date('2024-01-15T10:00:00Z');
		const result = parseDateOrUndefined(date);
		assert.strictEqual(result, date);
	});
});

describe('formatDateToISO', () => {
	test('returns undefined for null input', () => {
		assert.strictEqual(formatDateToISO(null), undefined);
	});

	test('returns undefined for undefined input', () => {
		assert.strictEqual(formatDateToISO(undefined), undefined);
	});

	test('formats valid Date to ISO string', () => {
		const date = new Date('2024-01-15T10:00:00Z');
		assert.strictEqual(formatDateToISO(date), '2024-01-15T10:00:00.000Z');
	});

	test('returns undefined for invalid Date object', () => {
		const invalidDate = new Date('invalid');
		assert.strictEqual(formatDateToISO(invalidDate), undefined);
	});
});

describe('createDateRange', () => {
	test('returns undefined when both from and to are null', () => {
		assert.strictEqual(createDateRange(null, null), undefined);
	});

	test('returns undefined when both from and to are undefined', () => {
		assert.strictEqual(createDateRange(undefined, undefined), undefined);
	});

	test('returns gte only when from is provided', () => {
		const from = new Date('2024-01-01T00:00:00Z');
		const result = createDateRange(from, null);
		assert.deepStrictEqual(result, { gte: '2024-01-01T00:00:00.000Z' });
	});

	test('returns lte only when to is provided', () => {
		const to = new Date('2024-12-31T23:59:59Z');
		const result = createDateRange(null, to);
		assert.deepStrictEqual(result, { lte: '2024-12-31T23:59:59.000Z' });
	});

	test('returns both gte and lte when both are provided', () => {
		const from = new Date('2024-01-01T00:00:00Z');
		const to = new Date('2024-12-31T23:59:59Z');
		const result = createDateRange(from, to);
		assert.deepStrictEqual(result, {
			gte: '2024-01-01T00:00:00.000Z',
			lte: '2024-12-31T23:59:59.000Z'
		});
	});

	test('returns undefined when both dates are invalid', () => {
		const invalidFrom = new Date('invalid');
		const invalidTo = new Date('invalid');
		assert.strictEqual(createDateRange(invalidFrom, invalidTo), undefined);
	});
});
