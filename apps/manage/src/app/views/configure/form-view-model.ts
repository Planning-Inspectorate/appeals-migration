import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';

export interface ParameterFormViewModel {
	pageHeading: string;
	backLinkUrl: string;
	actionUrl: string;
	isEdit: boolean;
	values: ParameterFormValues;
	errors?: Record<string, { text: string }>;
	errorSummary?: Array<{ text: string; href: string }>;
}

export interface ParameterFormValues {
	caseTypeName: string;
	lpa: string;
	procedureType: string;
	status: string;
	dateReceivedFrom: string;
	dateReceivedTo: string;
	decisionDateFrom: string;
	decisionDateTo: string;
	startDateFrom: string;
	startDateTo: string;
}

function formatDateForInput(date: Date | null): string {
	if (!date) return '';
	return date.toISOString().split('T')[0];
}

export function buildFormViewModelFromRecord(parameter: ToMigrateParameter): ParameterFormViewModel {
	return {
		pageHeading: `Edit parameter ${parameter.id}`,
		backLinkUrl: '/configure',
		actionUrl: `/configure/edit/${parameter.id}`,
		isEdit: true,
		values: {
			caseTypeName: parameter.caseTypeName ?? '',
			lpa: parameter.lpa ?? '',
			procedureType: parameter.procedureType ?? '',
			status: parameter.status ?? '',
			dateReceivedFrom: formatDateForInput(parameter.dateReceivedFrom),
			dateReceivedTo: formatDateForInput(parameter.dateReceivedTo),
			decisionDateFrom: formatDateForInput(parameter.decisionDateFrom),
			decisionDateTo: formatDateForInput(parameter.decisionDateTo),
			startDateFrom: formatDateForInput(parameter.startDateFrom),
			startDateTo: formatDateForInput(parameter.startDateTo)
		}
	};
}

export function buildFormViewModelForAdd(): ParameterFormViewModel {
	return {
		pageHeading: 'Add migration parameter',
		backLinkUrl: '/configure',
		actionUrl: '/configure/add',
		isEdit: false,
		values: {
			caseTypeName: '',
			lpa: '',
			procedureType: '',
			status: '',
			dateReceivedFrom: '',
			dateReceivedTo: '',
			decisionDateFrom: '',
			decisionDateTo: '',
			startDateFrom: '',
			startDateTo: ''
		}
	};
}

function parseDate(value: string | undefined): Date | null {
	if (!value) return null;
	return new Date(`${value}T00:00:00.000Z`);
}

/**
 * Parse submitted form body into Prisma-compatible data
 */
export function parseFormBody(body: Record<string, string>) {
	return {
		caseTypeName: body.caseTypeName?.trim() || null,
		lpa: body.lpa?.trim() || null,
		procedureType: body.procedureType?.trim() || null,
		status: body.status?.trim() || null,
		dateReceivedFrom: parseDate(body.dateReceivedFrom),
		dateReceivedTo: parseDate(body.dateReceivedTo),
		decisionDateFrom: parseDate(body.decisionDateFrom),
		decisionDateTo: parseDate(body.decisionDateTo),
		startDateFrom: parseDate(body.startDateFrom),
		startDateTo: parseDate(body.startDateTo)
	};
}
