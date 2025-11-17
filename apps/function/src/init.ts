import { loadConfig } from './config.ts';
import { FunctionService } from './service.ts';

let service: FunctionService | undefined;

export function initialiseService(): FunctionService {
	if (service) {
		return service;
	}
	const config = loadConfig();
	service = new FunctionService(config);
	return service;
}
