import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type {
	AppealEvent,
	AppealHas,
	AppealS78,
	AppealServiceUser
} from '@pins/odw-curated-database/src/client/client.ts';
import { mapEventToSink } from './map-event-to-sink.ts';
import { mapServiceUsersToAppealRelations } from './map-service-user.ts';

export function mapSourceToSinkAppeal(
	sourceCase: AppealHas | AppealS78,
	events?: AppealEvent[],
	serviceUsers?: AppealServiceUser[]
): Prisma.AppealCreateInput {
	const baseAppeal = {
		reference: sourceCase.caseReference
	} as Prisma.AppealCreateInput;

	if (events && events.length > 0) {
		// Each appeal can have at most one of each type due to @unique constraints
		for (const event of events) {
			const eventMapping = mapEventToSink(event);

			if (eventMapping.hearing) {
				if (baseAppeal.hearing) {
					throw new Error(
						`Duplicate hearing event found for case ${sourceCase.caseReference}. Cannot map multiple events of the same type.`
					);
				}
				baseAppeal.hearing = eventMapping.hearing;
			}
			if (eventMapping.inquiry) {
				if (baseAppeal.inquiry) {
					throw new Error(
						`Duplicate inquiry event found for case ${sourceCase.caseReference}. Cannot map multiple events of the same type.`
					);
				}
				baseAppeal.inquiry = eventMapping.inquiry;
			}
			if (eventMapping.siteVisit) {
				if (baseAppeal.siteVisit) {
					throw new Error(
						`Duplicate siteVisit event found for case ${sourceCase.caseReference}. Cannot map multiple events of the same type.`
					);
				}
				baseAppeal.siteVisit = eventMapping.siteVisit;
			}
		}
	}

	// Map service users to appellant and agent relations
	if (serviceUsers && serviceUsers.length > 0) {
		const serviceUserRelations = mapServiceUsersToAppealRelations(serviceUsers);

		if (serviceUserRelations.appellant) {
			if (baseAppeal.appellant) {
				throw new Error(
					`Duplicate appellant found for case ${sourceCase.caseReference}. Cannot map multiple appellants.`
				);
			}
			baseAppeal.appellant = {
				create: serviceUserRelations.appellant
			};
		}

		if (serviceUserRelations.agent) {
			if (baseAppeal.agent) {
				throw new Error(`Duplicate agent found for case ${sourceCase.caseReference}. Cannot map multiple agents.`);
			}
			baseAppeal.agent = {
				create: serviceUserRelations.agent
			};
		}
	}

	return baseAppeal;
}
