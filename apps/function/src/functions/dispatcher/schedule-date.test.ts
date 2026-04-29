import assert from 'node:assert';
import { describe, test } from 'node:test';
import { determineAction, getLondonTime, parseTime, toWeekMinutes, type ScheduleWindow } from './schedule-date.ts';

describe('schedule-date', () => {
	describe('parseTime', () => {
		test('parses HH:mm to minutes since midnight', () => {
			assert.strictEqual(parseTime('00:00'), 0);
			assert.strictEqual(parseTime('01:30'), 90);
			assert.strictEqual(parseTime('09:00'), 540);
			assert.strictEqual(parseTime('12:00'), 720);
			assert.strictEqual(parseTime('23:59'), 1439);
		});
	});

	describe('toWeekMinutes', () => {
		test('converts day and minutes to linear week minutes', () => {
			assert.strictEqual(toWeekMinutes(0, 0), 0); // Sunday 00:00
			assert.strictEqual(toWeekMinutes(1, 0), 1440); // Monday 00:00
			assert.strictEqual(toWeekMinutes(1, 540), 1980); // Monday 09:00
			assert.strictEqual(toWeekMinutes(6, 1439), 6 * 1440 + 1439); // Saturday 23:59
		});
	});

	describe('getLondonTime', () => {
		test('returns correct day and minutes for a BST date', () => {
			// 2026-05-06T14:30Z = Wed 15:30 BST
			const result = getLondonTime(new Date('2026-05-06T14:30:00.000Z'));
			assert.strictEqual(result.day, 3); // Wednesday
			assert.strictEqual(result.minutes, 930); // 15*60+30
		});

		test('returns correct day and minutes for a GMT date', () => {
			// 2026-01-15T10:45Z = Thu 10:45 GMT (no DST)
			const result = getLondonTime(new Date('2026-01-15T10:45:00.000Z'));
			assert.strictEqual(result.day, 4); // Thursday
			assert.strictEqual(result.minutes, 645); // 10*60+45
		});
	});

	describe('determineAction', () => {
		// All tests use: 2026-05-06T14:30Z = Wednesday 15:30 BST (day=3, minutes=930)
		const now = new Date('2026-05-06T14:30:00.000Z');

		describe('non-wrapping window', () => {
			test('returns dispatch when inside window', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 900, endDay: 3, endMinutes: 960 }; // Wed 15:00->16:00
				assert.strictEqual(determineAction(now, [schedule]), 'dispatch');
			});

			test('returns dispatch for a multi-day window covering now', () => {
				const schedule: ScheduleWindow = { startDay: 1, startMinutes: 540, endDay: 5, endMinutes: 1020 }; // Mon 09:00->Fri 17:00
				assert.strictEqual(determineAction(now, [schedule]), 'dispatch');
			});

			test('returns drain in the last minute of window', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 900, endDay: 3, endMinutes: 931 }; // Wed 15:00->15:31
				assert.strictEqual(determineAction(now, [schedule]), 'drain');
			});

			test('returns skip when window is in the past', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 600, endDay: 3, endMinutes: 720 }; // Wed 10:00->12:00
				assert.strictEqual(determineAction(now, [schedule]), 'skip');
			});

			test('returns skip when window is in the future', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 960, endDay: 3, endMinutes: 1080 }; // Wed 16:00->18:00
				assert.strictEqual(determineAction(now, [schedule]), 'skip');
			});
		});

		describe('wrapping window', () => {
			test('returns skip when not in wrapping window', () => {
				const schedule: ScheduleWindow = { startDay: 5, startMinutes: 1320, endDay: 2, endMinutes: 360 }; // Fri 22:00->Tue 06:00
				assert.strictEqual(determineAction(now, [schedule]), 'skip');
			});

			test('returns dispatch when after start in wrapping window', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 840, endDay: 2, endMinutes: 360 }; // Wed 14:00->Tue 06:00
				assert.strictEqual(determineAction(now, [schedule]), 'dispatch');
			});

			test('returns dispatch when in early part of wrapping window', () => {
				const schedule: ScheduleWindow = { startDay: 6, startMinutes: 1320, endDay: 4, endMinutes: 360 }; // Sat 22:00->Thu 06:00
				assert.strictEqual(determineAction(now, [schedule]), 'dispatch');
			});

			test('returns drain at end of wrapping window', () => {
				const schedule: ScheduleWindow = { startDay: 6, startMinutes: 1320, endDay: 3, endMinutes: 931 }; // Sat 22:00->Wed 15:31
				assert.strictEqual(determineAction(now, [schedule]), 'drain');
			});
		});

		describe('multiple schedules', () => {
			test('returns dispatch if any schedule covers current time', () => {
				const past: ScheduleWindow = { startDay: 3, startMinutes: 600, endDay: 3, endMinutes: 720 };
				const covering: ScheduleWindow = { startDay: 3, startMinutes: 900, endDay: 3, endMinutes: 960 };
				assert.strictEqual(determineAction(now, [past, covering]), 'dispatch');
			});

			test('returns skip if no schedules cover current time', () => {
				const past1: ScheduleWindow = { startDay: 3, startMinutes: 480, endDay: 3, endMinutes: 600 };
				const past2: ScheduleWindow = { startDay: 3, startMinutes: 660, endDay: 3, endMinutes: 780 };
				assert.strictEqual(determineAction(now, [past1, past2]), 'skip');
			});
		});

		describe('empty schedules', () => {
			test('returns skip when no schedules provided', () => {
				assert.strictEqual(determineAction(now, []), 'skip');
			});
		});

		describe('edge cases', () => {
			test('returns drain when exactly at end time', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 840, endDay: 3, endMinutes: 930 }; // Wed 14:00->15:30
				assert.strictEqual(determineAction(now, [schedule]), 'drain');
			});
			test('returns drain when exactly at end time of wrapped window', () => {
				const schedule: ScheduleWindow = { startDay: 6, startMinutes: 1320, endDay: 3, endMinutes: 930 }; // Sat 22:00->Wed 15:30
				assert.strictEqual(determineAction(now, [schedule]), 'drain');
			});

			test('returns dispatch when exactly at start time', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 930, endDay: 3, endMinutes: 1020 }; // Wed 15:30->17:00
				assert.strictEqual(determineAction(now, [schedule]), 'dispatch');
			});

			test('returns drain when window is only 1 minute long', () => {
				const schedule: ScheduleWindow = { startDay: 3, startMinutes: 930, endDay: 3, endMinutes: 931 }; // Wed 15:30->15:31
				assert.strictEqual(determineAction(now, [schedule]), 'drain');
			});
		});
	});
});
