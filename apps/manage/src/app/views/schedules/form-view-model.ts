const DAY_OPTIONS = [
	{ value: '1', text: 'Monday' },
	{ value: '2', text: 'Tuesday' },
	{ value: '3', text: 'Wednesday' },
	{ value: '4', text: 'Thursday' },
	{ value: '5', text: 'Friday' },
	{ value: '6', text: 'Saturday' },
	{ value: '0', text: 'Sunday' }
] as const;

interface SelectOption {
	value: string;
	text: string;
	selected: boolean;
}

function buildDayOptions(selectedValue: string): SelectOption[] {
	return DAY_OPTIONS.map((opt) => ({
		...opt,
		selected: opt.value === selectedValue
	}));
}

export interface ScheduleFormViewModel {
	pageHeading: string;
	backLinkUrl: string;
	actionUrl: string;
	isEdit: boolean;
	values: ScheduleFormValues;
	startDayOptions: SelectOption[];
	endDayOptions: SelectOption[];
	errors?: Record<string, { text: string }>;
	errorSummary?: Array<{ text: string; href: string }>;
}

export interface ScheduleFormValues {
	startDayIndex: string;
	startTime: string;
	endDayIndex: string;
	endTime: string;
}

export function buildFormViewModelForAdd(values?: ScheduleFormValues): ScheduleFormViewModel {
	const v = values ?? {
		startDayIndex: '1',
		startTime: '09:00',
		endDayIndex: '5',
		endTime: '17:00'
	};
	return {
		pageHeading: 'Add migration schedule',
		backLinkUrl: '/schedules',
		actionUrl: '/schedules/add',
		isEdit: false,
		startDayOptions: buildDayOptions(v.startDayIndex),
		endDayOptions: buildDayOptions(v.endDayIndex),
		values: v
	};
}

export function buildFormViewModelForEdit(
	id: number,
	data: { startDayIndex: number; startTime: string; endDayIndex: number; endTime: string }
): ScheduleFormViewModel {
	return {
		pageHeading: `Edit schedule ${id}`,
		backLinkUrl: '/schedules',
		actionUrl: `/schedules/edit/${id}`,
		isEdit: true,
		startDayOptions: buildDayOptions(String(data.startDayIndex)),
		endDayOptions: buildDayOptions(String(data.endDayIndex)),
		values: {
			startDayIndex: String(data.startDayIndex),
			startTime: data.startTime,
			endDayIndex: String(data.endDayIndex),
			endTime: data.endTime
		}
	};
}

const VALID_DAY_VALUES: Set<string> = new Set(DAY_OPTIONS.map((o) => o.value));
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ValidationResult {
	valid: boolean;
	errors: Record<string, { text: string }>;
	errorSummary: Array<{ text: string; href: string }>;
}

/**
 * Validate submitted form body — all fields are required
 */
export function validateFormBody(body: Record<string, string>): ValidationResult {
	const errors: Record<string, { text: string }> = {};
	const errorSummary: Array<{ text: string; href: string }> = [];

	if (!body.startDayIndex || !VALID_DAY_VALUES.has(body.startDayIndex)) {
		errors.startDayIndex = { text: 'Select a start day' };
		errorSummary.push({ text: 'Select a start day', href: '#startDayIndex' });
	}

	if (!body.startTime?.trim() || !TIME_PATTERN.test(body.startTime.trim())) {
		errors.startTime = { text: 'Enter a start time in HH:mm format' };
		errorSummary.push({ text: 'Enter a start time in HH:mm format', href: '#startTime' });
	}

	if (!body.endDayIndex || !VALID_DAY_VALUES.has(body.endDayIndex)) {
		errors.endDayIndex = { text: 'Select an end day' };
		errorSummary.push({ text: 'Select an end day', href: '#endDayIndex' });
	}

	if (!body.endTime?.trim() || !TIME_PATTERN.test(body.endTime.trim())) {
		errors.endTime = { text: 'Enter an end time in HH:mm format' };
		errorSummary.push({ text: 'Enter an end time in HH:mm format', href: '#endTime' });
	}

	return { valid: Object.keys(errors).length === 0, errors, errorSummary };
}

/**
 * Parse submitted form body into Prisma-compatible data
 */
export function parseFormBody(body: Record<string, string>) {
	return {
		startDayIndex: parseInt(body.startDayIndex, 10),
		startTime: body.startTime?.trim() || '00:00',
		endDayIndex: parseInt(body.endDayIndex, 10),
		endTime: body.endTime?.trim() || '00:00'
	};
}
