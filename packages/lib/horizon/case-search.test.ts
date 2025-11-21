import { describe, it } from 'node:test';
import {
	caseSearchRequest,
	cleanCaseSearchResponse,
	cleanCaseSearchSummaryResponse,
	deleteCaseSearchSummaryUnusedKeys
} from './case-search.ts';
import assert from 'node:assert';
import { readTestFile, snapshotOptions, snapshotPath } from './util.test.ts';

describe('case-search', () => {
	describe('cleanCaseSearchResponse', () => {
		it('should convert CaseSearchResult object to array and remove HorizonSearchResult keys', async (ctx) => {
			const got = cleanCaseSearchResponse(await readTestFile('./testing/case-search-example-1.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-case-search-1.json'), snapshotOptions);
		});

		it('should handle empty CaseSearchResult', async (ctx) => {
			const got = cleanCaseSearchResponse(await readTestFile('./testing/case-search-example-2.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-case-search-2.json'), snapshotOptions);
		});
	});
	describe('caseSearchRequest', () => {
		it('should create a valid request payload with required fields', () => {
			const input = {
				criteria: {
					CaseReference: 'ABC123',
					CaseType: 'TypeA',
					LPA: 'LPA1'
				}
			};
			const result = JSON.parse(caseSearchRequest(input));
			assert.strictEqual(result.CaseSearch.__soap_op, 'http://tempuri.org/IHorizon/CaseSearch');
			assert.strictEqual(result.CaseSearch.__xmlns, 'http://tempuri.org/');
			assert.strictEqual(result.CaseSearch.sortByAttribute, 'None');
			assert.strictEqual(result.CaseSearch.sortAscending, 'false');
			assert.strictEqual(result.CaseSearch.wantPublishedOnly, 'false');
			assert.strictEqual(result.CaseSearch.criteria['hzn:CaseReference'], 'ABC123');
			assert.strictEqual(result.CaseSearch.criteria['hzn:CaseType'], 'TypeA');
			assert.strictEqual(result.CaseSearch.criteria['hzn:LPA'], 'LPA1');
		});

		it('should use optional sort and publish fields if provided', () => {
			const input = {
				criteria: {},
				sortByAttribute: 'CaseReference',
				sortAscending: 'true',
				wantPublishedOnly: 'true'
			};
			const result = JSON.parse(caseSearchRequest(input));
			assert.strictEqual(result.CaseSearch.sortByAttribute, 'CaseReference');
			assert.strictEqual(result.CaseSearch.sortAscending, 'true');
			assert.strictEqual(result.CaseSearch.wantPublishedOnly, 'true');
		});

		it('should prefix all criteria keys with hzn:', () => {
			const input = {
				criteria: {
					CaseReference: 'XYZ',
					Status: 'Open'
				}
			};
			const result = JSON.parse(caseSearchRequest(input));
			assert.ok('hzn:CaseReference' in result.CaseSearch.criteria);
			assert.ok('hzn:Status' in result.CaseSearch.criteria);
			assert.ok(!('CaseReference' in result.CaseSearch.criteria));
			assert.ok(!('Status' in result.CaseSearch.criteria));
		});
	});
	describe('cleanCaseSearchSummaryResponse', () => {
		it('should convert CaseSearchSummaryDetailsResult object to array and remove HorizonSearchResult2 keys', async (ctx) => {
			const got = cleanCaseSearchSummaryResponse(await readTestFile('./testing/case-search-summary-example-1.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-case-search-summary-1.json'), snapshotOptions);
		});
	});
	describe('deleteCaseSearchSummaryUnusedKeys', () => {
		it('should remove unused keys', async (ctx) => {
			const res = cleanCaseSearchSummaryResponse(await readTestFile('./testing/case-search-summary-example-1.json'));
			const got = JSON.parse(res)?.Envelope?.Body?.CaseSearchSummaryDetailsResponse?.CaseSearchSummaryDetailsResult;
			deleteCaseSearchSummaryUnusedKeys(got);
			ctx.assert.fileSnapshot(
				JSON.stringify(got, null, 2),
				snapshotPath('clean-case-search-summary-keys-1.json'),
				snapshotOptions
			);
		});
	});
});
