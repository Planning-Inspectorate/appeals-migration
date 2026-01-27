import { HorizonWebClient } from './horizon-web-client.ts';
import type { Readable } from 'node:stream';
import fs from 'fs';

/**
 * Basic code to test out the web client
 */
async function run() {
	const baseUrl = process.env.BASE_URL || 'https://horizontest.planninginspectorate.gov.uk';
	const objId = process.env.OBJ_ID;
	const username = process.env.USERNAME;
	const password = process.env.PASSWORD;
	if (!username || !password) {
		throw new Error('USERNAME and PASSWORD are required');
	}
	if (!objId) {
		throw new Error('OBJ_ID is required');
	}

	const client = new HorizonWebClient(baseUrl, username, password);

	const properties = await client.get(`/otcs/llisapi.dll?func=ll&objId=${objId}&objAction=info`);
	console.log(properties.statusCode);
	writeToFile(properties, './properties.html');

	// going too fast seems to break things
	await sleep(20);

	const res = await client.get('/otcs/llisapi.dll?func=llworkspace');
	console.log(res.statusCode);
	const body = await readStream(res);
	console.log('workspace:', body.substring(0, 200));

	await sleep(20);

	const fileWriteStream = fs.createWriteStream('./doc1.pdf');
	await client.pipeDocument(objId, fileWriteStream);
	console.log('file written');
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStream(readable: Readable): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = '';
		readable.setEncoding('utf8');
		readable.on('data', (chunk) => (data += chunk));
		readable.on('end', () => resolve(data));
		readable.on('error', (err) => reject(err));
	});
}

function writeToFile(res: Readable, path: string) {
	const fileWriteStream = fs.createWriteStream(path);
	res.pipe(fileWriteStream);
}

run().catch(console.error);
