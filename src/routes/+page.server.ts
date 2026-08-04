import { redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { resolveRole } from '$lib/server/roles';
import type { Actions, PageServerLoad } from './$types';

// homepage: public reading list of published newspaper editions, newest
// first - only published editions ever get a baked PDF (see the
// newspaper-edition PATCH endpoint's publish hook), so unpublished ones
// have nothing to read. Shown to everyone, logged in or not.
export const load: PageServerLoad = async (event) => {
	const editions = await db
		.select({
			id: newspaperEdition.id,
			title: newspaperEdition.title,
			cdnUrl: newspaperEdition.cdnUrl
		})
		.from(newspaperEdition)
		.where(eq(newspaperEdition.status, 'published'))
		.orderBy(desc(newspaperEdition.updatedAt));

	const user = event.locals.user;
	if (!user) return { editions, user: null, role: null };

	// The admin plugin adds `role` to the user row at runtime, but the base
	// `User` type from 'better-auth' doesn't declare it.
	const userWithRole = user as typeof user & { role?: string | null };

	return { editions, user, role: await resolveRole(userWithRole) };
};

export const actions: Actions = {
	signInIntra: async () => {
		const { url } = await auth.api.signInWithOAuth2({
			body: {
				providerId: 'intra',
				callbackURL: '/'
			}
		});

		return redirect(302, url);
	},
	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		return redirect(302, '/');
	}
};
