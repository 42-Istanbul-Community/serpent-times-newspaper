// Shared between +page.svelte (the homepage reader) and +layout.svelte's
// mobile menu - the edition switcher is surfaced there too, so mobile users
// can jump between newspapers straight from the menu they're already using
// for site navigation, without scrolling the page. Only ever populated
// client-side (see +page.svelte's effect) - safe as a module-level singleton
// for the same reason the editor routes' own *.svelte.ts state singletons
// are (e.g. edition-state.svelte.ts): mutation only happens inside an
// $effect, which never runs during SSR, so there's no cross-request leakage.
// `coverUrl` is the sharp thumbnail for a signed-in reader, the
// server-blurred one otherwise - the homepage load decides which.
//
// Which edition is being read is NOT kept here - that's `?edition=<id>` in
// the URL, so both switchers are plain links and the choice survives a
// reload.
export type EditionSummary = { id: number; title: string; coverUrl: string | null };

class HomepageNav {
	editions = $state<EditionSummary[]>([]);
}

export const homepageNav = new HomepageNav();
