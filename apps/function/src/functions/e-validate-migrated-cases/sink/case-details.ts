import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';

export async function fetchSinkCaseDetails(sinkDatabase: SinkPrismaClient, caseReference: string) {
	return sinkDatabase.appeal.findUnique({
		where: { reference: caseReference },
		include: {
			appealType: true,
			procedureType: true,
			lpa: true,
			caseOfficer: true,
			inspector: true,
			padsInspector: true,
			parentAppeals: true,
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
			representations: { include: { represented: { include: { address: true } } } },
			appealRule6Parties: { include: { serviceUser: { include: { address: true } } } },
			appealGrounds: { include: { ground: true } },
			hearing: { include: { address: true } },
			inquiry: { include: { address: true } },
			siteVisit: true,
			appellant: { include: { address: true } },
			agent: { include: { address: true } }
		}
	});
}
