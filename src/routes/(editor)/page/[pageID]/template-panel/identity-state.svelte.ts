export type TemplateCategoryOption = { value: string; label: string };

export const categoryOptions: TemplateCategoryOption[] = [
	{ value: 'cover', label: 'Cover' },
	{ value: 'page', label: 'Page' },
	{ value: 'index', label: 'Index' },
	{ value: 'citation', label: 'Citation' }
];

// the pageTemplate's own title/type/description.
// TODO: bind to the real pageTemplate row once this editor is wired to the db.
class IdentityState {
	title = $state('');
	description = $state('');
	category = $state('page');
}

export const identityState = new IdentityState();
