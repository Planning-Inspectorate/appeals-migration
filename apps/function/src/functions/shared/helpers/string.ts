export function parseJsonArray<T = unknown>(jsonString: string | null | undefined, fieldName: string): T[] {
	if (!jsonString) return [];

	try {
		const parsed = JSON.parse(jsonString);
		if (!Array.isArray(parsed)) {
			throw new Error(`Expected JSON array for ${fieldName}, got: ${typeof parsed}`);
		}
		return parsed;
	} catch (error) {
		throw new Error(
			`Invalid JSON for ${fieldName}: ${jsonString}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			{ cause: error }
		);
	}
}

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
