import { env } from '$env/dynamic/private';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { account, user as userTable } from '$lib/server/db/schema';

const devIds = new Set(
	(env.INTRA_DEV_IDS ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
);

const STAFF_ROLES = ['admin', 'editor', 'writer', 'designer'] as const;

export type Role = 'dev' | (typeof STAFF_ROLES)[number] | 'user';

/** DB-assignable roles: everything except 'dev', which only comes from INTRA_DEV_IDS. */
export const ASSIGNABLE_ROLES = ['user', ...STAFF_ROLES] as const;

// A stored role wins over the dev list, so devs can drop themselves to any
// role to test that viewpoint (scripts/set-user-role.sh). Clearing the column
// puts them back to 'dev'.
export function getRole(user: { role?: string | null }, intraAccountId?: string): Role {
	if (user.role && (ASSIGNABLE_ROLES as readonly string[]).includes(user.role)) {
		return user.role as (typeof ASSIGNABLE_ROLES)[number];
	}
	if (intraAccountId && devIds.has(intraAccountId)) return 'dev';
	return 'user';
}

/**
 * Intra logins of everyone holding the 'dev' role, i.e. whose linked Intra
 * account id is listed in INTRA_DEV_IDS. Used to name who to ping on Slack
 * when something auth-related breaks (see auth-error-toast.svelte). Devs who
 * have never signed in yet have no row, so they simply don't show up.
 */
export async function getDevLogins(): Promise<string[]> {
	if (devIds.size === 0) return [];

	const rows = await db
		.select({ login: userTable.login })
		.from(account)
		.innerJoin(userTable, eq(userTable.id, account.userId))
		.where(and(eq(account.providerId, 'intra'), inArray(account.accountId, [...devIds])));

	return rows.map((row) => row.login).filter((login): login is string => Boolean(login));
}

/** Looks up the user's linked Intra account and resolves their effective role. */
export async function resolveRole(user: { id: string; role?: string | null }): Promise<Role> {
	const [intraAccount] = await db
		.select({ accountId: account.accountId })
		.from(account)
		.where(and(eq(account.userId, user.id), eq(account.providerId, 'intra')));

	return getRole(user, intraAccount?.accountId);
}
