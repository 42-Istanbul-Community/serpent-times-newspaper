import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { requireSectionUserId } from '$lib/server/require-login';
import { renderEditionPdf, saveEditionPdf } from '$lib/server/pdf';
import type { RequestHandler } from './$types';

// GET /api/newspaper-edition/<editionID>/pdf - prints /print/newspaper/<id>
// to PDF via headless Chromium: the same PageView components the homepage
// reader renders, never a separately maintained layout.
//
// Downloading is a read, so this is gated by the newspaper section (editor,
// admin, dev) and NOT by ownership - any editor can export any edition,
// draft or published. Writing (POST below) stays with the owner.
export const GET: RequestHandler = async ({ params, request, url, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	await requireSectionUserId(locals, 'newspaper');
	const [edition] = await db
		.select({ id: newspaperEdition.id, title: newspaperEdition.title })
		.from(newspaperEdition)
		.where(eq(newspaperEdition.id, id));
	if (!edition) error(404, 'Not found');

	const pdf = await renderEditionPdf(url.origin, id, request.headers.get('cookie') ?? '');

	return new Response(new Uint8Array(pdf), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': `attachment; filename="${edition.title.replace(/[\r\n"]/g, '')}.pdf"`
		}
	});
};

// POST /api/newspaper-edition/<editionID>/pdf - the topbar's "Refresh PDF"
// button: re-bakes the PDF at the same fixed path a Publish already writes
// to, overwriting it in place. Exists
// because the publish-time bake only fires on the PATCH that flips status
// to 'published' - further edits to an already-published edition don't
// touch that file again on their own, so this is the manual "catch it back
// up" action. Never touches `status` - publishing and refreshing are
// independent.
export const POST: RequestHandler = async ({ params, request, url, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = await requireSectionUserId(locals, 'newspaper');
	const [edition] = await db
		.select({ id: newspaperEdition.id })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.userId, userId)));
	if (!edition) error(404, 'Not found');

	const cookie = request.headers.get('cookie') ?? '';
	await saveEditionPdf(id, await renderEditionPdf(url.origin, id, cookie));

	return json({ ok: true });
};
