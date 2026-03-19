const baseSourceDoc = {
	documentId: 'doc-123',
	caseReference: 'APP/123',
	filename: 'test.pdf',
	version: 1,
	size: 1024,
	mime: 'application/pdf',
	fileMD5: 'abc123',
	originalFilename: 'original.pdf',
	description: 'Test document',
	author: 'Test Author',
	owner: 'Test Owner',
	origin: 'citizen',
	caseStage: 'appellant-case',
	documentURI: 'https://example.com/doc',
	datePublished: '2024-01-15T00:00:00.000Z',
	dateReceived: '2024-01-10T00:00:00.000Z',
	lastModified: '2024-01-20T00:00:00.000Z'
};

const baseSinkVersion = {
	version: 1,
	fileName: 'test.pdf',
	mime: 'application/pdf',
	size: 1024,
	fileMD5: 'abc123',
	horizonDataID: 'doc-123',
	originalFilename: 'original.pdf',
	description: 'Test document',
	author: 'Test Author',
	owner: 'Test Owner',
	origin: 'citizen',
	stage: 'appellant-case',
	documentURI: 'https://example.com/doc',
	datePublished: new Date('2024-01-15T00:00:00.000Z'),
	dateReceived: new Date('2024-01-10T00:00:00.000Z'),
	lastModified: new Date('2024-01-20T00:00:00.000Z')
};

const baseSinkDoc = {
	id: 1,
	guid: 'doc-123',
	name: 'test.pdf',
	versions: [baseSinkVersion]
};

export function createSourceDoc(overrides = {}) {
	return { ...baseSourceDoc, ...overrides };
}

export function createSinkVersion(overrides = {}) {
	return { ...baseSinkVersion, ...overrides };
}

export function createSinkDoc(overrides = {}) {
	const { versions, ...rest } = overrides as { versions?: unknown[] };
	return {
		...baseSinkDoc,
		...rest,
		versions: versions ?? [{ ...baseSinkVersion }]
	};
}
