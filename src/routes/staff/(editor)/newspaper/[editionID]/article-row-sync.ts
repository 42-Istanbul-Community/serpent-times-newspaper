// Debounced autosave for cover/index article rows' `pages` - a *different*
// row from the edition row edition-sync.svelte.ts tracks. The writer only
// ever had one row to autosave; here, filling in a cover or index page edits
// slotValues on its own separate `article` row, so each tracked articleId
// gets its own independent debounce+snapshot-compare, keyed in a Map. Body
// papers and citation articles are never mutated from this editor, so they
// never get an entry here.
import type { ArticlePage } from '$lib/server/db/schema/editor/article';

const SAVE_DEBOUNCE_MS = 1000;

const tracked = new Map<
	number,
	{ lastSnapshot: string; timer: ReturnType<typeof setTimeout> | undefined }
>();

function entryFor(articleId: number) {
	let entry = tracked.get(articleId);
	if (!entry) {
		entry = { lastSnapshot: '', timer: undefined };
		tracked.set(articleId, entry);
	}
	return entry;
}

// called once per hydrated cover/index article row, with its just-loaded
// pages - seeds the snapshot so the post-hydrate effect tick isn't mistaken
// for a real edit.
export function seed(articleId: number, pages: ArticlePage[]) {
	entryFor(articleId).lastSnapshot = JSON.stringify(pages);
}

export function track(articleId: number, pages: ArticlePage[]) {
	const entry = entryFor(articleId);
	const snapshot = JSON.stringify(pages);
	if (snapshot === entry.lastSnapshot) return;
	clearTimeout(entry.timer);
	entry.timer = setTimeout(() => save(articleId, pages, snapshot), SAVE_DEBOUNCE_MS);
}

async function save(articleId: number, pages: ArticlePage[], snapshot: string) {
	const res = await fetch(`/api/article/${articleId}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ pages })
	});
	// only mark saved on success - a failed request leaves the snapshot
	// stale, so the next edit (or effect tick) retries it.
	if (res.ok) entryFor(articleId).lastSnapshot = snapshot;
}
