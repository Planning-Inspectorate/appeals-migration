import type { Handler } from 'express';

/**
 * Add configuration values to locals.
 */
export function addLocalsConfiguration(environment?: string): Handler {
	return (req, res, next) => {
		const links: { href: string; text: string; active?: boolean }[] = [
			{ href: '/', text: 'Summary' },
			{ href: '/cases', text: 'Case list' },
			{ href: '/configure', text: 'Configure' },
			{ href: '/schedules', text: 'Schedules' },
			{ href: '/auth/signout', text: 'Sign out' }
		];
		res.locals.config = {
			styleFile: 'style-6ca7b965.css',
			headerTitle: 'Manage appeals migration',
			headerLinks: links.map((l) => {
				l.active = req.url === l.href;
				return l;
			}),
			environment: (environment && ENVIRONMENT_NAMES[environment]) || ''
		};
		next();
	};
}

const ENVIRONMENT_NAMES: Record<string, string> = Object.freeze({
	local: 'Local development',
	test: 'Test environment'
});
