/**
 * Create a new object with all keys prefixed
 * Only supports depth of one
 *
 * @param obj
 * @param prefix
 */
export function prefixAllKeys(obj: any, prefix: string) {
	const copy: Record<string, any> = {};
	for (const [k, v] of Object.entries(obj)) {
		copy[prefix + k] = v;
	}
	return copy;
}
