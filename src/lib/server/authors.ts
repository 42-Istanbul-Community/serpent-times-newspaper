import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import type { AuthorMap } from '$lib/authors';

/** Looks up just the ids a picker is about to offer, keyed for lookup. */
export async function loadAuthors(userIds: string[]): Promise<AuthorMap> {
	const ids = [...new Set(userIds)];
	if (ids.length === 0) return {};

	const rows = await db
		.select({ id: user.id, name: user.name, login: user.login, image: user.image })
		.from(user)
		.where(inArray(user.id, ids));

	return Object.fromEntries(rows.map((row) => [row.id, row]));
}
