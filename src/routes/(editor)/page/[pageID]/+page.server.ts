import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { pageTemplate } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.pageID);
	if (!Number.isInteger(id)) error(404, 'Not found');

	const userId = requireUserId(locals);
	const [row] = await db
		.select()
		.from(pageTemplate)
		.where(and(eq(pageTemplate.id, id), eq(pageTemplate.userId, userId)));

	if (!row) error(404, 'Not found');

	return { template: row };
};
