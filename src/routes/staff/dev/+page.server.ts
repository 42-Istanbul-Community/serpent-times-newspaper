import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user as userTable, account } from '$lib/server/db/schema';
import { ASSIGNABLE_ROLES, getRole, resolveRole } from '$lib/server/roles';

async function requireDev(locals: App.Locals) {
	const user = locals.user;
	if (!user) throw error(403, 'Forbidden');

	const userWithRole = user as typeof user & { role?: string | null };
	const role = await resolveRole(userWithRole);
	if (role !== 'dev') throw error(403, 'Forbidden');

	return user;
}

export const load: PageServerLoad = async (event) => {
	await requireDev(event.locals);

	const rows = await db
		.select({
			id: userTable.id,
			name: userTable.name,
			login: userTable.login,
			image: userTable.image,
			createdAt: userTable.createdAt,
			dbRole: userTable.role,
			intraAccountId: account.accountId
		})
		.from(userTable)
		.leftJoin(account, and(eq(account.userId, userTable.id), eq(account.providerId, 'intra')))
		.orderBy(userTable.createdAt);

	const users = rows.map((row) => ({
		id: row.id,
		name: row.name,
		login: row.login,
		image: row.image,
		createdAt: row.createdAt,
		dbRole: row.dbRole,
		role: getRole({ role: row.dbRole }, row.intraAccountId ?? undefined)
	}));

	return { users, assignableRoles: ASSIGNABLE_ROLES };
};

export const actions: Actions = {
	updateRole: async (event) => {
		await requireDev(event.locals);

		const form = await event.request.formData();
		const targetUserId = form.get('userId');
		const newRole = form.get('role');

		if (typeof targetUserId !== 'string' || !targetUserId) {
			return fail(400, { message: 'Missing user' });
		}
		if (typeof newRole !== 'string' || !(ASSIGNABLE_ROLES as readonly string[]).includes(newRole)) {
			return fail(400, { message: 'Invalid role' });
		}

		await db
			.update(userTable)
			.set({ role: newRole === 'user' ? null : newRole })
			.where(eq(userTable.id, targetUserId));

		return { success: true };
	}
};
