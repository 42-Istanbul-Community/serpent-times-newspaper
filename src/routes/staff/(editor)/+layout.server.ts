import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// The whole editor suite (page designer, writer, newspaper editor) acts on
// behalf of the logged-in user, so it's gated behind a session. Unauthenticated
// visitors are bounced to the homepage, where they can read published editions
// and log in with Intra. API routes under /api guard themselves via
// requireUserId (see src/lib/server/require-login.ts); this only covers pages.
export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) throw redirect(302, '/');
	return { user: locals.user };
};
