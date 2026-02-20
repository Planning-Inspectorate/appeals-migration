import type { Decimal } from '@pins/odw-curated-database/src/client/internal/prismaNamespace.ts';

export function parseNumber(value: Decimal | number | string | null | undefined): number | undefined {
	if (value === null || value === undefined) return undefined;

	if (typeof value === 'object' && value !== null && 'toNumber' in value) {
		return (value as Decimal).toNumber();
	}

	const num = Number(value);
	return isNaN(num) ? undefined : num;
}
