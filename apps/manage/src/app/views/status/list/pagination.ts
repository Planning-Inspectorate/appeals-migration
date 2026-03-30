type PaginationItem = { number: number; href: string; current: boolean } | { ellipsis: true };

function buildPageHref(pageNum: number, params: URLSearchParams): string {
	const qs = new URLSearchParams(params);
	qs.set('page', String(pageNum));
	return `?${qs}`;
}

/**
 * Build the GOV.UK pagination items array with ellipsis for large page counts.
 * Shows first page, last page, and a window of ±1 around the current page.
 */
export function buildPaginationItems(
	page: number,
	totalPages: number,
	params: URLSearchParams = new URLSearchParams()
): PaginationItem[] {
	if (totalPages <= 1) {
		return [];
	}

	const items: PaginationItem[] = [];
	const windowStart = page - 1;
	const windowEnd = page + 1;

	// first page
	items.push({ number: 1, href: buildPageHref(1, params), current: page === 1 });

	// ellipsis before window
	if (windowStart > 2) {
		items.push({ ellipsis: true });
	}

	// pages around current
	for (let i = windowStart; i <= windowEnd; i++) {
		if (i > 1 && i < totalPages) {
			items.push({ number: i, href: buildPageHref(i, params), current: i === page });
		}
	}

	// ellipsis after window
	if (windowEnd < totalPages - 1) {
		items.push({ ellipsis: true });
	}

	// last page
	items.push({
		number: totalPages,
		href: buildPageHref(totalPages, params),
		current: page === totalPages
	});

	return items;
}

/**
 * Build the full GOV.UK pagination object with previous/next links and page items.
 */
export function buildPagination(page: number, totalPages: number, params: URLSearchParams = new URLSearchParams()) {
	const items = buildPaginationItems(page, totalPages, params);

	return {
		previous: page > 1 ? { href: buildPageHref(page - 1, params) } : undefined,
		next: page < totalPages ? { href: buildPageHref(page + 1, params) } : undefined,
		items: items.length > 0 ? items : undefined
	};
}
