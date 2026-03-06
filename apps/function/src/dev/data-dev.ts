import type { FunctionService } from '../service.ts';
import { appealHas } from './data-dev-has.ts';
import { appealS78 } from './data-dev-s78.ts';

export async function seedDev(service: FunctionService) {
	function addCaseToMigrate(caseReference: string) {
		return service.databaseClient.caseToMigrate.upsert({
			where: { caseReference },
			create: {
				caseReference,
				DataStep: { create: {} },
				DocumentListStep: { create: {} },
				DocumentsStep: { create: {} },
				ValidationStep: { create: {} }
			},
			update: {}
		});
	}

	for (const appeal of appealHas) {
		await addCaseToMigrate(appeal.caseReference!);
		await service.sourceDatabaseClient.appealHas.upsert({
			where: { caseId: appeal.caseId },
			create: appeal,
			update: appeal
		});
	}
	console.log('added', appealHas.length, 'has appeals');
	for (const appeal of appealS78) {
		await addCaseToMigrate(appeal.caseReference!);
		await service.sourceDatabaseClient.appealS78.upsert({
			where: { caseId: appeal.caseId },
			create: appeal,
			update: appeal
		});
	}
	console.log('added', appealS78.length, 's78 appeals');

	console.log('dev seed complete');
}
