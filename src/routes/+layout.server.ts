import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

// `userNames` is an `id -> name` lookup used app-wide (e.g. page-renderer's
// citation credit lookup, see page-renderer.svelte). Built once here from a
// real `select id, name from user`. `user` is the current session user (or
// null), populated by the better-auth hook in src/hooks.server.ts and used
// by the nav to show login/logout state.
export const load: LayoutServerLoad = async ({ locals }) => {
	const rows = await db.select({ id: userTable.id, name: userTable.name }).from(userTable);
	const userNames = Object.fromEntries(rows.map((u) => [u.id, u.name]));

	return { user: locals.user ?? null, userNames };
};
