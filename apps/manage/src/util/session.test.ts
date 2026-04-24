// @ts-nocheck
import {
	getPreviousUrlFromSession,
	PREVIOUS_URL,
	saveUrlToSession,
	saveUrlToSessionMiddleware
} from '#util/session.ts';
import assert from 'assert';
import { describe, mock, test } from 'node:test';

describe('session', () => {
	describe('saveUrlToSessionMiddleware', () => {
		test('should call next', () => {
			const req = {
				session: {}
			};
			const next = mock.fn();
			saveUrlToSessionMiddleware(req, {}, next);
			assert.strictEqual(next.mock.callCount(), 1);
		});
		test('should add to session if GET', () => {
			const req = {
				method: 'GET',
				url: 'url',
				session: {}
			};
			const next = mock.fn();
			saveUrlToSessionMiddleware(req, {}, next);
			assert.strictEqual(next.mock.callCount(), 1);
			assert.deepStrictEqual(req.session[PREVIOUS_URL], ['url']);
		});
		test('should not add to session if POST', () => {
			const req = {
				method: 'POST',
				url: 'url',
				session: {}
			};
			const next = mock.fn();
			saveUrlToSessionMiddleware(req, {}, next);
			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(req.session[PREVIOUS_URL], undefined);
		});
	});
	describe('saveUrlToSession', () => {
		test('should error if no session', () => {
			assert.throws(
				() => {
					saveUrlToSession({}, 'url');
				},
				{ message: 'request session required' }
			);
		});
		test('should add the URl to a new list', () => {
			const req = {
				session: {}
			};
			saveUrlToSession(req, 'url');
			assert.deepStrictEqual(req.session[PREVIOUS_URL], ['url']);
		});
		test('should add the URl an existing list', () => {
			const req = {
				session: {
					[PREVIOUS_URL]: ['url-2']
				}
			};
			saveUrlToSession(req, 'url');
			assert.deepStrictEqual(req.session[PREVIOUS_URL], ['url-2', 'url']);
		});
		test('should keep the list to 2', () => {
			const req = {
				session: {
					[PREVIOUS_URL]: ['url-2', 'url-3']
				}
			};
			saveUrlToSession(req, 'url');
			assert.deepStrictEqual(req.session[PREVIOUS_URL], ['url-3', 'url']);
		});
	});
	describe('getPreviousUrlFromSession', () => {
		test('should default to null if no session', () => {
			const got = getPreviousUrlFromSession({});
			assert.strictEqual(got, null);
		});
		test('should default to null if empty array', () => {
			const got = getPreviousUrlFromSession({
				session: {
					[PREVIOUS_URL]: []
				}
			});
			assert.strictEqual(got, null);
		});
		test('should default to null if single array item', () => {
			const got = getPreviousUrlFromSession({
				session: {
					[PREVIOUS_URL]: ['url']
				}
			});
			assert.strictEqual(got, null);
		});
		test('should default to null if same URL as current', () => {
			const got = getPreviousUrlFromSession({
				url: 'url-1',
				session: {
					[PREVIOUS_URL]: ['url-1', 'url-2']
				}
			});
			assert.strictEqual(got, null);
		});
		test('should return previous if 2 items', () => {
			const got = getPreviousUrlFromSession({
				session: {
					[PREVIOUS_URL]: ['/previous-url', 'url']
				}
			});
			assert.strictEqual(got, '/previous-url');
		});
	});
});
