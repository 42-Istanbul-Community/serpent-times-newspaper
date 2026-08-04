import { fail, redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
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
	},
	// drafts only - a published edition is what readers are pointed at.
	delete: async ({ request, locals }) => {
		const userId = requireUserId(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id)) return fail(400, { message: 'Invalid id' });

		await db
			.delete(newspaperEdition)
			.where(
				and(
					eq(newspaperEdition.id, id),
					eq(newspaperEdition.userId, userId),
					eq(newspaperEdition.status, 'draft')
				)
			);

		return { success: true };
	}
};
