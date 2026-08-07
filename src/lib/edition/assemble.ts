// How an edition's rows turn into an ordered list of renderable pages.
// Extracted from the newspaper editor's own edition-state store so the
// reader and the PDF bake assemble an edition exactly the way the editor
// previews it - the editor keeps the $state/drag/autosave concerns, these
// stay pure functions over plain rows.

import type { ArticlePage, article as articleTable } from '$lib/server/db/schema/editor/article';
import type { pageTemplate as pageTemplateTable } from '$lib/server/db/schema';

export type TemplateRow = typeof pageTemplateTable.$inferSelect;
export type ArticleRow = typeof articleTable.$inferSelect;
export type Role = 'cover' | 'index' | 'body' | 'citation';

export type AssembledPage = {
	role: Role;
	articleId: number;
	page: ArticlePage;
	pageNumber: number;
};

/** The four ordered id lists that make up an edition, in render order. */
export type EditionOrder = {
	coverArticleId: number | null;
	indexArticleIds: number[];
	articleIds: number[];
	citationArticleIds: number[];
};

/** Who a `citation` component's credit types resolve to for one edition. */
export type Credits = {
	designerUserIds: string[];
	writerUserIds: string[];
	editorUserId: string;
};

export type TocEntry = { articleId: number; title: string; page: number };

export function articlesById(rows: ArticleRow[]): Record<number, ArticleRow> {
	return Object.fromEntries(rows.map((row) => [row.id, row]));
}

// the whole edition, flattened into render order: cover -> index -> body
// papers -> citation, each contributing every page of its article
// (cover/index/citation articles always have exactly one). pageNumber is
// just the 1-based position in this list - the single source of truth
// `page-number` components substitute at render time.
export function assemblePages(
	order: EditionOrder,
	articles: Record<number, ArticleRow>
): AssembledPage[] {
	const out: { role: Role; articleId: number; page: ArticlePage }[] = [];
	const pushAll = (articleId: number, role: Role) => {
		const row = articles[articleId];
		if (row) for (const page of row.pages as ArticlePage[]) out.push({ role, articleId, page });
	};

	if (order.coverArticleId !== null) pushAll(order.coverArticleId, 'cover');
	for (const id of order.indexArticleIds) pushAll(id, 'index');
	for (const id of order.articleIds) pushAll(id, 'body');
	for (const id of order.citationArticleIds) pushAll(id, 'citation');

	return out.map((entry, i) => ({ ...entry, pageNumber: i + 1 }));
}

// one entry per body paper (not per page - a multi-page paper still gets
// just one line, at the page number its FIRST page landed on), in articleIds
// order. This is what an `index`-type component's content gets built from
// (see page-view.svelte's displayContent) - the designer places one such
// component on an index-category template and it "pours out" every paper's
// title + starting page number, rather than needing one designer-placed
// element per paper (which would break the moment the paper count changed).
export function tocEntries(
	pages: AssembledPage[],
	articles: Record<number, ArticleRow>
): TocEntry[] {
	const entries: TocEntry[] = [];
	for (const entry of pages) {
		if (entry.role !== 'body' || entries.some((e) => e.articleId === entry.articleId)) continue;
		entries.push({
			articleId: entry.articleId,
			title: articles[entry.articleId]?.title ?? 'Untitled',
			page: entry.pageNumber
		});
	}
	return entries;
}

// unique userIds of whoever DESIGNED the templates actually used in this
// edition - what a `citation` component's citationType='designer' credit
// resolves to. Derived from the referenced templates, not a static/global
// value, so it actually reflects who designed THIS edition's pages.
export function designerUserIds(templates: TemplateRow[]): string[] {
	const ids: string[] = [];
	for (const template of templates) {
		if (!ids.includes(template.userId)) ids.push(template.userId);
	}
	return ids;
}

// unique userIds of whoever WROTE the body papers included in this edition -
// citationType='writers'. Derived from the actual `articleIds` list, so
// adding/removing a paper changes who gets credited.
export function writerUserIds(
	articleIds: number[],
	articles: Record<number, ArticleRow>
): string[] {
	const ids: string[] = [];
	for (const id of articleIds) {
		const userId = articles[id]?.userId;
		if (userId && !ids.includes(userId)) ids.push(userId);
	}
	return ids;
}
