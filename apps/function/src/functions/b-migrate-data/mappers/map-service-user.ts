import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type { AppealServiceUser } from '@pins/odw-curated-database/src/client/client.ts';
import { SERVICE_USER_TYPE } from '@planning-inspectorate/data-model';
import { hasAnyValue, stringOrUndefined, trimAndLowercase } from '../../shared/helpers/index.ts';

function mapServiceUserAddress(
	sourceServiceUser: AppealServiceUser
): Prisma.AddressCreateWithoutServiceUserInput | null {
	if (
		!hasAnyValue(sourceServiceUser, [
			'addressLine1',
			'addressLine2',
			'addressTown',
			'addressCounty',
			'postcode',
			'addressCountry'
		])
	) {
		return null;
	}

	return {
		addressLine1: stringOrUndefined(sourceServiceUser.addressLine1),
		addressLine2: stringOrUndefined(sourceServiceUser.addressLine2),
		addressTown: stringOrUndefined(sourceServiceUser.addressTown),
		addressCounty: stringOrUndefined(sourceServiceUser.addressCounty),
		postcode: stringOrUndefined(sourceServiceUser.postcode),
		addressCountry: sourceServiceUser.addressCountry ?? 'United Kingdom'
	};
}

function mapServiceUserBaseData(sourceServiceUser: AppealServiceUser): Omit<Prisma.ServiceUserCreateInput, 'address'> {
	return {
		organisationName: stringOrUndefined(sourceServiceUser.organisation),
		salutation: stringOrUndefined(sourceServiceUser.salutation),
		firstName: stringOrUndefined(sourceServiceUser.firstName),
		lastName: stringOrUndefined(sourceServiceUser.lastName),
		email: stringOrUndefined(sourceServiceUser.emailAddress),
		website: stringOrUndefined(sourceServiceUser.webAddress),
		phoneNumber: stringOrUndefined(sourceServiceUser.telephoneNumber)
	};
}

export function mapServiceUser(sourceServiceUser: AppealServiceUser): Prisma.ServiceUserCreateInput {
	const baseData = mapServiceUserBaseData(sourceServiceUser);
	const address = mapServiceUserAddress(sourceServiceUser);

	return {
		...baseData,
		...(address && {
			address: {
				create: address
			}
		})
	};
}

type ServiceUserCategory = typeof SERVICE_USER_TYPE.APPELLANT | typeof SERVICE_USER_TYPE.AGENT;

function getServiceUserCategory(serviceUserType: string | null | undefined): ServiceUserCategory | null {
	const normalizedType = trimAndLowercase(serviceUserType);

	if (!normalizedType) {
		return null;
	}

	if (
		normalizedType === SERVICE_USER_TYPE.APPELLANT.toLowerCase() ||
		normalizedType === SERVICE_USER_TYPE.APPLICANT.toLowerCase()
	) {
		return SERVICE_USER_TYPE.APPELLANT;
	}

	if (normalizedType === SERVICE_USER_TYPE.AGENT.toLowerCase()) {
		return SERVICE_USER_TYPE.AGENT;
	}

	return null;
}

export function getServiceUserRole(sourceServiceUser: AppealServiceUser): {
	isAppellant: boolean;
	isAgent: boolean;
	serviceUserType: string | null;
} {
	const serviceUserType = sourceServiceUser.serviceUserType;
	const category = getServiceUserCategory(serviceUserType);

	return {
		isAppellant: category === SERVICE_USER_TYPE.APPELLANT,
		isAgent: category === SERVICE_USER_TYPE.AGENT,
		serviceUserType: serviceUserType ?? null
	};
}

function mapServiceUserByCategory(
	serviceUser: AppealServiceUser,
	expectedCategory: ServiceUserCategory
): Prisma.ServiceUserCreateInput | null {
	const category = getServiceUserCategory(serviceUser.serviceUserType);

	if (category !== expectedCategory) {
		return null;
	}

	return mapServiceUser(serviceUser);
}

export function mapServiceUsersToAppealRelations(serviceUsers: AppealServiceUser[]): {
	appellant?: Prisma.ServiceUserCreateInput;
	agent?: Prisma.ServiceUserCreateInput;
} {
	const result: {
		appellant?: Prisma.ServiceUserCreateInput;
		agent?: Prisma.ServiceUserCreateInput;
	} = {};

	for (const serviceUser of serviceUsers) {
		const category = getServiceUserCategory(serviceUser.serviceUserType);

		if (category === null && serviceUser.serviceUserType) {
			throw new Error(`Unknown service user type: ${serviceUser.serviceUserType}. Cannot map service user to appeal.`);
		}

		if (category === SERVICE_USER_TYPE.APPELLANT) {
			if (result.appellant) {
				throw new Error(`Duplicate appellant found in service users. Cannot map multiple appellants.`);
			}
			const appellant = mapServiceUserByCategory(serviceUser, SERVICE_USER_TYPE.APPELLANT);
			if (appellant) {
				result.appellant = appellant;
			}
		}

		if (category === SERVICE_USER_TYPE.AGENT) {
			if (result.agent) {
				throw new Error(`Duplicate agent found in service users. Cannot map multiple agents.`);
			}
			const agent = mapServiceUserByCategory(serviceUser, SERVICE_USER_TYPE.AGENT);
			if (agent) {
				result.agent = agent;
			}
		}
	}

	return result;
}
