import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { account, user as userTable } from '$lib/server/db/schema';
import { ASSIGNABLE_ROLES, getRole, isDevAccount, resolveRole } from '$lib/server/roles';
import { isScriptKeyAuthorized } from '$lib/server/script-key';
import type { RequestHandler } from './$types';

const ACCEPTED_ROLES = ['dev', ...ASSIGNABLE_ROLES] as const;

type RoleReport = {
	login: string | null;
	name: string;
	role: string;
	storedRole: string | null;
	dev: boolean;
};

/** One line per user for `?format=text`, e.g. "mtaheri is a dev in editor's clothing". */
function describe({ login, role, storedRole, dev }: RoleReport) {
	const who = login ?? 'someone';
	if (dev && storedRole) {
		return `${who} is a dev in ${storedRole === 'user' ? 'reader' : storedRole}'s clothing`;
	}
	if (role === 'dev') return `${who} is a dev`;
	if (role === 'user') return `${who} is just a reader`;
	return `${who} is ${role === 'admin' || role === 'editor' ? 'an' : 'a'} ${role}`;
}

/**
 * Read roles: `?login=<login>` for one user, no query for everyone.
 * `?format=text` swaps the JSON for one sentence per line.
 *
 * 'dev' is never stored, so each row reports the effective `role` next to the
 * two inputs it came from - `storedRole` (the db column) and `dev` (listed in
 * INTRA_DEV_IDS). A dev who set an override reads as `dev: true` with a
 * non-null `storedRole`, i.e. clearing it hands them 'dev' back.
 */
export const GET: RequestHandler = async ({ request, url }) => {
	if (!isScriptKeyAuthorized(request)) return error(401, 'Unauthorized');

	const login = url.searchParams.get('login');

	const rows = await db
		.select({
			login: userTable.login,
			name: userTable.name,
			storedRole: userTable.role,
			intraAccountId: account.accountId
		})
		.from(userTable)
		.leftJoin(account, and(eq(account.userId, userTable.id), eq(account.providerId, 'intra')))
		.where(login ? eq(userTable.login, login) : undefined)
		.orderBy(userTable.createdAt);

	if (login && rows.length === 0) {
		return error(404, `No user with login "${login}" - have they signed in yet?`);
	}

	const users: RoleReport[] = rows.map((row) => ({
		login: row.login,
		name: row.name,
		role: getRole({ role: row.storedRole }, row.intraAccountId ?? undefined),
		storedRole: row.storedRole,
		dev: isDevAccount(row.intraAccountId)
	}));

	if (url.searchParams.get('format') === 'text') {
		const lines = users.length ? users.map(describe) : ['nobody has signed in yet'];
		return new Response(lines.join('\n') + '\n', {
			headers: { 'content-type': 'text/plain; charset=utf-8' }
		});
	}

	return json({ ok: true, users });
};

export const POST: RequestHandler = async ({ request }) => {
	if (!isScriptKeyAuthorized(request)) return error(401, 'Unauthorized');

	const body = await request.json();
	const login = body?.login;
	const role = body?.role;

	if (typeof login !== 'string' || !login) return error(400, 'Missing "login" in body');
	if (typeof role !== 'string' || !(ACCEPTED_ROLES as readonly string[]).includes(role)) {
		return error(400, `"role" must be one of: ${ACCEPTED_ROLES.join(', ')}`);
	}

	const [target] = await db
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.login, login));
	if (!target) return error(404, `No user with login "${login}" - have they signed in yet?`);

	// 'dev' isn't storable: clearing the column hands the role back to INTRA_DEV_IDS.
	const stored = role === 'dev' ? null : role;
	await db.update(userTable).set({ role: stored }).where(eq(userTable.id, target.id));

	return json({ ok: true, login, role: await resolveRole({ id: target.id, role: stored }) });
};
