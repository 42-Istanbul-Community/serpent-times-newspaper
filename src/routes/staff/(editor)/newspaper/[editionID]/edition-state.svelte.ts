// Shared newspaper-editor state - one "edition" assembled from a cover
// article, ordered index/citation articles, and ordered body-paper articles
// (each already-written by a writer, see ../../writer). Mirrors
// ../../writer/[paperID]/paper-state.svelte.ts's shape, generalized to 4
// role arrays and a map of every loaded article row (writer only ever had
// one row to track; here cover/index/papers/citation are separate rows).

import { SvelteMap } from 'svelte/reactivity';
import type { AuthorMap } from '$lib/authors';
import * as assemble from '$lib/edition/assemble';
import type { ArticleRow, AssembledPage, TemplateRow, TocEntry } from '$lib/edition/assemble';

// the render-order rules themselves live in $lib/edition/assemble - the
// reader and the PDF bake assemble editions from the same functions, this
// store just feeds them its live $state.
export type { AssembledPage, ArticleRow, Role, TemplateRow } from '$lib/edition/assemble';

export type PickablePaper = {
	id: number;
	title: string;
	cdnUrl: string | null;
	userId: string;
};

const DRAG_THRESHOLD_PX = 4;

// Reorder-within-itself drag idiom for one of the three orderable arrays
// (index/body-papers/citation) - identical logic to paper-state.svelte.ts's
// trackRow/armDragRow/dragRow/endDragRow, parameterized by which array it
// reorders. A real shared helper (not copy-paste) since it's genuinely
// reused three times here, unlike the writer's single flat list.
class SectionDrag {
	draggedId = $state<number | null>(null);
	dropIndex = $state<number | null>(null);
	#armedId: number | null = null;
	#armedY = 0;
	#rowEls = new SvelteMap<number, HTMLElement>();
	#getArray: () => number[];
	#setArray: (next: number[]) => void;

	constructor(getArray: () => number[], setArray: (next: number[]) => void) {
		this.#getArray = getArray;
		this.#setArray = setArray;
	}

	// bound (arrow) so it can be used directly as a `use:` action.
	trackRow = (node: HTMLElement, id: number) => {
		this.#rowEls.set(id, node);
		return {
			update: (newId: number) => {
				this.#rowEls.delete(id);
				id = newId;
				this.#rowEls.set(id, node);
			},
			destroy: () => {
				this.#rowEls.delete(id);
			}
		};
	};

	armDragRow(id: number, event: PointerEvent) {
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
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}
		if (this.draggedId === null) return;

		const candidates = this.#getArray()
			.map((id, index) => ({ id, index }))
			.filter((row) => row.id !== this.draggedId);

		for (const row of candidates) {
			const rect = this.#rowEls.get(row.id)?.getBoundingClientRect();
			if (!rect || event.clientY < rect.top || event.clientY > rect.bottom) continue;
			const relY = (event.clientY - rect.top) / rect.height;
			this.dropIndex = relY < 0.5 ? row.index : row.index + 1;
			return;
		}

		for (const row of candidates) {
			const rect = this.#rowEls.get(row.id)?.getBoundingClientRect();
			if (!rect) continue;
			if (event.clientY < rect.top + rect.height / 2) {
				this.dropIndex = row.index;
				return;
			}
		}
		this.dropIndex = this.#getArray().length;
	}

	// returns true iff an actual reorder happened, so the caller only
	// autosaves on real moves, not a plain click.
	endDragRow(): boolean {
		let moved = false;
		if (this.draggedId !== null && this.dropIndex !== null) {
			const array = [...this.#getArray()];
			const fromIndex = array.indexOf(this.draggedId);
			if (fromIndex !== -1) {
				let index = this.dropIndex;
				if (fromIndex < index) index -= 1;
				if (index !== fromIndex) {
					const [removed] = array.splice(fromIndex, 1);
					array.splice(index, 0, removed);
					this.#setArray(array);
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

class EditionState {
	editionId = $state<number | null>(null);
	title = $state('');
	// the edition's own owner - whoever is assembling this newspaper. Not
	// the same as a page/article's own userId (the designer/writer of that
	// specific piece) - this is who the `citation` component's 'editor'
	// credit type resolves to. Text (matches the DB column), not a display
	// name - see page-renderer.svelte's userNames lookup.
	editorUserId = $state('');
	coverArticleId = $state<number | null>(null);
	indexArticleIds = $state<number[]>([]);
	citationArticleIds = $state<number[]>([]);
	articleIds = $state<number[]>([]); // body papers, ordered

	// every loaded article row (cover/index/papers/citation), by id - plain
	// $state object (not SvelteMap) so nested slotValues edits stay deeply
	// reactive, same idiom as paperState.pages.
	articles = $state<Record<number, ArticleRow>>({});
	templates = $state<TemplateRow[]>([]); // referenced pageTemplates, for rendering
	pickableCover = $state<TemplateRow[]>([]);
	pickableIndex = $state<TemplateRow[]>([]);
	pickableCitation = $state<TemplateRow[]>([]);
	availablePapers = $state<PickablePaper[]>([]);
	// display-only lookup for the pickers' author line, keyed by userId.
	authors = $state<AuthorMap>({});

	// every page's live rendered DOM node, keyed by page id (uuid, globally
	// unique across every tracked article) - lets the autosave-triggered
	// cover thumbnail capture get at the right node without prop-drilling.
	pageRendererEls = new SvelteMap<string, HTMLElement>();

	indexDrag = new SectionDrag(
		() => this.indexArticleIds,
		(next) => (this.indexArticleIds = next)
	);
	paperDrag = new SectionDrag(
		() => this.articleIds,
		(next) => (this.articleIds = next)
	);
	citationDrag = new SectionDrag(
		() => this.citationArticleIds,
		(next) => (this.citationArticleIds = next)
	);

	get assembledPages(): AssembledPage[] {
		return assemble.assemblePages(
			{
				coverArticleId: this.coverArticleId,
				indexArticleIds: this.indexArticleIds,
				articleIds: this.articleIds,
				citationArticleIds: this.citationArticleIds
			},
			this.articles
		);
	}

	get paperTocEntries(): TocEntry[] {
		return assemble.tocEntries(this.assembledPages, this.articles);
	}

	get designerUserIds(): string[] {
		return assemble.designerUserIds(this.templates);
	}

	get writerUserIds(): string[] {
		return assemble.writerUserIds(this.articleIds, this.articles);
	}

	updateSlot(articleId: number, elementId: string, value: string) {
		const page = this.articles[articleId]?.pages[0]; // cover/index articles are always single-page
		if (page) page.slotValues[elementId] = value; // direct mutation, deeply reactive
	}
}

export const editionState = new EditionState();
