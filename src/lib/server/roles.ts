import { env } from '$env/dynamic/private';

const devIds = new Set(
	(env.INTRA_DEV_IDS ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
);

const STAFF_ROLES = ['admin', 'editor', 'writer', 'designer'] as const;

export type Role = 'dev' | (typeof STAFF_ROLES)[number] | 'user';

export function getRole(user: { role?: string | null }, intraAccountId?: string): Role {
	if (intraAccountId && devIds.has(intraAccountId)) return 'dev';
	if (user.role && (STAFF_ROLES as readonly string[]).includes(user.role)) {
		return user.role as (typeof STAFF_ROLES)[number];
	}
	return 'user';
}
