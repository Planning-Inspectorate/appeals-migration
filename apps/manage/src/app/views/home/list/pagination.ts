type PaginationItem = { number: number; href: string; current: boolean } | { ellipsis: true };

/**
 * Build the GOV.UK pagination items array with ellipsis for large page counts.
 * Shows first page, last page, and a window of ±1 around the current page.
 */
export function buildPaginationItems(page: number, totalPages: number, extraParams = ''): PaginationItem[] {
	if (totalPages <= 1) {
		return [];
	}

	const items: PaginationItem[] = [];
	const windowStart = page - 1;
	const windowEnd = page + 1;

	// first page
	items.push({ number: 1, href: `?page=1${extraParams}`, current: page === 1 });

	// ellipsis before window
	if (windowStart > 2) {
		items.push({ ellipsis: true });
	}

	// pages around current
	for (let i = windowStart; i <= windowEnd; i++) {
		if (i > 1 && i < totalPages) {
			items.push({ number: i, href: `?page=${i}${extraParams}`, current: i === page });
		}
	}

	// ellipsis after window
	if (windowEnd < totalPages - 1) {
		items.push({ ellipsis: true });
	}

	// last page
	items.push({ number: totalPages, href: `?page=${totalPages}${extraParams}`, current: page === totalPages });

	return items;
}
