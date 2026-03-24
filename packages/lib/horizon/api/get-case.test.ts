import { describe, it } from 'node:test';
import { cleanGetCaseResponse } from './get-case.ts';
import { readTestFile, snapshotOptions, snapshotPath } from './util-testing.ts';

describe('get-case', () => {
	describe('cleanCaseSearchResponse', () => {
		it('should convert PublishedDocuments object to array and remove HorizonSearchDocument keys', async (ctx) => {
			const got = cleanGetCaseResponse(await readTestFile('./testing/get-case-example-1.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-get-case-1.json'), snapshotOptions);
		});
	});
});
