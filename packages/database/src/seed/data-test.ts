import type { PrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';

export async function seedTest(dbClient: PrismaClient) {
	console.log('Seeding dev data...');

	// Seed ToMigrateParameter - search criteria configurations
	const parameters = [
		{
			id: 1,
			caseTypeName: 'Planning Appeal',
			dateReceivedFrom: new Date('2024-01-01'),
			dateReceivedTo: new Date('2024-12-31'),
			lpa: 'Bristol City Council',
			procedureType: 'Written Representation',
			status: 'Active'
		},
		{
			id: 2,
			caseTypeName: 'Enforcement Appeal',
			dateReceivedFrom: new Date('2024-06-01'),
			dateReceivedTo: new Date('2024-12-31'),
			lpa: 'Manchester City Council',
			procedureType: 'Hearing',
			status: 'Active'
		},
		{
			id: 3,
			caseTypeName: 'Planning Appeal',
			decisionDateFrom: new Date('2024-01-01'),
			decisionDateTo: new Date('2024-06-30'),
			procedureType: 'Inquiry',
			status: 'Completed'
		}
	];

	for (const param of parameters) {
		await dbClient.toMigrateParameter.upsert({
			where: { id: param.id },
			update: param,
			create: param
		});
	}

	console.log(`✓ Seeded ${parameters.length} ToMigrateParameter records`);

	// Seed MigrationSteps and CaseToMigrate
	// Each case needs 3 migration steps: data, documents, validation
	const cases = [
		{ ref: 'APP/2024/0001', dataComplete: true, docsComplete: false, dataValid: true, docsValid: null },
		{ ref: 'APP/2024/0002', dataComplete: true, docsComplete: true, dataValid: true, docsValid: true },
		{ ref: 'APP/2024/0003', dataComplete: false, docsComplete: false, dataValid: null, docsValid: null },
		{ ref: 'ENF/2024/0001', dataComplete: true, docsComplete: true, dataValid: false, docsValid: false },
		{ ref: 'ENF/2024/0002', dataComplete: true, docsComplete: false, dataValid: true, docsValid: null },
		{ ref: 'APP/2024/0004', dataComplete: false, docsComplete: false, dataValid: null, docsValid: null },
		{ ref: 'APP/2024/0005', dataComplete: true, docsComplete: true, dataValid: true, docsValid: true }
	];

	let stepIdCounter = 1;

	for (const caseData of cases) {
		const dataStepId = stepIdCounter++;
		const docsStepId = stepIdCounter++;
		const validationStepId = stepIdCounter++;

		const dataValid = caseData.dataComplete ? caseData.dataValid : null;
		const docsValid = caseData.docsComplete ? caseData.docsValid : null;

		await dbClient.migrationStep.upsert({
			where: { id: dataStepId },
			update: { complete: caseData.dataComplete, inProgress: false },
			create: { id: dataStepId, complete: caseData.dataComplete, inProgress: false }
		});

		await dbClient.migrationStep.upsert({
			where: { id: docsStepId },
			update: { complete: caseData.docsComplete, inProgress: false },
			create: { id: docsStepId, complete: caseData.docsComplete, inProgress: false }
		});

		await dbClient.migrationStep.upsert({
			where: { id: validationStepId },
			update: { complete: false, inProgress: false },
			create: { id: validationStepId, complete: false, inProgress: false }
		});

		await dbClient.caseToMigrate.upsert({
			where: { caseReference: caseData.ref },
			update: {
				dataValidated: dataValid,
				documentsValidated: docsValid
			},
			create: {
				caseReference: caseData.ref,
				dataStepId,
				documentsStepId: docsStepId,
				validationStepId,
				dataValidated: dataValid,
				documentsValidated: docsValid
			}
		});
	}

	console.log(`✓ Seeded ${cases.length} CaseToMigrate records with ${cases.length * 3} MigrationStep records`);
	console.log('✓ Dev seed complete');
}
