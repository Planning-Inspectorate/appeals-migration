export function normalizeString(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export function trimAndLowercase(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	const normalized = value.trim().toLowerCase();
	return normalized === '' ? null : normalized;
}

export function isNullOrEmpty(value: string | null | undefined): boolean {
	return normalizeString(value) === null;
}

export function stringOrUndefined(value: string | null | undefined): string | undefined {
	return normalizeString(value) ?? undefined;
}
