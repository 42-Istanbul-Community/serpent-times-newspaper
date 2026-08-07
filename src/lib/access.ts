/** Which role owns which editor section. Shared by the nav and the route guards. */
export const SECTION_ROLE = {
	page: 'designer',
	newspaper: 'editor',
	writer: 'writer'
} as const;

export type Section = keyof typeof SECTION_ROLE;

export function canAccessSection(role: string | null | undefined, section: Section) {
	return role === 'dev' || role === 'admin' || role === SECTION_ROLE[section];
}

/** For endpoints more than one section legitimately writes to. */
export function canAccessAnySection(role: string | null | undefined, sections: readonly Section[]) {
	return sections.some((section) => canAccessSection(role, section));
}
