export function nullToUndefined<T>(value: T | null): T | undefined {
	return value === null ? undefined : value;
}

export function booleanOrUndefined(value: boolean | null | undefined): boolean | undefined {
	return value === null || value === undefined ? undefined : value;
}

export function hasAnyValue(obj: Record<string, any>, keys: string[]): boolean {
	return keys.some((key) => obj[key] != null && obj[key] !== '');
}
