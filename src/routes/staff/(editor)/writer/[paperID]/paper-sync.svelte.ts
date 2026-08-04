// Hydrates paperState from a loaded article row and debounce-autosaves it
// back. Structurally identical to
// routes/(editor)/page/[pageID]/template-sync.svelte.ts's single-row
// hydrate+debounce+PATCH pattern - add/remove/reorder/rename/slot-fill are
// all just mutations to paperState.pages, caught by the same one autosave
// effect (see +page.svelte), no special-cased "immediate" write path.

import { paperState, type TemplateRow } from './paper-state.svelte';
import { captureAndUploadThumbnail } from './capture-thumbnail';
import type { ArticlePage, article as articleTable } from '$lib/server/db/schema/editor/article';

type ArticleRow = typeof articleTable.$inferSelect;

// longer than canvas-history.ts's 400ms undo debounce, so a single user
// gesture collapses to at most one network write.
const SAVE_DEBOUNCE_MS = 1000;

function snapshotOf(id: number, title: string, pages: ArticlePage[]) {
	return JSON.stringify({ id, title, pages });
}

class PaperSync {
	#hydratedId: number | null = null;
	#lastSavedSnapshot = '';
	#timer: ReturnType<typeof setTimeout> | undefined;
	#capturingThumbnail = false;
	saving = $state(false);
	// mirrors the DB row's status - read by the topbar's Publish button.
	status = $state<ArticleRow['status']>('draft');

	hydrate(row: ArticleRow, templates: TemplateRow[], pickableTemplates: TemplateRow[]) {
		// design data, not the writer's own work - refresh it on every load,
		// including re-runs for a paper that's already hydrated, so a template
		// approved while this page was open shows up without a hard reload.
		// Merged, never replaced, so a just-picked template that hasn't been
		// autosaved yet (addPage registers it client-side) isn't dropped.
		const known = new Set(paperState.templates.map((t) => t.id));
		paperState.templates.push(...templates.filter((t) => !known.has(t.id)));
		paperState.pickableTemplates = pickableTemplates;

		if (this.#hydratedId === row.id) return;
		clearTimeout(this.#timer);
		const pages = row.pages as ArticlePage[];

		paperState.articleId = row.id;
		paperState.title = row.title;
		paperState.pages = pages;
		paperState.templates = templates;
		paperState.activePageId = pages[0]?.id ?? null;

		this.#hydratedId = row.id;
		this.status = row.status;
		this.#lastSavedSnapshot = snapshotOf(row.id, row.title, pages);
	}

	// called from an $effect that deep-reads paperState.title + .pages on
	// every change.
	track(id: number, title: string, pages: ArticlePage[]) {
		if (id !== this.#hydratedId) return; // load hasn't hydrated this id yet - never save
		const snapshot = snapshotOf(id, title, pages);
		if (snapshot === this.#lastSavedSnapshot) return; // also covers the post-hydrate no-op tick
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.#save(id, title, pages, snapshot), SAVE_DEBOUNCE_MS);
	}

	async #save(id: number, title: string, pages: ArticlePage[], snapshot: string) {
		this.saving = true;
		try {
			const res = await fetch(`/api/article/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ title, pages })
			});
			// only mark saved on success - a failed request leaves the snapshot
			// stale, so the next edit (or effect tick) retries it.
			if (res.ok) {
				this.#lastSavedSnapshot = snapshot;
				// fire-and-forget: the thumbnail is a best-effort side effect of a
				// successful save, not part of what "Saving..." represents.
				this.#refreshThumbnail(id);
			}
		} finally {
			this.saving = false;
		}
	}

	async #refreshThumbnail(id: number) {
		// the paper's thumbnail is always its first page - a stable "cover
		// shot" regardless of which page the writer is currently editing (all
		// pages render simultaneously now, there's no single "active" one).
		const firstPageId = paperState.pages[0]?.id;
		const el = firstPageId ? paperState.pageRendererEls.get(firstPageId) : undefined;
		if (this.#capturingThumbnail || !el) return;
		this.#capturingThumbnail = true;
		try {
			const cdnUrl = await captureAndUploadThumbnail(id, el);
			if (!cdnUrl) return;
			await fetch(`/api/article/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ cdnUrl })
			});
		} finally {
			this.#capturingThumbnail = false;
		}
	}

	// the topbar's "Publish" button - the only way a paper leaves 'draft'.
	async publish(id: number) {
		this.saving = true;
		try {
			const res = await fetch(`/api/article/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status: 'published' })
			});
			if (res.ok) this.status = 'published';
		} finally {
			this.saving = false;
		}
	}
}

export const paperSync = new PaperSync();
