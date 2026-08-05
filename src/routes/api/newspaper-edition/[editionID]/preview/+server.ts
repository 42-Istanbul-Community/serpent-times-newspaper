import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { getBlurredCover } from '$lib/server/preview';
import type { RequestHandler } from './$types';

// GET /api/newspaper-edition/<editionID>/preview - the blurred first page the
// homepage shows a logged-out reader in place of the edition's PDF (which
// /api/cdn only hands to a session). Public on purpose: it is the teaser.
export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(400, 'Invalid id');

	const [edition] = await db
		.select({ id: newspaperEdition.id })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.status, 'published')));
	if (!edition) error(404, 'Not found');

	const png = await getBlurredCover(id);
	if (!png) error(404, 'Not found');

	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			// re-rendering the edition rewrites the cover this is made from.
			'cache-control': 'public, max-age=300'
		}
	});
};
