import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';

interface SelectOption {
	value: string;
	text: string;
	selected: boolean;
}

export const STATUS_OPTIONS = [
	'Abeyance',
	'Appeal Lapsed',
	'Appeal Withdrawn',
	'Application Withdrawn',
	'Case In Progress',
	'Closed - Opened in Error',
	'Decision Issued',
	'Event',
	'File Sent to Chart for Inspector',
	'Historic',
	'Incomplete',
	'Invalid - Missing Information',
	'Invalid - No Right of Appeal',
	'Invalid - Out of Time',
	'New Case',
	'Notice Withdrawn',
	'Postponed',
	'Ready for Inspector Action/Awaiting Event',
	'Report Sent to Decision Branch',
	'Turned Away',
	'Validated',
	'Validation Review'
] as const;

export const PROCEDURE_OPTIONS: ReadonlyArray<{ value: string; text: string }> = [
	{ value: 'WR', text: 'Written representations' },
	{ value: 'LI', text: 'Inquiry' },
	{ value: 'IH', text: 'Hearing' }
] as const;

function buildSelectOptions(
	options: ReadonlyArray<string | { value: string; text: string }>,
	selectedValue: string
): SelectOption[] {
	const items: SelectOption[] = [{ value: '', text: 'Any', selected: selectedValue === '' }];
	for (const opt of options) {
		const value = typeof opt === 'string' ? opt : opt.value;
		const text = typeof opt === 'string' ? opt : opt.text;
		items.push({ value, text, selected: value === selectedValue });
	}
	return items;
}

export interface ParameterFormViewModel {
	pageHeading: string;
	backLinkUrl: string;
	actionUrl: string;
	isEdit: boolean;
	values: ParameterFormValues;
	statusOptions: SelectOption[];
	procedureOptions: SelectOption[];
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
	const procedureType = parameter.procedureType ?? '';
	const status = parameter.status ?? '';
	return {
		pageHeading: `Edit parameter ${parameter.id}`,
		backLinkUrl: '/configure',
		actionUrl: `/configure/edit/${parameter.id}`,
		isEdit: true,
		statusOptions: buildSelectOptions(STATUS_OPTIONS, status),
		procedureOptions: buildSelectOptions(PROCEDURE_OPTIONS, procedureType),
		values: {
			caseTypeName: parameter.caseTypeName ?? '',
			lpa: parameter.lpa ?? '',
			procedureType,
			status,
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
		statusOptions: buildSelectOptions(STATUS_OPTIONS, ''),
		procedureOptions: buildSelectOptions(PROCEDURE_OPTIONS, ''),
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
