import assert from 'node:assert';
import { describe, test } from 'node:test';
import { parseNumber } from '../number.ts';

describe('parseNumber', () => {
	test('returns undefined for null', () => {
		assert.strictEqual(parseNumber(null), undefined);
	});

	test('returns undefined for undefined', () => {
		assert.strictEqual(parseNumber(undefined), undefined);
	});

	test('parses integer string', () => {
		assert.strictEqual(parseNumber('42'), 42);
	});

	test('parses float string', () => {
		assert.strictEqual(parseNumber('3.14'), 3.14);
	});

	test('returns undefined for non-numeric string', () => {
		assert.strictEqual(parseNumber('not-a-number'), undefined);
	});

	test('passes through number value', () => {
		assert.strictEqual(parseNumber(7), 7);
	});

	test('handles Decimal-like object with toNumber()', () => {
		const decimal = { toNumber: () => 2.5 };
		assert.strictEqual(parseNumber(decimal as any), 2.5);
	});

	test('returns undefined for NaN string', () => {
		assert.strictEqual(parseNumber('NaN'), undefined);
	});
});
