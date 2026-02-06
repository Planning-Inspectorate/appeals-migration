interface CacheEntry {
	updated: Date;
	value: any;
}

export class MapCache {
	cache: Map<string, CacheEntry> = new Map();
	readonly #ttl: number;

	constructor(ttlMinutes: number) {
		this.#ttl = ttlMinutes * 60 * 1000; // to ms
	}

	get(id: string): any | undefined {
		const entry = this.cache.get(id);
		if (!entry) {
			return undefined;
		}
		const now = new Date();
		if (now.getTime() - entry.updated.getTime() > this.#ttl) {
			this.cache.delete(id);
			return undefined;
		}
		return entry.value;
	}

	set(id: string, value: any) {
		this.cache.set(id, { updated: new Date(), value });
	}
}
