import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { article, publicationStatus } from '$lib/server/db/schema';
import { getCurrentUserId } from '$lib/server/current-user';
import type { RequestHandler } from './$types';

// GET /api/article/<articleID> - fetches one full article row (id/title/
// pages/etc.) for the current user. Used by the newspaper editor when a body
// paper is picked from the paper-picker: editionState only ever holds rows
// for articles referenced at load time, so a freshly added paper needs its
// row fetched and registered client-side before it can render (see
// edition-sync.svelte.ts's addPaper) - otherwise it silently stays invisible
// until the next full page load re-hydrates from the server.
export const GET: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.articleID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const [row] = await db
		.select()
		.from(article)
		.where(and(eq(article.id, id), eq(article.userId, userId)));

	if (!row) error(404, 'Not found');

	return json(row);
};

// PATCH /api/article/<articleID> - the writer's autosave (title/pages), the
// autosave-triggered thumbnail capture (cdnUrl), and the topbar's Publish
// button (status) all go through here. userId/id/createdAt/updatedAt are
// never accepted from the client.
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const id = Number(params.articleID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const body = await request.json();

	const patch: Partial<typeof article.$inferInsert> = {};
	if (typeof body.title === 'string') patch.title = body.title;
	// trusted shape from our own client (paperState.pages) - same level of
	// trust the existing /api/page-template/[pageID] endpoint gives `elements`.
	if (Array.isArray(body.pages)) patch.pages = body.pages;
	if (typeof body.status === 'string' && publicationStatus.enumValues.includes(body.status)) {
		patch.status = body.status as (typeof publicationStatus.enumValues)[number];
	}
	// only ever a same-origin CDN path this app generated itself (see
	// capture-thumbnail.ts) - never an arbitrary external URL.
	if (typeof body.cdnUrl === 'string' && body.cdnUrl.startsWith('/api/cdn/')) {
		patch.cdnUrl = body.cdnUrl;
	}

	if (Object.keys(patch).length === 0) return json({ ok: true });

	const [row] = await db
		.update(article)
		.set(patch) // updatedAt handled by $onUpdate - never set it manually
		.where(and(eq(article.id, id), eq(article.userId, userId)))
		.returning({ id: article.id });

	if (!row) error(404, 'Not found'); // covers "doesn't exist" and "not yours" identically

	return json({ ok: true, id: row.id });
};

// DELETE /api/article/<articleID> - only ever called by the newspaper editor
// when replacing/removing a cover, index, or citation article (never for a
// body paper - removing a paper from an edition only unlinks its id from
// articleIds, the article itself stays intact).
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.articleID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const [row] = await db
		.delete(article)
		.where(and(eq(article.id, id), eq(article.userId, userId)))
		.returning({ id: article.id });

	if (!row) error(404, 'Not found');

	return json({ ok: true, id: row.id });
};
