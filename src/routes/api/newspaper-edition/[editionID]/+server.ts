import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition, publicationStatus } from '$lib/server/db/schema';
import { getCurrentUserId } from '$lib/server/current-user';
import { renderEditionPdf, saveEditionPdf } from '$lib/server/pdf';
import type { RequestHandler } from './$types';

// PATCH /api/newspaper-edition/<editionID> - the newspaper editor's autosave
// (title/coverArticleId/indexArticleIds/citationArticleIds/articleIds), the
// autosave-triggered thumbnail capture (cdnUrl), and the topbar's Publish
// button (status) all go through here. userId/id/createdAt/updatedAt are
// never accepted from the client.
export const PATCH: RequestHandler = async ({ params, request, locals, url }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const body = await request.json();

	const patch: Partial<typeof newspaperEdition.$inferInsert> = {};
	if (typeof body.title === 'string') patch.title = body.title;
	if (body.coverArticleId === null || typeof body.coverArticleId === 'number') {
		patch.coverArticleId = body.coverArticleId;
	}
	// trusted shape from our own client (editionState's arrays) - same level
	// of trust the article endpoint gives `pages`.
	if (Array.isArray(body.indexArticleIds)) patch.indexArticleIds = body.indexArticleIds;
	if (Array.isArray(body.citationArticleIds)) patch.citationArticleIds = body.citationArticleIds;
	if (Array.isArray(body.articleIds)) patch.articleIds = body.articleIds;
	if (typeof body.status === 'string' && publicationStatus.enumValues.includes(body.status)) {
		patch.status = body.status as (typeof publicationStatus.enumValues)[number];
	}
	// only ever a same-origin CDN path this app generated itself.
	if (typeof body.cdnUrl === 'string' && body.cdnUrl.startsWith('/api/cdn/')) {
		patch.cdnUrl = body.cdnUrl;
	}

	if (Object.keys(patch).length === 0) return json({ ok: true });

	const [row] = await db
		.update(newspaperEdition)
		.set(patch) // updatedAt handled by $onUpdate - never set it manually
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.userId, userId)))
		.returning({ id: newspaperEdition.id });

	if (!row) error(404, 'Not found'); // covers "doesn't exist" and "not yours" identically

	// publishing also bakes a readable PDF at a fixed, deterministic path
	// (cdn/newspaper/<id>/newspaper.pdf) - the homepage's "read online" link
	// points straight at it, no DB column needed. Best-effort: a failure
	// here shouldn't undo the publish - the topbar's Download PDF button is
	// still a manual fallback.
	if (patch.status === 'published') {
		try {
			await saveEditionPdf(id, await renderEditionPdf(url.origin, id));
		} catch {
			// best-effort, see above
		}
	}

	return json({ ok: true, id: row.id });
};
