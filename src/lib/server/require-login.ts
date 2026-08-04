import { error } from '@sveltejs/kit';

// Returns the id of the currently authenticated user, or throws a 401 if the
// request has no session. `locals.user` is populated by the better-auth hook
// in src/hooks.server.ts. Use this in every server load / API handler that
// acts on behalf of "the current user" so an unauthenticated request can
// never fall through to a real userId.
export function requireUserId(locals: App.Locals): string {
	if (!locals.user) throw error(401, 'Not authenticated');
	return locals.user.id;
}
