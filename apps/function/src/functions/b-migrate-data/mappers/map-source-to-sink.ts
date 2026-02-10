import type { AppealHas, AppealS78, AppealEvent } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import { mapEventToSink } from './map-event-to-sink.ts';

export function mapSourceToSinkAppeal(
	sourceCase: AppealHas | AppealS78,
	events?: AppealEvent[],
	onUnknownEventType?: (eventType: string | null | undefined) => void
): Prisma.AppealCreateInput {
	const baseAppeal = {
		reference: sourceCase.caseReference
	} as Prisma.AppealCreateInput;

	if (events && events.length > 0) {
		// Each appeal can have at most one of each type due to @unique constraints
		for (const event of events) {
			const eventMapping = mapEventToSink(event, onUnknownEventType);

			if (eventMapping.hearing && !baseAppeal.hearing) {
				baseAppeal.hearing = eventMapping.hearing;
			}
			if (eventMapping.inquiry && !baseAppeal.inquiry) {
				baseAppeal.inquiry = eventMapping.inquiry;
			}
			if (eventMapping.siteVisit && !baseAppeal.siteVisit) {
				baseAppeal.siteVisit = eventMapping.siteVisit;
			}
		}
	}

	return baseAppeal;
}
