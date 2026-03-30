import 'express-session';

declare module 'express-session' {
	// extend SessionData to include custom values
	// using [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
	interface SessionData {
		[key: string]: any;
	}
}
