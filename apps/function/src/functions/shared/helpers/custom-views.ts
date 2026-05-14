// custom views are used in Horizon to override the toolbar/UI on a case

import type { HorizonWebClient } from '@pins/appeals-migration-lib/horizon/web/horizon-web-client.ts';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/London',
	dateStyle: 'long',
	timeStyle: 'medium'
});

/**
 * Create custom views in Horizon to show that a case is being migrated and hiding the case toolbar.
 *
 * Only one custom view is shown, whichever is first in the list. So later updates have lower numbers.
 */
export class CustomViewManager {
	#horizon: HorizonWebClient;

	constructor(horizon: HorizonWebClient) {
		this.#horizon = horizon;
	}

	async addInQueueView(caseNodeId: string) {
		const now = new Date();
		const date = dateFormatter.format(now);
		const queueView = `<h1 style="color:red">
			${date}: This case has been queued for migration to Manage appeals. It is not editable here.
			It will be available in Manage appeals once migrated.
</h1>`;
		const queueViewName = '03_customview_case_migration_queued.html';
		await this.#horizon.addCustomView(caseNodeId, queueView, queueViewName);
	}

	async addInProgressView(caseNodeId: string) {
		const now = new Date();
		const date = dateFormatter.format(now);
		const queueView = `<h1 style="color:red">
			${date}: This case is being migrated to Manage appeals. It is not editable here.
			It will be available in Manage appeals once migrated.
</h1>`;
		const queueViewName = '02_customview_case_migration_in_progress.html';
		await this.#horizon.addCustomView(caseNodeId, queueView, queueViewName);
	}

	async addMigratedView(caseNodeId: string) {
		const now = new Date();
		const date = dateFormatter.format(now);
		const queueView = `<h1 style="color:red">
			${date}: This case has been migrated to Manage appeals. It is not editable here.
</h1>`;
		const queueViewName = '01_customview_case_migration_migrated.html';
		await this.#horizon.addCustomView(caseNodeId, queueView, queueViewName);
	}
}
