export function mapCaseReferenceForStorageUrl(caseReference: string): string {
	return caseReference.replace(/\//g, '-');
}

export function buildBlobStoragePath(
	caseReference: string,
	documentId: string,
	versionId: number,
	fileName: string
): string {
	const safeCaseReference = mapCaseReferenceForStorageUrl(caseReference);
	return `appeal/${safeCaseReference}/${documentId}/v${versionId}/${fileName}`;
}
