import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';

export async function fetchSinkCaseDetails(sinkDatabase: SinkPrismaClient, caseReference: string) {
	return sinkDatabase.appeal.findUnique({
		where: { reference: caseReference },
		include: {
			appealTimetable: true,
			allocation: true,
			appealStatus: true,
			specialisms: { include: { specialism: true } },
			address: true,
			inspectorDecision: true,
			appellantCase: true,
			childAppeals: true,
			neighbouringSites: { include: { address: true } },
			lpaQuestionnaire: {
				include: {
					lpaNotificationMethods: { include: { lpaNotificationMethod: true } },
					listedBuildingDetails: true,
					designatedSiteNames: { include: { designatedSite: true } }
				}
			},
			representations: true,
			appealGrounds: { include: { ground: true } },
			hearing: { include: { address: true } },
			inquiry: { include: { address: true } },
			siteVisit: true,
			appellant: { include: { address: true } },
			agent: { include: { address: true } }
		}
	});
}
