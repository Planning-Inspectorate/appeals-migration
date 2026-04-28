import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusClient } from '@azure/service-bus';
import { BaseService } from '@pins/appeals-migration-lib/app/base-service.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class ManageService extends BaseService {
	/**
	 * @private
	 */
	#config: Config;
	serviceBusClient: ServiceBusClient;

	constructor(config: Config) {
		super(config);
		this.#config = config;
		if (config.serviceBus.startsWith('Endpoint')) {
			// connection string
			this.serviceBusClient = new ServiceBusClient(config.serviceBus);
		} else {
			this.serviceBusClient = new ServiceBusClient(config.serviceBus, new DefaultAzureCredential());
		}
	}

	get authConfig(): Config['auth'] {
		return this.#config.auth;
	}

	get authDisabled(): boolean {
		return this.#config.auth.disabled;
	}

	get environment() {
		return this.#config.environment;
	}
}
