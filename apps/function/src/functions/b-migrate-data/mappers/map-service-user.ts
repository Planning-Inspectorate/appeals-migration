import type { AppealServiceUser } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import { SERVICE_USER_TYPE } from '@planning-inspectorate/data-model';

function mapServiceUserAddress(
	sourceServiceUser: AppealServiceUser
): Prisma.AddressCreateWithoutServiceUserInput | null {
	const hasAddress =
		sourceServiceUser.addressLine1 ||
		sourceServiceUser.addressLine2 ||
		sourceServiceUser.addressTown ||
		sourceServiceUser.addressCounty ||
		sourceServiceUser.postcode ||
		sourceServiceUser.addressCountry;

	if (!hasAddress) {
		return null;
	}

	return {
		addressLine1: sourceServiceUser.addressLine1,
		addressLine2: sourceServiceUser.addressLine2,
		addressTown: sourceServiceUser.addressTown,
		addressCounty: sourceServiceUser.addressCounty,
		postcode: sourceServiceUser.postcode,
		addressCountry: sourceServiceUser.addressCountry ?? 'United Kingdom'
	};
}

function mapServiceUserBaseData(sourceServiceUser: AppealServiceUser): Omit<Prisma.ServiceUserCreateInput, 'address'> {
	return {
		organisationName: sourceServiceUser.organisation,
		salutation: sourceServiceUser.salutation,
		firstName: sourceServiceUser.firstName,
		lastName: sourceServiceUser.lastName,
		email: sourceServiceUser.emailAddress,
		website: sourceServiceUser.webAddress,
		phoneNumber: sourceServiceUser.telephoneNumber
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
	if (!serviceUserType) {
		return null;
	}

	const normalizedType = serviceUserType.toLowerCase().trim();

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

function mapServiceUserToAppellant(serviceUser: AppealServiceUser): Prisma.ServiceUserCreateInput | null {
	const category = getServiceUserCategory(serviceUser.serviceUserType);

	if (category !== SERVICE_USER_TYPE.APPELLANT) {
		return null;
	}

	return mapServiceUser(serviceUser);
}

function mapServiceUserToAgent(serviceUser: AppealServiceUser): Prisma.ServiceUserCreateInput | null {
	const category = getServiceUserCategory(serviceUser.serviceUserType);

	if (category !== SERVICE_USER_TYPE.AGENT) {
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
			const appellant = mapServiceUserToAppellant(serviceUser);
			if (appellant) {
				result.appellant = appellant;
			}
		}

		if (category === SERVICE_USER_TYPE.AGENT) {
			if (result.agent) {
				throw new Error(`Duplicate agent found in service users. Cannot map multiple agents.`);
			}
			const agent = mapServiceUserToAgent(serviceUser);
			if (agent) {
				result.agent = agent;
			}
		}
	}

	return result;
}
