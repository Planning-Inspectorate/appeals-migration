import type { NextFunction, Request, Response } from 'express';

export const PREVIOUS_URL = 'previousUrlList';

/**
 * Middleware to save the current URL to a list in session for use with back links
 *
 * @param req
 * @param res
 * @param next
 */
export function saveUrlToSessionMiddleware(req: Request, res: Response, next: NextFunction): void {
	if (req.method === 'GET') {
		// only save if it's a GET request to avoid e.g. POSTs becoming back links!
		saveUrlToSession(req, req.url);
	}
	next();
}

/**
 * Add the URL into a list in session
 *
 * @param req
 * @param url
 */
export function saveUrlToSession(req: Request, url: string) {
	if (!req.session) {
		throw new Error('request session required');
	}
	const list: string[] = req.session[PREVIOUS_URL] || (req.session[PREVIOUS_URL] = []);
	list.push(url);
	if (list.length > 2) {
		list.shift(); // just keep the last 2 URLs: current & previous
	}
}

/**
 * Get the oldest URL from the session list (i.e. the previous one)
 * @param req
 */
export function getPreviousUrlFromSession(req: Request): string | null {
	const session = req?.session || {};
	const list: string[] = session[PREVIOUS_URL] || [];
	if (list.length === 2) {
		const previousUrl = list[0]; // 1st element is previous URL
		if (req.url !== previousUrl) {
			return previousUrl;
		}
	}
	return null;
}
