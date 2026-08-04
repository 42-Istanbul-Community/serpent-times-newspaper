import { error } from '@sveltejs/kit';
import { canAccessAnySection, type Section } from '$lib/access';
import { resolveRole } from '$lib/server/roles';

// Returns the id of the currently authenticated user, or throws a 401 if the
// request has no session. `locals.user` is populated by the better-auth hook
// in src/hooks.server.ts. Use this in every server load / API handler that
// acts on behalf of "the current user" so an unauthenticated request can
// never fall through to a real userId.
export function requireUserId(locals: App.Locals): string {
	if (!locals.user) throw error(401, 'Not authenticated');
	return locals.user.id;
}

// Same, plus a 403 unless the caller holds a role that owns one of `sections`
// (admin and dev own all of them, see $lib/access). Writes go through this;
// reads stay on requireUserId, since the editors legitimately read each
// other's rows - the newspaper editor pulls in papers and templates it can't
// itself edit.
export async function requireSectionUserId(
	locals: App.Locals,
	...sections: Section[]
): Promise<string> {
	const userId = requireUserId(locals);
	const user = locals.user as NonNullable<App.Locals['user']> & { role?: string | null };

	if (!canAccessAnySection(await resolveRole(user), sections)) throw error(403, 'Forbidden');

	return userId;
}
