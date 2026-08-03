// TEMPORARY until the real auth branch merges - grep for TEMP_CURRENT_USER_ID
// / getCurrentUserId and swap call sites to `locals.user.id`, then delete
// this file (and src/routes/+layout.server.ts's use of it).

// userId columns are `text`, not integer - the shim id MUST be a string.
export const TEMP_CURRENT_USER_ID = '1';

// takes `locals` so every call site already has the right shape for the
// eventual real-auth swap - only this function's body changes later.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCurrentUserId(locals: App.Locals): string {
	return TEMP_CURRENT_USER_ID;
}
