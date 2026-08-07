import { redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';
import { getDevLogins } from '$lib/server/roles';
import { loadEditionContent } from '$lib/server/edition-content';
import type { Actions, PageServerLoad } from './$types';

// homepage: public reading list of published newspaper editions, newest
// first, plus the pages of whichever one is selected - `?edition=<id>`, or
// the newest when that's absent/unknown, so every edition has its own
// shareable URL. Shown to everyone, logged in or not.
export const load: PageServerLoad = async (event) => {
	const rows = await db
		.select()
		.from(newspaperEdition)
		.where(eq(newspaperEdition.status, 'published'))
		.orderBy(desc(newspaperEdition.updatedAt));

	// signed out, every cover here is swapped for the server-blurred one, so
	// the sharp cover never reaches the browser. A null cdnUrl means no cover
	// exists to blur either.
	const signedIn = Boolean(event.locals.user);
	const editions = rows.map((edition) => ({
		id: edition.id,
		title: edition.title,
		coverUrl: edition.cdnUrl
			? signedIn
				? edition.cdnUrl
				: `/api/newspaper-edition/${edition.id}/preview`
			: null
	}));

	const requestedId = Number(event.url.searchParams.get('edition'));
	const selected = rows.find((edition) => edition.id === requestedId) ?? rows[0] ?? null;

	// the pages ARE the newspaper, so they're only ever assembled for a
	// signed-in reader - signed out, the page falls back to the blurred cover.
	const content = selected && signedIn ? await loadEditionContent(selected) : null;

	// failed auth flows are redirected here with ?error=<code> (see
	// onAPIError.errorURL in $lib/server/auth.ts). Only then do we pay for the
	// dev lookup that fills in the toast's "who to ping" line.
	const devLogins = event.url.searchParams.has('error') ? await getDevLogins() : [];

	// `user` and `role` come from the layout load, which every page inherits.
	return { editions, selectedId: selected?.id ?? null, content, devLogins };
};

export const actions: Actions = {
	signInIntra: async () => {
		const { url } = await auth.api.signInWithOAuth2({
			body: {
				providerId: 'intra',
				callbackURL: '/',
				// a failed callback (bad secret, denied consent, ...) comes back
				// here with ?error=<code> instead of better-auth's own error page,
				// so the layout can surface it as a toast.
				errorCallbackURL: '/'
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
