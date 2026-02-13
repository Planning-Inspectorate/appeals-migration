import type { AppealHas, AppealS78, AppealServiceUser } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import { mapServiceUsersToAppealRelations } from './map-service-user.ts';

export function mapSourceToSinkAppeal(
	sourceCase: AppealHas | AppealS78,
	serviceUsers: AppealServiceUser[] = []
): Prisma.AppealCreateInput {
	const appealData: Prisma.AppealCreateInput = {
		reference: sourceCase.caseReference
	} as Prisma.AppealCreateInput;

	// Map service users to appellant and agent relations
	const serviceUserRelations = mapServiceUsersToAppealRelations(serviceUsers);

	if (serviceUserRelations.appellant) {
		appealData.appellant = {
			create: serviceUserRelations.appellant
		};
	}

	if (serviceUserRelations.agent) {
		appealData.agent = {
			create: serviceUserRelations.agent
		};
	}

	return appealData;
}
