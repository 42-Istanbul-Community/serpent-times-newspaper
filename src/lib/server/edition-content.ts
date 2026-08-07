import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { article, pageTemplate } from '$lib/server/db/schema';
import * as assemble from '$lib/edition/assemble';
import type { AssembledPage, Credits, TocEntry } from '$lib/edition/assemble';
import type { CanvasNode } from '$lib/types/canvas';
import type { newspaperEdition } from '$lib/server/db/schema';

type EditionRow = typeof newspaperEdition.$inferSelect;

/** One page, resolved down to exactly what page-view.svelte needs to render it. */
export type RenderablePage = {
	key: string;
	role: AssembledPage['role'];
	pageNumber: number;
	nodes: CanvasNode[];
	slotValues: Record<string, string>;
};

export type EditionContent = {
	pages: RenderablePage[];
	tocEntries: TocEntry[];
	credits: Credits;
};

// Pulls an edition's referenced articles and templates and resolves them
// into a flat page list. The editor does the same thing client-side from its
// own live $state (see edition-state.svelte.ts) - both go through
// $lib/edition/assemble, so a reader, a PDF and the editor's own preview
// can't drift apart.
export async function loadEditionContent(edition: EditionRow): Promise<EditionContent> {
	const referencedArticleIds = [
		...(edition.coverArticleId !== null ? [edition.coverArticleId] : []),
		...edition.indexArticleIds,
		...edition.citationArticleIds,
		...edition.articleIds
	];

	const rows =
		referencedArticleIds.length > 0
			? await db.select().from(article).where(inArray(article.id, referencedArticleIds))
			: [];
	const articles = assemble.articlesById(rows);

	const templateIds = [...new Set(rows.flatMap((row) => row.pages.map((p) => p.pageTemplateId)))];
	const templates =
		templateIds.length > 0
			? await db.select().from(pageTemplate).where(inArray(pageTemplate.id, templateIds))
			: [];

	const assembled = assemble.assemblePages(edition, articles);

	return {
		// a page whose template row is gone can't be rendered at all - drop it
		// rather than leaving a blank sheet in the middle of the newspaper.
		pages: assembled.flatMap((entry) => {
			const template = templates.find((t) => t.id === entry.page.pageTemplateId);
			if (!template) return [];
			return [
				{
					key: entry.page.id,
					role: entry.role,
					pageNumber: entry.pageNumber,
					nodes: template.elements,
					slotValues: entry.page.slotValues
				}
			];
		}),
		tocEntries: assemble.tocEntries(assembled, articles),
		credits: {
			designerUserIds: assemble.designerUserIds(templates),
			writerUserIds: assemble.writerUserIds(edition.articleIds, articles),
			editorUserId: edition.userId
		}
	};
}
