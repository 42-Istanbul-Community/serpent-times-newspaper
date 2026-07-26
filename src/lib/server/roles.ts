import { env } from '$env/dynamic/private';

const devIds = new Set(
	(env.INTRA_DEV_IDS ?? '')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean)
);

export function getRole(
	user: { role?: string | null },
	intraAccountId?: string
): 'dev' | 'admin' | 'user' {
	if (intraAccountId && devIds.has(intraAccountId)) return 'dev';
	if (user.role === 'admin') return 'admin';
	return 'user';
}
