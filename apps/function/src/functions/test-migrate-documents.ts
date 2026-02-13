import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';

const service = initialiseService();

app.post('test-migrate-documents', async (request, context) => {
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
		const docStart = performance.now();
		const { filename, stream } = await service.horizonWebClient.getDocument(documentId);
		const filepath = context.invocationId + '/' + filename;
		const blobClient = service.sinkBlobContainerClient.getBlockBlobClient(filepath);
		await blobClient.uploadStream(stream);
		const docTime = performance.now() - docStart;
		const props = await blobClient.getProperties();
		context.log(
			documentId,
			'file written to',
			filepath,
			'size',
			bytesToString(props.contentLength),
			'time',
			msToString(docTime)
		);
	}

	const time = performance.now() - start;
	return { status: 200, jsonBody: { msg: 'migrated all documents', time: msToString(time) } };
});

function bytesToString(bytes: number | undefined): string {
	if (!bytes) {
		return 'unknown';
	}
	const GB = 1024 * 1024 * 1024;
	const MB = 1024 * 1024;
	const KB = 1024;

	if (bytes >= GB) {
		return (bytes / GB).toFixed(2) + ' GB';
	} else if (bytes >= MB) {
		return (bytes / MB).toFixed(2) + ' MB';
	} else {
		return (bytes / KB).toFixed(2) + ' KB';
	}
}

function msToString(ms: number): string {
	const hours = Math.floor(ms / 3600000);
	const minutes = Math.floor((ms % 3600000) / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	const milliseconds = Math.floor(ms % 1000);

	const parts: string[] = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0) parts.push(`${seconds}s`);
	if (milliseconds > 0 || parts.length === 0) parts.push(`${milliseconds}ms`);

	return parts.join(' ');
}
