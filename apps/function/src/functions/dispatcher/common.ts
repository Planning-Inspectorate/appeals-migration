import type { ItemToMigrate } from '../../types.ts';
import type { StepIdField } from './types.ts';

export function getStepId(itemToMigrate: ItemToMigrate, stepIdField: StepIdField): number {
	return itemToMigrate[stepIdField as keyof ItemToMigrate] as unknown as number;
}
