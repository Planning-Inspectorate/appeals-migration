import type { InvocationContext } from '@azure/functions';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { ItemToMigrate } from '../../../types.ts';

export function newAuditEntry(message: string) {
	return {
		user: { connect: { azureAdUserId: '00000000-0000-0000-0000-000000000000' } },
		details: '[Horizon migration] ' + message,
		loggedAt: new Date()
	};
}

export async function insertAuditEntry(
	message: string,
	sinkDatabaseClient: SinkPrismaClient,
	itemToMigrate: ItemToMigrate,
	context: InvocationContext
) {
	context.log(`${itemToMigrate.caseReference}: adding audit entry '${message}'`);
	const auditEntry = newAuditEntry(message);
	const appeal = await sinkDatabaseClient.appeal.findUnique({
		where: { reference: itemToMigrate.caseReference },
		select: { id: true }
	});
	if (appeal) {
		await withRetry(async () => {
			await sinkDatabaseClient.auditTrail.create({
				data: {
					...auditEntry,
					appeal: { connect: { id: appeal.id } }
				}
			});
		});
		context.log(`${itemToMigrate.caseReference}: added audit entry`);
	} else {
		context.error(`${itemToMigrate.caseReference}: appeal not found in sink. Audit entry not added.`);
	}
}
