import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { getCurrentUserId } from '$lib/server/current-user';
import type { PageServerLoad } from './$types';

// homepage: reading list of published newspaper editions, newest first -
// only published editions ever get a baked PDF (see the newspaper-edition
// PATCH endpoint's publish hook), so unpublished ones have nothing to read.
export const load: PageServerLoad = async ({ locals }) => {
	const userId = getCurrentUserId(locals);
	const editions = await db
		.select({
			id: newspaperEdition.id,
			title: newspaperEdition.title,
			cdnUrl: newspaperEdition.cdnUrl
		})
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.userId, userId), eq(newspaperEdition.status, 'published')))
		.orderBy(desc(newspaperEdition.updatedAt));

	return { editions };
};
