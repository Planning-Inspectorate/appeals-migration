import type { RequestHandler } from 'express';
import session from 'express-session';
import type { RedisClient } from '../redis/redis-client.ts';

interface InitSessionOptions {
	redis: RedisClient | null;
	secure: boolean;
	secret: string;
}

export function initSessionMiddleware({ redis, secure, secret }: InitSessionOptions): RequestHandler {
	let store;
	if (redis) {
		store = redis.store;
	} else {
		store = new session.MemoryStore();
	}

	return session({
		secret: secret,
		resave: false,
		saveUninitialized: false,
		store,
		unset: 'destroy',
		cookie: {
			secure,
			maxAge: 86_400_000
		}
	});
}
