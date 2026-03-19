import { mock } from 'node:test';

export function createSourceDatabaseMock() {
	return {
		appealHas: { findFirst: mock.fn() },
		appealS78: { findFirst: mock.fn() },
		appealDocument: { findMany: mock.fn() },
		appealEvent: { findMany: mock.fn() },
		appealServiceUser: { findMany: mock.fn() }
	};
}

export function createSinkDatabaseMock() {
	return {
		appeal: { findUnique: mock.fn() },
		document: { findMany: mock.fn() }
	};
}
