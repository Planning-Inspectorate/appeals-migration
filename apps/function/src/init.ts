import type { Config } from './config.ts';
import { loadConfig } from './config.ts';
import { FunctionService } from './service.ts';

let config: Config | undefined;

/**
 * Load and cache the configuration (singleton)
 * Config is loaded once and reused across all service instances
 */
export function initialiseConfig(): Config {
	if (config) {
		return config;
	}
	config = loadConfig();
	return config;
}

/**
 * Create a new FunctionService instance per invocation
 * This enables better parallelism by giving each invocation its own clients
 */
export function createService(): FunctionService {
	const cfg = initialiseConfig();
	return new FunctionService(cfg);
}

let singletonService: FunctionService | undefined;

/**
 * @deprecated Use createService() for per-invocation instances or initialiseConfig() for shared config
 * Kept for backward compatibility with timer functions that may benefit from singleton
 */
export function initialiseService(): FunctionService {
	if (singletonService) {
		return singletonService;
	}
	singletonService = createService();
	return singletonService;
}
