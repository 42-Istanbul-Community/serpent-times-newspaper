import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { resolveRole } from '$lib/server/roles';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) return { user: null, role: null };

	// The admin plugin adds `role` to the user row at runtime, but the base
	// `User` type from 'better-auth' doesn't declare it.
	const userWithRole = user as typeof user & { role?: string | null };

	return { user, role: await resolveRole(userWithRole) };
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
