import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import type { LayoutServerLoad } from './$types';

// The editor's chrome (panel + topbar) has to know which kind of edition it
// is wrapping before the page below it hydrates, or an uploaded edition
// would flash the full assembly panel on first paint.
export const load: LayoutServerLoad = async ({ params, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(404, 'Not found');
	const userId = requireUserId(locals);

	const [edition] = await db
		.select({ kind: newspaperEdition.kind })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.userId, userId)));
	if (!edition) error(404, 'Not found');

	return { kind: edition.kind };
};
