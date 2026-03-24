import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type { AppealEvent } from '@pins/odw-curated-database/src/client/client.ts';
import { APPEAL_EVENT_TYPE } from '@planning-inspectorate/data-model';
import { parseDateOrUndefined, stringOrUndefined, trimAndLowercase } from '../../shared/helpers/index.ts';

function getEventCategory(eventType: string | null | undefined): 'hearing' | 'inquiry' | 'site_visit' | null {
	const normalizedType = trimAndLowercase(eventType);

	if (!normalizedType) {
		return null;
	}

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
		addressLine1: stringOrUndefined(event.addressLine1),
		addressLine2: stringOrUndefined(event.addressLine2),
		addressTown: stringOrUndefined(event.addressTown),
		addressCounty: stringOrUndefined(event.addressCounty),
		postcode: stringOrUndefined(event.addressPostcode)
	};
}

type EventBaseData = {
	startTime: Date;
	endTime: Date | undefined;
	address: Prisma.AddressCreateWithoutHearingInput | Prisma.AddressCreateWithoutInquiryInput | null;
};

function mapEventBaseData(event: AppealEvent): EventBaseData | null {
	const startTime = parseDateOrUndefined(event.eventStartDateTime);

	if (!startTime) {
		return null;
	}

	const address = mapEventAddress(event);
	const endTime = parseDateOrUndefined(event.eventEndDateTime);

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
	const baseData = mapEventBaseData(event);

	if (!baseData) {
		return null;
	}

	const siteVisitTypeKey = trimAndLowercase(event.eventType);

	return {
		visitDate: baseData.startTime,
		visitStartTime: baseData.startTime,
		visitEndTime: baseData.endTime,
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
