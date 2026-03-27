import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildPaginationItems } from './pagination.ts';

describe('buildPaginationItems', () => {
	it('should return an empty array when totalPages is 1', () => {
		const result = buildPaginationItems(1, 1);
		assert.deepStrictEqual(result, []);
	});

	it('should return an empty array when totalPages is 0', () => {
		const result = buildPaginationItems(1, 0);
		assert.deepStrictEqual(result, []);
	});

	it('should return two items for 2 pages on page 1', () => {
		const result = buildPaginationItems(1, 2);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: true },
			{ number: 2, href: '?page=2', current: false }
		]);
	});

	it('should return two items for 2 pages on page 2', () => {
		const result = buildPaginationItems(2, 2);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ number: 2, href: '?page=2', current: true }
		]);
	});

	it('should return all pages without ellipsis for 3 pages', () => {
		const result = buildPaginationItems(2, 3);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ number: 2, href: '?page=2', current: true },
			{ number: 3, href: '?page=3', current: false }
		]);
	});

	it('should return all pages without ellipsis for 5 pages on page 3', () => {
		const result = buildPaginationItems(3, 5);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ number: 2, href: '?page=2', current: false },
			{ number: 3, href: '?page=3', current: true },
			{ number: 4, href: '?page=4', current: false },
			{ number: 5, href: '?page=5', current: false }
		]);
	});

	it('should show ellipsis after window when on page 1 of many pages', () => {
		const result = buildPaginationItems(1, 10);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: true },
			{ number: 2, href: '?page=2', current: false },
			{ ellipsis: true },
			{ number: 10, href: '?page=10', current: false }
		]);
	});

	it('should show ellipsis before window when on last page of many pages', () => {
		const result = buildPaginationItems(10, 10);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ ellipsis: true },
			{ number: 9, href: '?page=9', current: false },
			{ number: 10, href: '?page=10', current: true }
		]);
	});

	it('should show both ellipsis when in the middle of many pages', () => {
		const result = buildPaginationItems(50, 100);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ ellipsis: true },
			{ number: 49, href: '?page=49', current: false },
			{ number: 50, href: '?page=50', current: true },
			{ number: 51, href: '?page=51', current: false },
			{ ellipsis: true },
			{ number: 100, href: '?page=100', current: false }
		]);
	});

	it('should not show leading ellipsis when on page 2', () => {
		const result = buildPaginationItems(2, 10);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ number: 2, href: '?page=2', current: true },
			{ number: 3, href: '?page=3', current: false },
			{ ellipsis: true },
			{ number: 10, href: '?page=10', current: false }
		]);
	});

	it('should not show leading ellipsis when on page 3', () => {
		const result = buildPaginationItems(3, 10);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ number: 2, href: '?page=2', current: false },
			{ number: 3, href: '?page=3', current: true },
			{ number: 4, href: '?page=4', current: false },
			{ ellipsis: true },
			{ number: 10, href: '?page=10', current: false }
		]);
	});

	it('should not show trailing ellipsis when on second-to-last page', () => {
		const result = buildPaginationItems(9, 10);
		assert.deepStrictEqual(result, [
			{ number: 1, href: '?page=1', current: false },
			{ ellipsis: true },
			{ number: 8, href: '?page=8', current: false },
			{ number: 9, href: '?page=9', current: true },
			{ number: 10, href: '?page=10', current: false }
		]);
	});

	it('should mark only the current page as current', () => {
		const result = buildPaginationItems(5, 200);
		const currentItems = result.filter((item) => 'current' in item && item.current);
		assert.strictEqual(currentItems.length, 1);
		assert.deepStrictEqual(currentItems[0], { number: 5, href: '?page=5', current: true });
	});
});

