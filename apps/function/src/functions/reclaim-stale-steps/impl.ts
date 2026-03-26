import type { InvocationContext, Timer, TimerHandler } from '@azure/functions';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';
import type { FunctionService } from '../../service.ts';
import { stepStatus } from '../../types.ts';

export function buildReclaimStaleSteps(service: FunctionService): TimerHandler {
	return async (timer: Timer, context: InvocationContext): Promise<void> => {
		const timeoutMs = service.reclaimStaleStepsTimeoutMinutes * 60 * 1000;
		const cutoffTime = new Date(Date.now() - timeoutMs);

		const staleSteps = await withRetry(() =>
			service.databaseClient.migrationStep.updateMany({
				where: {
					status: stepStatus.processing,
					startedAt: { lt: cutoffTime }
				},
				data: {
					status: stepStatus.waiting,
					errorMessage: `Reclaimed due to stale processing (>${service.reclaimStaleStepsTimeoutMinutes} minutes)`
				}
			})
		);

		if (staleSteps && staleSteps.count > 0) {
			context.log(`Reclaimed ${staleSteps.count} stale migration steps`);
		} else {
			context.log('No stale migration steps found');
		}
	};
}
