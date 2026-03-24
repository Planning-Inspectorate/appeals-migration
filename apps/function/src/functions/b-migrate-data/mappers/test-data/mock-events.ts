import type { AppealEvent } from '@pins/odw-curated-database/src/client/client.ts';
import { APPEAL_EVENT_TYPE } from '@planning-inspectorate/data-model';

const baseAppealEvent: AppealEvent = {
	eventId: 'event-001',
	caseReference: null,
	eventType: null,
	eventName: null,
	eventStatus: null,
	isUrgent: null,
	eventPublished: null,
	eventStartDateTime: null,
	eventEndDateTime: null,
	notificationOfSiteVisit: null,
	addressLine1: null,
	addressLine2: null,
	addressTown: null,
	addressCounty: null,
	addressPostcode: null
};

export const mockHearingEvent: AppealEvent = {
	...baseAppealEvent,
	eventId: 'hearing-001',
	eventType: APPEAL_EVENT_TYPE.HEARING,
	eventStartDateTime: '2024-01-15T10:00:00Z'
};

export const mockDuplicateHearingEvents: AppealEvent[] = [
	{
		...baseAppealEvent,
		eventId: 'hearing-002',
		eventType: APPEAL_EVENT_TYPE.HEARING,
		eventStartDateTime: '2024-06-01T10:00:00.000Z'
	},
	{
		...baseAppealEvent,
		eventId: 'hearing-003',
		eventType: APPEAL_EVENT_TYPE.HEARING,
		eventStartDateTime: '2024-06-02T10:00:00.000Z'
	}
];

export const mockDuplicateInquiryEvents: AppealEvent[] = [
	{
		...baseAppealEvent,
		eventId: 'inquiry-001',
		eventType: APPEAL_EVENT_TYPE.INQUIRY,
		eventStartDateTime: '2024-06-01T10:00:00.000Z'
	},
	{
		...baseAppealEvent,
		eventId: 'inquiry-002',
		eventType: APPEAL_EVENT_TYPE.INQUIRY,
		eventStartDateTime: '2024-06-02T10:00:00.000Z'
	}
];

export const mockDuplicateSiteVisitEvents: AppealEvent[] = [
	{
		...baseAppealEvent,
		eventId: 'sitevisit-001',
		eventType: APPEAL_EVENT_TYPE.SITE_VISIT_ACCESS_REQUIRED,
		eventStartDateTime: '2024-06-01T10:00:00.000Z'
	},
	{
		...baseAppealEvent,
		eventId: 'sitevisit-002',
		eventType: APPEAL_EVENT_TYPE.SITE_VISIT_ACCESS_REQUIRED,
		eventStartDateTime: '2024-06-02T10:00:00.000Z'
	}
];
