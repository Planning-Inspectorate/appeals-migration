import { initDatabaseClient, type MigrationPrismaClient } from '@pins/appeals-migration-database';
import type { Logger } from 'pino';
import { initRedis } from '../redis/index.ts';
import type { RedisClient } from '../redis/redis-client.ts';
import { initLogger } from '../util/logger.ts';
import type { BaseConfig } from './config-types.d.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class BaseService {
	#config: BaseConfig;
	logger: Logger;
	dbClient: MigrationPrismaClient;
	redisClient: RedisClient | null;

	constructor(config: BaseConfig) {
		this.#config = config;
		const logger = initLogger(config);
		this.logger = logger;
		this.dbClient = initDatabaseClient(config, logger);
		this.redisClient = initRedis(config.session, logger);
	}

	get cacheControl() {
		return this.#config.cacheControl;
	}

	/**
	 * Alias of dbClient
	 */
	get db(): MigrationPrismaClient {
		return this.dbClient;
	}

	get gitSha() {
		return this.#config.gitSha;
	}

	get secureSession() {
		return this.#config.NODE_ENV === 'production';
	}

	get sessionSecret() {
		return this.#config.session.secret;
	}

	get staticDir() {
		return this.#config.staticDir;
	}
}
