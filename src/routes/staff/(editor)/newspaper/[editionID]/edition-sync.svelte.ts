// Hydrates editionState from a loaded newspaperEdition row (+ its referenced
// article rows/templates) and debounce-autosaves the edition row back.
// Structurally identical to ../../writer/[paperID]/paper-sync.svelte.ts's
// single-row hydrate+debounce+PATCH pattern - reorder/add/remove of any of
// the four role arrays are all just mutations to editionState's own fields,
// caught by the same one autosave effect (see +page.svelte). Per-article
// slotValues edits (cover/index) are a *separate* concern, handled by
// article-row-sync.ts against a different row entirely.

import { editionState, type ArticleRow, type Role, type TemplateRow } from './edition-state.svelte';
import { captureAndUploadThumbnail } from './capture-thumbnail';
import type { newspaperEdition as editionTable } from '$lib/server/db/schema';
import type { ArticlePage } from '$lib/server/db/schema/editor/article';

type EditionRow = typeof editionTable.$inferSelect;

const SAVE_DEBOUNCE_MS = 1000;

function snapshotOf(
	id: number,
	title: string,
	coverArticleId: number | null,
	indexArticleIds: number[],
	citationArticleIds: number[],
	articleIds: number[]
) {
	return JSON.stringify({
		id,
		title,
		coverArticleId,
		indexArticleIds,
		citationArticleIds,
		articleIds
	});
}

class EditionSync {
	#hydratedId: number | null = null;
	#lastSavedSnapshot = '';
	#timer: ReturnType<typeof setTimeout> | undefined;
	#capturingThumbnail = false;
	saving = $state(false);
	// mirrors the DB row's status - read by the topbar's Publish button.
	status = $state<EditionRow['status']>('draft');

