import { error, json } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { article, newspaperEdition, pageTemplate } from '$lib/server/db/schema';
import { getCurrentUserId } from '$lib/server/current-user';
import type { RequestHandler } from './$types';

const CREATABLE_CATEGORIES = ['cover', 'index', 'citation'] as const;

// POST /api/newspaper-edition/<editionID>/article - creates a single-page
// article row for a newly picked cover/index/citation template, and returns
// the full new row so the client can add it to editionState.articles without
// a second round trip. Never creates category='page' rows (a paper is only
// ever created through /writer) - the editionID ownership check exists so
// this can't be used to mint article rows outside an edition you own.
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const editionId = Number(params.editionID);
	if (!Number.isInteger(editionId)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const [edition] = await db
		.select({ id: newspaperEdition.id })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, editionId), eq(newspaperEdition.userId, userId)));
	if (!edition) error(404, 'Not found');

	const body = await request.json();
	const category = body.category;
	if (
		typeof category !== 'string' ||
		!CREATABLE_CATEGORIES.includes(category as (typeof CREATABLE_CATEGORIES)[number])
	) {
		error(400, 'Invalid category');
	}
	const pageTemplateId = Number(body.pageTemplateId);
	if (!Number.isInteger(pageTemplateId)) error(400, 'Invalid pageTemplateId');

	const [template] = await db
		.select({ id: pageTemplate.id, title: pageTemplate.title, category: pageTemplate.category })
		.from(pageTemplate)
		.where(
			and(
				eq(pageTemplate.id, pageTemplateId),
				eq(pageTemplate.userId, userId),
				eq(pageTemplate.category, category as (typeof CREATABLE_CATEGORIES)[number]),
				inArray(pageTemplate.availability, ['used', 'unused'])
			)
		);
	if (!template) error(404, 'Template not found');

	const [row] = await db
		.insert(article)
		.values({
			userId,
			title: template.title,
			category: template.category,
			pages: [
				{
					id: crypto.randomUUID(),
					label: template.title,
					pageTemplateId: template.id,
					slotValues: {}
				}
			]
		})
		.returning();

	return json(row);
};
