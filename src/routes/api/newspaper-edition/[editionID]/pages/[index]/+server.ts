import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import { pageImagePath } from '$lib/server/page-images';
import type { RequestHandler } from './$types';

// GET /api/newspaper-edition/<editionID>/pages/<n> - one baked page for the
// homepage reader. Behind a session for the same reason the PDF is: these
// images are the newspaper.
export const GET: RequestHandler = async ({ params, locals }) => {
	requireUserId(locals);

	const id = Number(params.editionID);
	const index = Number(params.index);
	if (!Number.isInteger(id) || !Number.isInteger(index) || index < 1) error(400, 'Invalid id');

	const [edition] = await db
		.select({ id: newspaperEdition.id })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.status, 'published')));
	if (!edition) error(404, 'Not found');

	const bytes = await readFile(pageImagePath(id, index)).catch(() => null);
	if (!bytes) error(404, 'Not found');

	return new Response(new Uint8Array(bytes), {
		headers: {
			'content-type': 'image/jpeg',
			'cache-control': 'private, max-age=300'
		}
	});
};
