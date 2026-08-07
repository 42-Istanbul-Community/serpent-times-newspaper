/**
 * Whoever wrote a paper or designed a template, as shown under its title in
 * the pickers (see author-badge.svelte). A display lookup keyed by userId -
 * never the user directory, only the ids a given picker is offering.
 */
export type Author = {
	id: string;
	name: string;
	login: string | null;
	image: string | null;
};

export type AuthorMap = Record<string, Author>;
