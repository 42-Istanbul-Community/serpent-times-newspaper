// Shared writer-editor state - a single "paper" (an article row whose
// `pages` array has one entry per page, each pointing at a pageTemplate and
// holding the writer's own filled-in slot values). Mirrors
// routes/(editor)/page/[pageID]/canvas-state.svelte.ts's shape: a plain
// module singleton using Svelte 5 $state as a lightweight store.

import { SvelteMap } from 'svelte/reactivity';
import type { AuthorMap } from '$lib/authors';
import type { ArticlePage } from '$lib/server/db/schema/editor/article';
import type { pageTemplate as pageTemplateTable } from '$lib/server/db/schema';

export type TemplateRow = typeof pageTemplateTable.$inferSelect;

const DRAG_THRESHOLD_PX = 4;

class PaperState {
	articleId = $state<number | null>(null);
	title = $state('');
	pages = $state<ArticlePage[]>([]);
	// referenced templates (design data, for rendering) and the templates a
	// writer is allowed to pick from when adding a new page.
	templates = $state<TemplateRow[]>([]);
	pickableTemplates = $state<TemplateRow[]>([]);
	// display-only lookup for the picker's designer line, keyed by userId.
	authors = $state<AuthorMap>({});

	activePageId = $state<string | null>(null);

	// every page's live rendered DOM node, keyed by page id (all pages render
	// simultaneously, stacked - see +page.svelte) and kept in sync by
	// page-renderer.svelte. Lets paper-sync.svelte.ts's autosave-triggered
	// thumbnail capture get at a specific page's node without prop-drilling.
	pageRendererEls = new SvelteMap<string, HTMLElement>();

	// double-click to rename a page's own label, in the pages panel.
	editingId = $state<string | null>(null);
	editingValue = $state('');

	// drag to reorder, in the pages panel - same armed/threshold idiom as
	// canvasStore's layers-panel drag, just flat (no grouping/parentId).
	draggedId = $state<string | null>(null);
	dropIndex = $state<number | null>(null);
	#armedId: string | null = null;
	#armedY = 0;
	#rowEls = new SvelteMap<string, HTMLElement>();

	selectPage(id: string) {
		this.activePageId = id;
	}

	// appends (reading order, not canvas z-order - unlike canvasStore.add()'s
	// unshift) and selects the new page.
	addPage(template: TemplateRow) {
		const id = crypto.randomUUID();
		this.pages.push({ id, label: template.title, pageTemplateId: template.id, slotValues: {} });
		this.activePageId = id;

		// `templates` only ever contains what the *loaded* pages referenced at
		// hydrate time - a freshly picked template (from pickableTemplates)
		// isn't in there yet, so the new page couldn't find its own template
		// to render against. Register it now.
		if (!this.templates.some((t) => t.id === template.id)) {
			this.templates.push(template);
		}
	}

	removePage(id: string) {
		this.pages = this.pages.filter((p) => p.id !== id);
		if (this.activePageId === id) this.activePageId = this.pages[0]?.id ?? null;
	}

	startRename(page: ArticlePage) {
		this.editingId = page.id;
		this.editingValue = page.label;
	}

	commitRename() {
		if (this.editingId === null) return;
		const trimmed = this.editingValue.trim();
		if (trimmed) {
			const page = this.pages.find((p) => p.id === this.editingId);
			if (page) page.label = trimmed;
		}
		this.editingId = null;
	}

	cancelRename() {
		this.editingId = null;
	}

	updateSlot(pageId: string, elementId: string, value: string) {
		const page = this.pages.find((p) => p.id === pageId);
		if (page) page.slotValues[elementId] = value; // direct mutation, deeply reactive
	}

	// bound (arrow) because it's used directly as a `use:` action.
	trackRow = (node: HTMLElement, id: string) => {
		this.#rowEls.set(id, node);
		return {
			update: (newId: string) => {
				this.#rowEls.delete(id);
				id = newId;
				this.#rowEls.set(id, node);
			},
			destroy: () => {
				this.#rowEls.delete(id);
			}
		};
	};

	armDragRow(id: string, event: PointerEvent) {
		if (this.editingId !== null) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		this.#armedId = id;
		this.#armedY = event.clientY;
	}

	dragRow(event: PointerEvent) {
		if (this.draggedId === null) {
			if (this.#armedId === null || Math.abs(event.clientY - this.#armedY) < DRAG_THRESHOLD_PX) {
				return;
			}
			this.draggedId = this.#armedId;
			this.selectPage(this.#armedId);
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}

		const candidates = this.pages
			.map((p, index) => ({ id: p.id, index }))
			.filter((row) => row.id !== this.draggedId);

		for (const row of candidates) {
			const rect = this.#rowEls.get(row.id)?.getBoundingClientRect();
			if (!rect || event.clientY < rect.top || event.clientY > rect.bottom) continue;
			const relY = (event.clientY - rect.top) / rect.height;
			this.dropIndex = relY < 0.5 ? row.index : row.index + 1;
			return;
		}

		// cursor is in a gap between rows: fall back to nearest insertion point.
		for (const row of candidates) {
			const rect = this.#rowEls.get(row.id)?.getBoundingClientRect();
			if (!rect) continue;
			if (event.clientY < rect.top + rect.height / 2) {
				this.dropIndex = row.index;
				return;
			}
		}
		this.dropIndex = this.pages.length;
	}

	// returns true iff an actual reorder happened, so the caller only
	// autosaves on real moves, not a plain click.
	endDragRow(): boolean {
		let moved = false;
		if (this.draggedId !== null && this.dropIndex !== null) {
			const fromIndex = this.pages.findIndex((p) => p.id === this.draggedId);
			if (fromIndex !== -1) {
				let index = this.dropIndex;
				if (fromIndex < index) index -= 1;
				if (index !== fromIndex) {
					const [removed] = this.pages.splice(fromIndex, 1);
					this.pages.splice(index, 0, removed);
					moved = true;
				}
			}
		}
		this.#armedId = null;
		this.draggedId = null;
		this.dropIndex = null;
		return moved;
	}
}

export const paperState = new PaperState();
