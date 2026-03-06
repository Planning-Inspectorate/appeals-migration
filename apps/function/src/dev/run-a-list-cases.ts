import type { Timer } from '@azure/functions/types/timer.d.ts';
import { buildListCasesToMigrate } from '../functions/a-list-cases-to-migrate/impl.ts';
import { initialiseService } from '../init.ts';
import { cleanup, mockContext } from './util.ts';

/**
 * A script for local testing
 */
async function run() {
	const service = initialiseService();
	const handler = buildListCasesToMigrate(service);
	const timer = {} as Timer;
	await handler(timer, mockContext());
	await cleanup(service);
}

run();
