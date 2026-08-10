import type { User } from 'better-auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import { resolveRole } from '$lib/server/roles';
import type { LayoutServerLoad } from './$types';

// `userNames` is an `id -> name` lookup used app-wide (e.g. page-renderer's
// citation credit lookup, see page-renderer.svelte). Built once here from a
// real `select id, name from user`. `user` is the current session user (or
// null), populated by the better-auth hook in src/hooks.server.ts and used
// by the nav to show login/logout state.
export const load: LayoutServerLoad = async ({ locals }) => {
	const user =
		(locals.user as (User & { login?: string | null; role?: string | null }) | undefined) ?? null;
	const role = user ? await resolveRole(user) : null;

	// Only query userTable for authenticated staff/readers (skips unnecessary DB query for anonymous visitors)
	let userNames: Record<string, string> = {};
	if (user) {
		const rows = await db.select({ id: userTable.id, name: userTable.name }).from(userTable);
		userNames = Object.fromEntries(rows.map((u) => [u.id, u.name]));
	}

	return { user, role, userNames };
};
