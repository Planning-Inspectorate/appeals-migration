export function mapLpaInTest(appeal: { lpaCode: string | null }, mapLpaCodesToTest: boolean) {
	if (mapLpaCodesToTest && appeal.lpaCode) {
		// override all LPA codes in TEST, to ensure they exist in the sync system
		return 'Q9999';
	}
	return appeal.lpaCode;
}