	hydrate(
		row: EditionRow,
		articles: ArticleRow[],
		templates: TemplateRow[],
		pickableCover: TemplateRow[],
		pickableIndex: TemplateRow[],
		pickableCitation: TemplateRow[],
		availablePapers: { id: number; title: string; cdnUrl: string | null }[]
	) {
		// see paper-sync's hydrate: the pickable lists are design data, so they
		// refresh on every load, not just the first one for this edition.
		editionState.pickableCover = pickableCover;
		editionState.pickableIndex = pickableIndex;
		editionState.pickableCitation = pickableCitation;
		editionState.availablePapers = availablePapers;

		if (this.#hydratedId === row.id) return;
		clearTimeout(this.#timer);

		editionState.editionId = row.id;
		editionState.title = row.title;
		editionState.editorUserId = row.userId;
		editionState.coverArticleId = row.coverArticleId;
		editionState.indexArticleIds = row.indexArticleIds;
		editionState.citationArticleIds = row.citationArticleIds;
		editionState.articleIds = row.articleIds;
		editionState.articles = Object.fromEntries(articles.map((a) => [a.id, a]));
		editionState.templates = templates;
		editionState.pickableCover = pickableCover;
		editionState.pickableIndex = pickableIndex;
		editionState.pickableCitation = pickableCitation;
		editionState.availablePapers = availablePapers;

		this.#hydratedId = row.id;
		this.status = row.status;
		this.#lastSavedSnapshot = snapshotOf(
			row.id,
			row.title,
			row.coverArticleId,
			row.indexArticleIds,
			row.citationArticleIds,
			row.articleIds
		);
	}

	// called from an $effect that deep-reads editionState's own fields
	// (not editionState.articles - that's article-row-sync.ts's job) on
	// every change.
	track(
		id: number,
		title: string,
		coverArticleId: number | null,
		indexArticleIds: number[],
		citationArticleIds: number[],
		articleIds: number[]
	) {
		if (id !== this.#hydratedId) return; // load hasn't hydrated this id yet - never save
		const snapshot = snapshotOf(
			id,
			title,
			coverArticleId,
			indexArticleIds,
			citationArticleIds,
			articleIds
		);
		if (snapshot === this.#lastSavedSnapshot) return; // also covers the post-hydrate no-op tick
		clearTimeout(this.#timer);
		this.#timer = setTimeout(
			() =>
				this.#save(
					id,
					title,
					coverArticleId,
					indexArticleIds,
					citationArticleIds,
					articleIds,
					snapshot
				),
			SAVE_DEBOUNCE_MS
		);
	}

	async #save(
		id: number,
		title: string,
		coverArticleId: number | null,
		indexArticleIds: number[],
		citationArticleIds: number[],
		articleIds: number[],
		snapshot: string
	) {
		this.saving = true;
		try {
			const res = await fetch(`/api/newspaper-edition/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					title,
					coverArticleId,
					indexArticleIds,
					citationArticleIds,
					articleIds
				})
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
		// the edition's thumbnail is always its cover - the one page with a
		// stable, unambiguous "this is the shot" answer (unlike the writer,
		// which has to fall back to "first page" for lack of a real cover).
		const coverArticleId = editionState.coverArticleId;
		const coverPageId =
			coverArticleId !== null ? editionState.articles[coverArticleId]?.pages[0]?.id : undefined;
		const el = coverPageId ? editionState.pageRendererEls.get(coverPageId) : undefined;
		if (this.#capturingThumbnail || !el) return;
		this.#capturingThumbnail = true;
		try {
			const cdnUrl = await captureAndUploadThumbnail(id, el);
			if (!cdnUrl) return;
			await fetch(`/api/newspaper-edition/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ cdnUrl })
			});
		} finally {
			this.#capturingThumbnail = false;
		}
	}

	// the topbar's Publish/Unpublish buttons - the only way an edition changes
	// status. Unpublishing pulls it straight back off the homepage (which
	// only ever lists published rows) without touching anything it holds.
	async setStatus(id: number, status: EditionRow['status']) {
		this.saving = true;
		try {
			const res = await fetch(`/api/newspaper-edition/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status })
			});
			if (res.ok) this.status = status;
		} finally {
			this.saving = false;
		}
	}

	// creates a new single-page cover/index/citation article for a freshly
	// picked template. Returns null on failure (caller just no-ops - same
	// best-effort discipline as everything else in this file).
	async createArticle(
		category: Extract<Role, 'cover' | 'index' | 'citation'>,
		pageTemplateId: number
	) {
		const res = await fetch(`/api/newspaper-edition/${editionState.editionId}/article`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ category, pageTemplateId })
		});
		if (!res.ok) return null;
		return (await res.json()) as ArticleRow;
	}

	// fire-and-forget - the local state mutation (removing the id from
	// editionState) already happened by the time this is called, so there's
	// nothing useful to do with a failure here beyond leaving an orphaned
	// row, same trade-off the rest of this app's best-effort cleanup makes.
	deleteArticle(articleId: number) {
		void fetch(`/api/article/${articleId}`, { method: 'DELETE' });
	}
}

export const editionSync = new EditionSync();

// --- Orchestration helpers -------------------------------------------------
// Each of these pairs a network call with the resulting local mutation, so
// edition-panel.svelte never has to sequence the two itself. Structural
// array/id mutations here are automatically picked up by the same one
// autosave effect that tracks editionState's own fields (see +page.svelte) -
// no separate "immediate save" path, same as everywhere else this session.

function registerTemplate(template: TemplateRow) {
	// a freshly picked template (from pickableCover/Index/Citation) isn't in
	// editionState.templates yet - the same bug class the writer hit
	// ("template seçince hiçbir şey olmuyor") when a new page's template
	// lookup came up empty. Register it now.
	if (!editionState.templates.some((t) => t.id === template.id)) {
		editionState.templates.push(template);
	}
}

async function removeArticleRow(id: number) {
	const articles = { ...editionState.articles };
	delete articles[id];
	editionState.articles = articles;
	editionSync.deleteArticle(id);
}

export async function pickTemplate(role: 'cover' | 'index' | 'citation', template: TemplateRow) {
	const row = await editionSync.createArticle(role, template.id);
	if (!row) return;
	registerTemplate(template);
	editionState.articles = { ...editionState.articles, [row.id]: row };

	if (role === 'cover') {
		const oldId = editionState.coverArticleId;
		editionState.coverArticleId = row.id;
		if (oldId !== null) await removeArticleRow(oldId);
	} else if (role === 'index') {
		editionState.indexArticleIds = [...editionState.indexArticleIds, row.id];
	} else {
		editionState.citationArticleIds = [...editionState.citationArticleIds, row.id];
	}
}

export async function removeCover() {
	const oldId = editionState.coverArticleId;
	if (oldId === null) return;
	editionState.coverArticleId = null;
	await removeArticleRow(oldId);
}

export async function removeIndex(id: number) {
	editionState.indexArticleIds = editionState.indexArticleIds.filter((x) => x !== id);
	await removeArticleRow(id);
}

export async function removeCitation(id: number) {
	editionState.citationArticleIds = editionState.citationArticleIds.filter((x) => x !== id);
	await removeArticleRow(id);
}

// async (unlike removePaper) because assembledPages needs the full article
// row (with its pages) to render this paper at all - editionState.articles
// only holds rows for articles referenced when the editor first loaded, so a
// freshly picked paper's row has to be fetched and registered before linking
// its id, or it silently renders nothing until the next full page reload.
export async function addPaper(id: number) {
	if (editionState.articleIds.includes(id)) return;
	const res = await fetch(`/api/article/${id}`);
	if (!res.ok) return;
	const row = (await res.json()) as ArticleRow;

	// each of this paper's pages can reference a DIFFERENT template (see the
	// writer's pages panel) - a multi-page paper whose 2nd/3rd page uses a
	// template no other already-loaded article referenced yet would silently
	// fail +page.svelte's `{#if template}` render guard otherwise, same bug
	// class registerTemplate() already exists to prevent for cover/index/
	// citation, just missing here.
	const missingTemplateIds: number[] = [];
	for (const p of row.pages as ArticlePage[]) {
		if (
			!editionState.templates.some((t) => t.id === p.pageTemplateId) &&
			!missingTemplateIds.includes(p.pageTemplateId)
		) {
			missingTemplateIds.push(p.pageTemplateId);
		}
	}
	if (missingTemplateIds.length > 0) {
		const fetched = await Promise.all(
			missingTemplateIds.map((templateId) =>
				fetch(`/api/page-template/${templateId}`).then((r) => (r.ok ? r.json() : null))
			)
		);
		for (const template of fetched) {
			if (template) registerTemplate(template as TemplateRow);
		}
	}

	editionState.articles = { ...editionState.articles, [row.id]: row };
	editionState.articleIds = [...editionState.articleIds, row.id];
}

export function removePaper(id: number) {
	editionState.articleIds = editionState.articleIds.filter((x) => x !== id);
}
