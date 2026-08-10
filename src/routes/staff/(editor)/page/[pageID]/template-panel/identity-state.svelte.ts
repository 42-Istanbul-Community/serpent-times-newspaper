export type TemplateCategoryOption = { value: string; label: string };

export const categoryOptions: TemplateCategoryOption[] = [
	{ value: 'cover', label: 'Cover' },
	{ value: 'page', label: 'Page' },
	{ value: 'index', label: 'Index' },
	{ value: 'citation', label: 'Citation' }
];

// the pageTemplate's own title/type/description - hydrated from and
// autosaved back to the real row by template-sync.svelte.ts.
class IdentityState {
	title = $state('');
	description = $state('');
	category = $state('page');
}

export const identityState = new IdentityState();
