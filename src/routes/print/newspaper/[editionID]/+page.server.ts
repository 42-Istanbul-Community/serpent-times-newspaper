import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { requireSectionUserId } from '$lib/server/require-login';
import { loadEditionContent } from '$lib/server/edition-content';
import type { PageServerLoad } from './$types';

// The page the PDF bake prints (see $lib/server/pdf.ts) - the edition's
// assembled pages and nothing else, no editor chrome to strip with print CSS
// and no publish state to satisfy, so a draft exports exactly like a
// published one.
//
// Gated by the newspaper section (editor, plus admin/dev) rather than by
// ownership: exporting is a read, and any editor legitimately needs to pull
// a PDF of an edition they didn't personally assemble.
export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(404, 'Not found');

	await requireSectionUserId(locals, 'newspaper');

	const [edition] = await db.select().from(newspaperEdition).where(eq(newspaperEdition.id, id));
	if (!edition) error(404, 'Not found');

	return { title: edition.title, content: await loadEditionContent(edition) };
};
