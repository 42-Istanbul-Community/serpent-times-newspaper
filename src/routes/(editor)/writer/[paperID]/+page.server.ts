import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { article, pageTemplate } from '$lib/server/db/schema';
import type { ArticlePage } from '$lib/server/db/schema/editor/article';
import { requireUserId } from '$lib/server/require-login';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.paperID);
	if (!Number.isInteger(id)) error(404, 'Not found');

	const userId = requireUserId(locals);
	const [articleRow] = await db
		.select()
		.from(article)
		.where(and(eq(article.id, id), eq(article.userId, userId), eq(article.category, 'page')));
	if (!articleRow) error(404, 'Not found');

	const templateIds = [
		...new Set((articleRow.pages as ArticlePage[]).map((p) => p.pageTemplateId))
	];
	const templates =
		templateIds.length > 0
			? await db.select().from(pageTemplate).where(inArray(pageTemplate.id, templateIds))
			: [];

	// pickable for a NEW page: category='page' only (cover/index/citation
	// are filled by other flows), and not drafts - a draft template's
	// element ids are unstable while its designer is still editing.
	const pickableTemplates = await db
		.select()
		.from(pageTemplate)
		.where(
			and(
				eq(pageTemplate.userId, userId),
				eq(pageTemplate.category, 'page'),
				inArray(pageTemplate.availability, ['used', 'unused'])
			)
		);

	return { article: articleRow, templates, pickableTemplates };
};
