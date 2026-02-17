import type { AppealHas, AppealS78, AppealEvent } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import { mapEventToSink } from './map-event-to-sink.ts';

export function mapSourceToSinkAppeal(
	sourceCase: AppealHas | AppealS78,
	events?: AppealEvent[]
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

	return baseAppeal;
}
