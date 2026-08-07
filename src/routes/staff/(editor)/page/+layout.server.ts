import { redirect } from '@sveltejs/kit';
import { canAccessSection } from '$lib/access';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { role } = await parent();
	if (!canAccessSection(role, 'page')) redirect(302, '/');
};
