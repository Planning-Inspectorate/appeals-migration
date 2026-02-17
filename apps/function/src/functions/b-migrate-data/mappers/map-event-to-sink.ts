import type { AppealEvent } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import { APPEAL_EVENT_TYPE } from '@planning-inspectorate/data-model';

function parseDate(dateString: string | null | undefined): Date | null {
	if (!dateString) {
		return null;
	}

	try {
		const parsed = new Date(dateString);
		return isNaN(parsed.getTime()) ? null : parsed;
	} catch {
		return null;
	}
}

function getEventCategory(eventType: string | null | undefined): 'hearing' | 'inquiry' | 'site_visit' | null {
	if (!eventType) {
		return null;
	}

	const normalizedType = eventType.toLowerCase().trim();

	if (normalizedType === APPEAL_EVENT_TYPE.HEARING || normalizedType === APPEAL_EVENT_TYPE.HEARING_VIRTUAL) {
		return 'hearing';
	}

	if (
		normalizedType === APPEAL_EVENT_TYPE.INQUIRY ||
		normalizedType === APPEAL_EVENT_TYPE.INQUIRY_VIRTUAL ||
		normalizedType === APPEAL_EVENT_TYPE.PRE_INQUIRY ||
		normalizedType === APPEAL_EVENT_TYPE.PRE_INQUIRY_VIRTUAL
	) {
		return 'inquiry';
	}

	if (
		normalizedType === APPEAL_EVENT_TYPE.SITE_VISIT_ACCESS_REQUIRED ||
		normalizedType === APPEAL_EVENT_TYPE.SITE_VISIT_ACCOMPANIED ||
		normalizedType === APPEAL_EVENT_TYPE.SITE_VISIT_UNACCOMPANIED
	) {
		return 'site_visit';
	}

	return null;
}

function mapEventAddress(
	event: AppealEvent
): Prisma.AddressCreateWithoutHearingInput | Prisma.AddressCreateWithoutInquiryInput | null {
	if (
		!event.addressLine1 &&
		!event.addressLine2 &&
		!event.addressTown &&
		!event.addressCounty &&
		!event.addressPostcode
	) {
		return null;
	}

	return {
		addressLine1: event.addressLine1 || undefined,
		addressLine2: event.addressLine2 || undefined,
		addressTown: event.addressTown || undefined,
		addressCounty: event.addressCounty || undefined,
		postcode: event.addressPostcode || undefined
	};
}

type EventBaseData = {
	startTime: Date;
	endTime: Date | undefined;
	address: Prisma.AddressCreateWithoutHearingInput | Prisma.AddressCreateWithoutInquiryInput | null;
};

function mapEventBaseData(event: AppealEvent): EventBaseData | null {
	const startTime = parseDate(event.eventStartDateTime);

	if (!startTime) {
		return null;
	}

	const address = mapEventAddress(event);
	const endTime = parseDate(event.eventEndDateTime) || undefined;

	return { startTime, endTime, address };
}

export function mapEventToHearing(event: AppealEvent): Prisma.HearingCreateWithoutAppealInput | null {
	const baseData = mapEventBaseData(event);

	if (!baseData) {
		return null;
	}

	return {
		hearingStartTime: baseData.startTime,
		hearingEndTime: baseData.endTime,
		...(baseData.address && {
			address: {
				create: baseData.address
			}
		})
	};
}

export function mapEventToInquiry(event: AppealEvent): Prisma.InquiryCreateWithoutAppealInput | null {
	const baseData = mapEventBaseData(event);

	if (!baseData) {
		return null;
	}

	return {
		inquiryStartTime: baseData.startTime,
		inquiryEndTime: baseData.endTime,
		...(baseData.address && {
			address: {
				create: baseData.address
			}
		})
	};
}

export function mapEventToSiteVisit(event: AppealEvent): Prisma.SiteVisitCreateWithoutAppealInput | null {
	const startTime = parseDate(event.eventStartDateTime);

	if (!startTime) {
		return null;
	}

	const endTime = parseDate(event.eventEndDateTime) || undefined;

	// Map eventType to siteVisitType.key for connection
	const siteVisitTypeKey = event.eventType?.toLowerCase().trim();

	return {
		visitDate: startTime,
		visitStartTime: startTime,
		visitEndTime: endTime,
		...(siteVisitTypeKey && {
			siteVisitType: {
				connect: {
					key: siteVisitTypeKey
				}
			}
		})
	};
}

export function mapEventToSink(event: AppealEvent): {
	hearing?: { create: Prisma.HearingCreateWithoutAppealInput };
	inquiry?: { create: Prisma.InquiryCreateWithoutAppealInput };
	siteVisit?: { create: Prisma.SiteVisitCreateWithoutAppealInput };
} {
	const eventCategory = getEventCategory(event.eventType);

	if (eventCategory === null) {
		throw new Error(`Unknown event type: ${event.eventType}. Cannot map event to sink schema.`);
	}

	if (eventCategory === 'hearing') {
		const hearing = mapEventToHearing(event);
		return hearing ? { hearing: { create: hearing } } : {};
	}

	if (eventCategory === 'inquiry') {
		const inquiry = mapEventToInquiry(event);
		return inquiry ? { inquiry: { create: inquiry } } : {};
	}

	if (eventCategory === 'site_visit') {
		const siteVisit = mapEventToSiteVisit(event);
		return siteVisit ? { siteVisit: { create: siteVisit } } : {};
	}

	return {};
}
