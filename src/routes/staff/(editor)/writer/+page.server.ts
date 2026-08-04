import { fail, redirect } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { article } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUserId(locals);
	const papers = await db
		.select({
			id: article.id,
			title: article.title,
			status: article.status,
			pages: article.pages,
			cdnUrl: article.cdnUrl
		})
		.from(article)
		.where(and(eq(article.userId, userId), eq(article.category, 'page')))
		.orderBy(desc(article.updatedAt));

	return { papers };
};

export const actions: Actions = {
	// creates an empty draft paper and redirects straight into its editor.
	create: async ({ locals }) => {
		const userId = requireUserId(locals);
		const [row] = await db
			.insert(article)
			.values({ userId, title: 'Untitled', pages: [] })
			.returning({ id: article.id });

		redirect(303, resolve('/staff/(editor)/writer/[paperID]', { paperID: String(row.id) }));
	},
	// drafts only - a published paper may already sit in an edition.
	delete: async ({ request, locals }) => {
		const userId = requireUserId(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id)) return fail(400, { message: 'Invalid id' });

		await db
			.delete(article)
			.where(
				and(
					eq(article.id, id),
					eq(article.userId, userId),
					eq(article.category, 'page'),
					eq(article.status, 'draft')
				)
			);

		return { success: true };
	}
};
