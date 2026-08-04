import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { ASSIGNABLE_ROLES, resolveRole } from '$lib/server/roles';
import { isScriptKeyAuthorized } from '$lib/server/script-key';
import type { RequestHandler } from './$types';

const ACCEPTED_ROLES = ['dev', ...ASSIGNABLE_ROLES] as const;

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
