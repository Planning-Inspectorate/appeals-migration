import type { MigrationSchedule } from '@pins/appeals-migration-database/src/client/client.ts';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

interface ScheduleListItem {
	id: number;
	startDay: string;
	startTime: string;
	endDay: string;
	endTime: string;
}

export interface ListViewModel {
	pageHeading: string;
	items: ScheduleListItem[];
}

function mapItem(schedule: MigrationSchedule): ScheduleListItem {
	return {
		id: schedule.id,
		startDay: DAY_NAMES[schedule.startDayIndex] ?? String(schedule.startDayIndex),
		startTime: schedule.startTime,
		endDay: DAY_NAMES[schedule.endDayIndex] ?? String(schedule.endDayIndex),
		endTime: schedule.endTime
	};
}

export function buildListViewModel(schedules: MigrationSchedule[]): ListViewModel {
	return {
		pageHeading: 'Migration schedules',
		items: schedules.map(mapItem)
	};
}
