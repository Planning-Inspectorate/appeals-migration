import type { ValidationReasonLookups } from '../map-source-to-sink.ts';

/**
 * Mock validation reason lookups for testing
 * These mirror the static seed data from the database
 */
export const mockValidationReasonLookups: ValidationReasonLookups = {
	incomplete: new Map([
		['Appellant name is not the same', 1],
		["LPA's decision notice is missing", 2],
		['Documents or information are missing', 3],
		['Attachments or appendices are missing', 4]
	]),
	invalid: new Map([
		['Appeal has not been submitted on time', 1],
		['Documents have not been submitted on time', 2],
		['Other', 3]
	]),
	lpaIncomplete: new Map([
		['Missing documents', 1],
		['Incorrect fee', 2],
		['Additional information required', 3]
	])
};
