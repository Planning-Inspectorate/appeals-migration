import { sleep } from './sleep.ts';

const RETRYABLE_PRISMA_CODES = new Set([
	'P1001', // Can't reach database server
	'P1002', // Database server timed out
	'P1008', // Operations timed out
	'P1017', // Server closed connection
	'P2024', // Timed out fetching connection from pool
	'P2034' // Transaction conflict (write conflict/deadlock)
]);

export interface RetryOptions {
	maxAttempts?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	baseDelayMs: 100,
	maxDelayMs: 2000
};

/**
 * Wraps an async operation with retry logic for transient Prisma errors.
 * Uses exponential backoff between retries.
 *
 * @throws The last error if all retries are exhausted or if the error is not retryable
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const { maxAttempts, baseDelayMs, maxDelayMs } = { ...DEFAULT_OPTIONS, ...options };

	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			if (!isRetryableError(error) || attempt === maxAttempts) {
				throw error;
			}

			const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
			await sleep(delay);
		}
	}

	throw lastError;
}

export function isRetryableError(error: unknown): boolean {
	if (error && typeof error === 'object') {
		if ('code' in error && typeof error.code === 'string') {
			return RETRYABLE_PRISMA_CODES.has(error.code);
		}
		if ('name' in error && error.name === 'PrismaClientInitializationError') {
			return true;
		}
	}
	return false;
}
