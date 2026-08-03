import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { getCurrentUserId } from '$lib/server/current-user';
import { renderEditionPdf, saveEditionPdf } from '$lib/server/pdf';
import type { RequestHandler } from './$types';

// GET /api/newspaper-edition/<editionID>/pdf - prints the edition's own
// editor route (/newspaper/<id>) to PDF via headless Chromium. That route's
// print CSS (see +layout.svelte/page-renderer.svelte) hides the topbar/panel
// and strips manual-slot input chrome, so this is exactly what an editor
// sees, minus the editing UI - never a separately maintained layout.
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const [edition] = await db
		.select({ id: newspaperEdition.id, title: newspaperEdition.title })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.userId, userId)));
	if (!edition) error(404, 'Not found');

	const pdf = await renderEditionPdf(url.origin, id);

	return new Response(new Uint8Array(pdf), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': `attachment; filename="${edition.title.replace(/[\r\n"]/g, '')}.pdf"`
		}
	});
};

// POST /api/newspaper-edition/<editionID>/pdf - the topbar's "Refresh PDF"
// button: re-bakes the PDF at the same fixed path a Publish already writes
// to (cdn/newspaper/<id>/newspaper.pdf), overwriting it in place. Exists
// because the publish-time bake only fires on the PATCH that flips status
// to 'published' - further edits to an already-published edition don't
// touch that file again on their own, so this is the manual "catch it back
// up" action. Never touches `status` - publishing and refreshing are
// independent.
export const POST: RequestHandler = async ({ params, url, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const userId = getCurrentUserId(locals);
	const [edition] = await db
		.select({ id: newspaperEdition.id })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.userId, userId)));
	if (!edition) error(404, 'Not found');

	await saveEditionPdf(id, await renderEditionPdf(url.origin, id));

	return json({ ok: true });
};
