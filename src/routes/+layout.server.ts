import { getCurrentUserId } from '$lib/server/current-user';
import userNamesList from '$lib/data/user-names.json';
import type { LayoutServerLoad } from './$types';

// TEMPORARY shim shape - narrower than better-auth's real `User` (no
// email/name/emailVerified/etc.), since those fields don't exist for a
// hardcoded id. Don't widen this to pretend it's a real session.
//
// userNamesList shape matches a real `select id, name from user` result
// (an array of rows) so swapping this JSON import for that query later is a
// one-line change. Consumers (e.g. page-renderer.svelte's citation credit
// lookup) just want `name by id`, so build that lookup once here.
const userNames = Object.fromEntries(userNamesList.map((u) => [u.id, u.name]));

export const load: LayoutServerLoad = ({ locals }) => {
	return { user: { id: getCurrentUserId(locals) }, userNames };
};
