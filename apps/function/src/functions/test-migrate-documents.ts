import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';

const service = initialiseService();

app.get('test-migrate-documents', async (request, context) => {
	context.log('test migrate documents');
	const documentIds = await request.json();
	if (!Array.isArray(documentIds)) {
		return { status: 400, jsonBody: { error: 'documentIds must be an array' } };
	}
	if (documentIds.length === 0) {
		return { status: 200, jsonBody: { msg: 'no documents to migrate' } };
	}
	const start = performance.now();

	for (const documentId of documentIds) {
		context.log('fetching file', documentId);
		const { filename, stream } = await service.horizonWebClient.getDocument(documentId);
		const filepath = context.invocationId + '/' + filename;
		const blob = service.sinkBlobContainerClient.getBlockBlobClient(filepath);
		await blob.uploadStream(stream);
		context.log(documentId, 'file written to', filepath);
	}

	const time = performance.now() - start;
	return { status: 200, jsonBody: { msg: 'migrated all documents', time } };
});
