import assert from 'node:assert';
import { describe, test } from 'node:test';
import { hasAnyValue, nullToUndefined } from '../null-safety.ts';

describe('nullToUndefined', () => {
	test('converts null to undefined', () => {
		assert.strictEqual(nullToUndefined(null), undefined);
	});

	test('preserves non-null values', () => {
		assert.strictEqual(nullToUndefined('hello'), 'hello');
		assert.strictEqual(nullToUndefined(123), 123);
		assert.strictEqual(nullToUndefined(false), false);
	});

	test('preserves undefined', () => {
		assert.strictEqual(nullToUndefined(undefined), undefined);
	});
});

describe('hasAnyValue', () => {
	test('returns false for empty object', () => {
		assert.strictEqual(hasAnyValue({}, ['key1', 'key2']), false);
	});

	test('returns false when all keys are null', () => {
		assert.strictEqual(hasAnyValue({ key1: null, key2: null }, ['key1', 'key2']), false);
	});

	test('returns false when all keys are empty strings', () => {
		assert.strictEqual(hasAnyValue({ key1: '', key2: '' }, ['key1', 'key2']), false);
	});

	test('returns true when at least one key has a value', () => {
		assert.strictEqual(hasAnyValue({ key1: null, key2: 'value' }, ['key1', 'key2']), true);
	});

	test('returns true for zero value', () => {
		assert.strictEqual(hasAnyValue({ key1: 0 }, ['key1']), true);
	});

	test('returns true for false value', () => {
		assert.strictEqual(hasAnyValue({ key1: false }, ['key1']), true);
	});
});
