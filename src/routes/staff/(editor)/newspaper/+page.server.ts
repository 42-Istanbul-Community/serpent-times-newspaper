import { redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUserId(locals);
	const editions = await db
		.select({
			id: newspaperEdition.id,
			title: newspaperEdition.title,
			status: newspaperEdition.status,
			articleIds: newspaperEdition.articleIds,
			cdnUrl: newspaperEdition.cdnUrl
		})
		.from(newspaperEdition)
		.where(eq(newspaperEdition.userId, userId))
		.orderBy(desc(newspaperEdition.updatedAt));

	return { editions };
};

export const actions: Actions = {
	// creates an empty draft edition and redirects straight into its editor.
	create: async ({ locals }) => {
		const userId = requireUserId(locals);
		const [row] = await db
			.insert(newspaperEdition)
			.values({ userId, title: 'Untitled' })
			.returning({ id: newspaperEdition.id });

		redirect(303, resolve('/staff/(editor)/newspaper/[editionID]', { editionID: String(row.id) }));
	}
};
