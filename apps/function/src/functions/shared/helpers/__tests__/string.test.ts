import assert from 'node:assert';
import { describe, test } from 'node:test';
import { isNullOrEmpty, normalizeString, trimAndLowercase } from '../string.ts';

describe('normalizeString', () => {
	test('returns null for null input', () => {
		assert.strictEqual(normalizeString(null), null);
	});

	test('returns null for undefined input', () => {
		assert.strictEqual(normalizeString(undefined), null);
	});

	test('returns null for empty string', () => {
		assert.strictEqual(normalizeString(''), null);
	});

	test('returns null for whitespace-only string', () => {
		assert.strictEqual(normalizeString('   '), null);
	});

	test('trims whitespace from string', () => {
		assert.strictEqual(normalizeString('  hello  '), 'hello');
	});

	test('preserves case', () => {
		assert.strictEqual(normalizeString('Hello World'), 'Hello World');
	});
});

describe('trimAndLowercase', () => {
	test('returns null for null input', () => {
		assert.strictEqual(trimAndLowercase(null), null);
	});

	test('returns null for undefined input', () => {
		assert.strictEqual(trimAndLowercase(undefined), null);
	});

	test('returns null for empty string', () => {
		assert.strictEqual(trimAndLowercase(''), null);
	});

	test('returns null for whitespace-only string', () => {
		assert.strictEqual(trimAndLowercase('   '), null);
	});

	test('trims and lowercases string', () => {
		assert.strictEqual(trimAndLowercase('  HELLO WORLD  '), 'hello world');
	});

	test('handles mixed case', () => {
		assert.strictEqual(trimAndLowercase('HeLLo WoRLd'), 'hello world');
	});
});

describe('isNullOrEmpty', () => {
	test('returns true for null', () => {
		assert.strictEqual(isNullOrEmpty(null), true);
	});

	test('returns true for undefined', () => {
		assert.strictEqual(isNullOrEmpty(undefined), true);
	});

	test('returns true for empty string', () => {
		assert.strictEqual(isNullOrEmpty(''), true);
	});

	test('returns true for whitespace-only string', () => {
		assert.strictEqual(isNullOrEmpty('   '), true);
	});

	test('returns false for non-empty string', () => {
		assert.strictEqual(isNullOrEmpty('hello'), false);
	});
});
