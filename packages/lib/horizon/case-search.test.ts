import { describe, it } from 'node:test';
import { caseSearchRequest, processCaseSearchResponse } from './case-search.ts';
import assert from 'node:assert';

describe('case-search', () => {
	describe('processCaseSearchResponse', () => {
		it('should convert CaseSearchResult object to array and remove HorizonSearchResult keys', () => {
			const input = `{"CaseSearchResult":\t{"HorizonSearchResult":{"id": 1},"HorizonSearchResult": {"id": 2}\n\t\t\t\t}\n\t\t\t\t\t}`;
			const expected = `{"CaseSearchResult":\t[{"id": 1}, {"id": 2}\n\t\t\t\t]\n\t\t\t\t\t}`;
			const result = processCaseSearchResponse(input);
			assert.strictEqual(result, expected);
		});

		it('should handle empty CaseSearchResult', () => {
			const input = `{"CaseSearchResult":\t{\n\t\t\t\t}}`;
			const expected = `{"CaseSearchResult":\t[\n\t\t\t\t]}`;
			const result = processCaseSearchResponse(input);
			assert.strictEqual(result, expected);
		});

		it('should not modify unrelated content', () => {
			const input = `{"OtherKey": 123}`;
			const expected = `{"OtherKey": 123}`;
			const result = processCaseSearchResponse(input);
			assert.strictEqual(result, expected);
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
});
