// Shared between +page.svelte (the homepage PDF reader) and +layout.svelte's
// mobile menu - the edition switcher is surfaced there too, so mobile users
// can jump between newspapers straight from the menu they're already using
// for site navigation, without scrolling the page. Only ever populated
// client-side (see +page.svelte's effect) - safe as a module-level singleton
// for the same reason the editor routes' own *.svelte.ts state singletons
// are (e.g. edition-state.svelte.ts): mutation only happens inside an
// $effect, which never runs during SSR, so there's no cross-request leakage.
export type EditionSummary = { id: number; title: string; cdnUrl: string | null };

class HomepageNav {
	editions = $state<EditionSummary[]>([]);
	selectedId = $state<number | null>(null);
}

export const homepageNav = new HomepageNav();
