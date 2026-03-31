const STATUSES = ['complete', 'processing', 'queued', 'waiting', 'failed'] as const;
export type Status = (typeof STATUSES)[number];

export interface StatusCount {
	status: Status;
	count: number;
	percentage: number;
}

export interface StepSummary {
	label: string;
	counts: StatusCount[];
}

export interface SummaryViewModel {
	pageHeading: string;
	totalCases: number;
	completeCases: number;
	completeCasesPerc: string;
	steps: StepSummary[];
}

export interface StatusGroupRow {
	status: string;
	_count: { status: number };
}

/**
 * Map raw groupBy rows to a StatusCount array covering all statuses.
 */
export function mapStatusCounts(rows: StatusGroupRow[], totalCases: number): StatusCount[] {
	const countMap = new Map(rows.map((r) => [r.status, r._count.status]));

	return STATUSES.map((status) => {
		const count = countMap.get(status) ?? 0;
		return {
			status,
			count,
			percentage: totalCases > 0 ? Math.round((count / totalCases) * 100) : 0
		};
	});
}

export interface StepCounts {
	data: StatusGroupRow[];
	documentList: StatusGroupRow[];
	documents: StatusGroupRow[];
	validation: StatusGroupRow[];
}

/**
 * Build the summary view model from pre-fetched data.
 */
export function buildSummaryViewModel(
	totalCases: number,
	completeCases: number,
	stepCounts: StepCounts
): SummaryViewModel {
	return {
		pageHeading: 'Migration summary',
		totalCases,
		completeCases,
		completeCasesPerc: ((completeCases / totalCases) * 100).toFixed(2),
		steps: [
			{ label: 'Data', counts: mapStatusCounts(stepCounts.data, totalCases) },
			{ label: 'Document list', counts: mapStatusCounts(stepCounts.documentList, totalCases) },
			{ label: 'Documents', counts: mapStatusCounts(stepCounts.documents, totalCases) },
			{ label: 'Validation', counts: mapStatusCounts(stepCounts.validation, totalCases) }
		]
	};
}
