export function parseDate(value: string | Date | null | undefined): Date | null {
	if (!value) {
		return null;
	}

	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}

	try {
		const parsed = new Date(value);
		return isNaN(parsed.getTime()) ? null : parsed;
	} catch {
		return null;
	}
}

export function formatDateToISO(value: Date | null | undefined): string | undefined {
	if (!value) {
		return undefined;
	}

	try {
		return value.toISOString();
	} catch {
		return undefined;
	}
}

export function parseDateOrUndefined(value: string | Date | null | undefined): Date | undefined {
	return parseDate(value) ?? undefined;
}

export function createDateRange(from?: Date | null, to?: Date | null): { gte?: string; lte?: string } | undefined {
	if (!from && !to) {
		return undefined;
	}

	const range: { gte?: string; lte?: string } = {};

	if (from) {
		const isoFrom = formatDateToISO(from);
		if (isoFrom) {
			range.gte = isoFrom;
		}
	}

	if (to) {
		const isoTo = formatDateToISO(to);
		if (isoTo) {
			range.lte = isoTo;
		}
	}

	return Object.keys(range).length > 0 ? range : undefined;
}
