import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/London',
	dateStyle: 'short'
});

interface ParameterListItem {
	id: number;
	caseTypeName: string;
	lpa: string;
	procedureType: string;
	status: string;
	dateReceived: string;
	decisionDate: string;
	startDate: string;
}

export interface ListViewModel {
	pageHeading: string;
	items: ParameterListItem[];
}

const ANY = 'any';

function formatDateRange(from: Date | null, to: Date | null): string {
	if (from && to) {
		return `${dateFormatter.format(from)} - ${dateFormatter.format(to)}`;
	}
	if (from) {
		return `after ${dateFormatter.format(from)}`;
	}
	if (to) {
		return `before ${dateFormatter.format(to)}`;
	}
	return ANY;
}

function mapItem(p: ToMigrateParameter): ParameterListItem {
	return {
		id: p.id,
		caseTypeName: p.caseTypeName ?? ANY,
		lpa: p.lpa ?? ANY,
		procedureType: p.procedureType ?? ANY,
		status: p.status ?? ANY,
		dateReceived: formatDateRange(p.dateReceivedFrom, p.dateReceivedTo),
		decisionDate: formatDateRange(p.decisionDateFrom, p.decisionDateTo),
		startDate: formatDateRange(p.startDateFrom, p.startDateTo)
	};
}

export function buildListViewModel(parameters: ToMigrateParameter[]): ListViewModel {
	return {
		pageHeading: 'Configure migration',
		items: parameters.map(mapItem)
	};
}
