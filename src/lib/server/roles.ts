import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { account } from '$lib/server/db/schema';

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

export function getRole(user: { role?: string | null }, intraAccountId?: string): Role {
	if (intraAccountId && devIds.has(intraAccountId)) return 'dev';
	if (user.role && (STAFF_ROLES as readonly string[]).includes(user.role)) {
		return user.role as (typeof STAFF_ROLES)[number];
	}
	return 'user';
}

/** Looks up the user's linked Intra account and resolves their effective role. */
export async function resolveRole(user: { id: string; role?: string | null }): Promise<Role> {
	const [intraAccount] = await db
		.select({ accountId: account.accountId })
		.from(account)
		.where(and(eq(account.userId, user.id), eq(account.providerId, 'intra')));

	return getRole(user, intraAccount?.accountId);
}
