const TIMEZONE = 'Europe/London';

export type ScheduleWindow = {
	startDay: number;
	startMinutes: number;
	endDay: number;
	endMinutes: number;
};

export type ScheduleAction = 'dispatch' | 'drain' | 'skip';
const formatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: TIMEZONE,
	weekday: 'short',
	hour: 'numeric',
	minute: 'numeric',
	hour12: false
});

/**
 * Get the current time in Europe/London as day-of-week index (0=Sunday) and minutes since midnight
 */
export function getLondonTime(now: Date): { day: number; minutes: number } {
	const parts = formatter.formatToParts(now);

	const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
	const weekday = parts.find((p) => p.type === 'weekday')!.value;
	const hour = Number(parts.find((p) => p.type === 'hour')!.value);
	const minute = Number(parts.find((p) => p.type === 'minute')!.value);

	return { day: weekdayMap[weekday], minutes: hour * 60 + minute };
}

/**
 * Convert a time string (HH:mm) to minutes since midnight
 */
export function parseTime(time: string): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

/**
 * Convert a week-relative position to a linear value for comparison
 * (day * minutes-in-day + minutes)
 */
export function toWeekMinutes(day: number, minutes: number): number {
	return day * 1440 + minutes;
}

/**
 * Determine whether the current London time falls within a schedule window
 * and whether it is in the last minute or at the end (drain) or active (dispatch)
 */
export function determineAction(now: Date, schedules: ScheduleWindow[]): ScheduleAction {
	const { day, minutes } = getLondonTime(now);
	const current = toWeekMinutes(day, minutes);

	for (const schedule of schedules) {
		const start = toWeekMinutes(schedule.startDay, schedule.startMinutes);
		const end = toWeekMinutes(schedule.endDay, schedule.endMinutes);

		// the minute before and at the end, we drain
		const drainStart = end - 1;

		if (start <= end) {
			// Non-wrapping window (e.g. Mon 09:00 -> Fri 17:00)
			if (current >= start && current <= end) {
				return current >= drainStart ? 'drain' : 'dispatch';
			}
		} else {
			// Wrapping window (e.g. Fri 22:00 -> Mon 06:00)
			if (current >= start || current <= end) {
				if (current >= start) {
					// in the latter part of the week
					return current >= drainStart && drainStart >= start ? 'drain' : 'dispatch';
				}
				// in the early part of the week (wrapped)
				return current >= drainStart ? 'drain' : 'dispatch';
			}
		}
	}

	return 'skip';
}
