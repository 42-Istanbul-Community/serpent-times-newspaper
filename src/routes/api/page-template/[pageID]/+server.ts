import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	pageTemplate,
	pageTemplateAvailability,
	pageTemplateCategory
} from '$lib/server/db/schema';
import { getCurrentUserId } from '$lib/server/current-user';
import type { RequestHandler } from './$types';

// GET /api/page-template/<pageID> - fetches one full template row, for
// rendering only (no userId filter - a template can be someone else's, e.g.
// when a body paper written against another designer's approved template
// gets placed into a newspaper edition; see edition-sync.svelte.ts's
// addPaper, which needs a paper's referenced templates registered client-side
// before its pages can render). Matches +page.server.ts's own bulk template
// load, which is likewise unscoped by owner.
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.pageID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const [row] = await db.select().from(pageTemplate).where(eq(pageTemplate.id, id));
	if (!row) error(404, 'Not found');

	return json(row);
};

// PATCH /api/page-template/<pageID> - the editor's autosave (elements/
// title/description/category), the autosave-triggered thumbnail capture
// (cdnUrl), and the topbar's "Approve" action (availability) all go through
// here. userId/id/createdAt/updatedAt are never accepted from the client.
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const id = Number(params.pageID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const body = await request.json();

	const patch: Partial<typeof pageTemplate.$inferInsert> = {};
	if (Array.isArray(body.elements)) patch.elements = body.elements;
	if (typeof body.title === 'string') patch.title = body.title;
	if (typeof body.description === 'string') patch.description = body.description;
	if (
		typeof body.category === 'string' &&
		pageTemplateCategory.enumValues.includes(body.category)
	) {
		patch.category = body.category as (typeof pageTemplateCategory.enumValues)[number];
	}
	if (
		typeof body.availability === 'string' &&
		pageTemplateAvailability.enumValues.includes(body.availability)
	) {
		patch.availability = body.availability as (typeof pageTemplateAvailability.enumValues)[number];
	}
	// only ever a same-origin CDN path this app generated itself (see
	// capture-thumbnail.ts) - never an arbitrary external URL.
	if (typeof body.cdnUrl === 'string' && body.cdnUrl.startsWith('/api/cdn/')) {
		patch.cdnUrl = body.cdnUrl;
	}

	if (Object.keys(patch).length === 0) return json({ ok: true });

	const [row] = await db
		.update(pageTemplate)
		.set(patch) // updatedAt is handled by $onUpdate - never set it manually
		.where(and(eq(pageTemplate.id, id), eq(pageTemplate.userId, userId)))
		.returning({ id: pageTemplate.id });

	if (!row) error(404, 'Not found'); // covers "doesn't exist" and "not yours" identically

	return json({ ok: true, id: row.id });
};
