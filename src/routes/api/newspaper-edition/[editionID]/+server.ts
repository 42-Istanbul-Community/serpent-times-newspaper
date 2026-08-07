import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition, publicationStatus } from '$lib/server/db/schema';
import { requireSectionUserId } from '$lib/server/require-login';
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

	const userId = await requireSectionUserId(locals, 'newspaper');
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
		.returning({ id: newspaperEdition.id, kind: newspaperEdition.kind });

	if (!row) error(404, 'Not found'); // covers "doesn't exist" and "not yours" identically

	// publishing also bakes a downloadable PDF at a fixed, deterministic path
	// (cdn/newspaper/<id>/newspaper.pdf), no DB column needed. The reader
	// itself doesn't wait on this - it renders the edition's rows as HTML -
	// so this is purely the offline/print artifact. Best-effort: a failure
	// here shouldn't undo the publish, and the topbar's Download PDF button
	// is still a manual fallback.
	// ...except for an uploaded back-issue, where that file IS the upload and
	// there are no pages to print in the first place.
	if (patch.status === 'published' && row.kind !== 'pdf') {
		try {
			const cookie = request.headers.get('cookie') ?? '';
			await saveEditionPdf(id, await renderEditionPdf(url.origin, id, cookie));
		} catch {
			// best-effort, see above
		}
	}

	return json({ ok: true, id: row.id });
};
