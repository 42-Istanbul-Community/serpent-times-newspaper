import { fail, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { pageTemplate, pageTemplateCategory } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUserId(locals);
	const templates = await db
		.select({
			id: pageTemplate.id,
			title: pageTemplate.title,
			category: pageTemplate.category,
			availability: pageTemplate.availability,
			cdnUrl: pageTemplate.cdnUrl
		})
		.from(pageTemplate)
		.where(eq(pageTemplate.userId, userId))
		.orderBy(desc(pageTemplate.updatedAt));

	return { templates };
};

export const actions: Actions = {
	// creates a draft template in the given category and redirects straight
	// into its editor - the per-category "+ New" buttons on the dashboard.
	create: async ({ request, locals }) => {
		const userId = requireUserId(locals);
		const category = (await request.formData()).get('category');
		const allowed = pageTemplateCategory.enumValues;

		if (typeof category !== 'string' || !allowed.includes(category as (typeof allowed)[number])) {
			return fail(400, { message: 'Invalid category' });
		}

		const [row] = await db
			.insert(pageTemplate)
			.values({ userId, title: 'Untitled', category: category as (typeof allowed)[number] })
			.returning({ id: pageTemplate.id });

		redirect(303, resolve('/staff/(editor)/page/[pageID]', { pageID: String(row.id) }));
	}
};
