import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';

export async function upsertAppeal(sinkDatabase: SinkPrismaClient, appeal: Prisma.AppealCreateInput) {
	if (!appeal.reference) {
		throw new Error('Appeal reference is required');
	}

	const existingAppeal = await sinkDatabase.appeal.findUnique({
		where: { reference: appeal.reference }
	});

	if (existingAppeal) {
		return { existed: true, appeal: existingAppeal };
	}

	const newAppeal = await sinkDatabase.appeal.create({
		data: appeal
	});

	return { existed: false, appeal: newAppeal };
}
