import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { article, newspaperEdition, pageTemplate } from '$lib/server/db/schema';
import { loadAuthors } from '$lib/server/authors';
import { requireUserId } from '$lib/server/require-login';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = Number(params.editionID);
	if (!Number.isInteger(id)) error(404, 'Not found');
	const userId = requireUserId(locals);

	const [edition] = await db
		.select()
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.id, id), eq(newspaperEdition.userId, userId)));
	if (!edition) error(404, 'Not found');

	// an uploaded back-issue has no articles or templates to look up - the
	// editor opens it read-only (see +layout.svelte), showing the PDF itself
	// where the assembled page stack would go.
	if (edition.kind === 'pdf') {
		return {
			edition,
			pdfUrl: `/api/cdn/newspaper/${edition.id}/newspaper.pdf`,
			articles: [],
			templates: [],
			pickableCover: [],
			pickableIndex: [],
			pickableCitation: [],
			availablePapers: [],
			authors: {}
		};
	}

	const referencedArticleIds = [
		...(edition.coverArticleId !== null ? [edition.coverArticleId] : []),
		...edition.indexArticleIds,
		...edition.citationArticleIds,
		...edition.articleIds
	];
	const articles =
		referencedArticleIds.length > 0
			? await db.select().from(article).where(inArray(article.id, referencedArticleIds))
			: [];

	const templateIds = [...new Set(articles.flatMap((a) => a.pages.map((p) => p.pageTemplateId)))];
	const templates =
		templateIds.length > 0
			? await db.select().from(pageTemplate).where(inArray(pageTemplate.id, templateIds))
			: [];

	// any approved template in the DB - page designer templates are shared
	// across all users (an approved template can be picked by any editor),
	// and from any designer, same rule the writer's template picker uses.
	const approved = inArray(pageTemplate.availability, ['used', 'unused'] as const);
	const [pickableCover, pickableIndex, pickableCitation] = await Promise.all(
		(['cover', 'index', 'citation'] as const).map((category) =>
			db
				.select()
				.from(pageTemplate)
				.where(and(eq(pageTemplate.category, category), approved))
		)
	);

	// "unwritten" papers: category='page' articles not already placed in ANY
	// edition. Authors can pick their own drafts or published papers, while
	// editors can also pick published papers written by other authors.
	const allEditions = await db
		.select({ articleIds: newspaperEdition.articleIds })
		.from(newspaperEdition)
		.where(and(eq(newspaperEdition.userId, userId), ne(newspaperEdition.id, id)));
	const usedPaperIds = new Set(allEditions.flatMap((e) => e.articleIds));
	const papers = await db
		.select({
			id: article.id,
			title: article.title,
			cdnUrl: article.cdnUrl,
			userId: article.userId
		})
		.from(article)
		.where(
			and(
				eq(article.category, 'page'),
				or(eq(article.userId, userId), eq(article.status, 'published'))
			)
		);

	const availablePapers = papers.filter((p) => !usedPaperIds.has(p.id));

	// whoever wrote/designed each pickable thing, so the pickers can credit
	// them under the title (see $lib/author-badge.svelte).
	const authors = await loadAuthors([
		...availablePapers.map((p) => p.userId),
		...[...pickableCover, ...pickableIndex, ...pickableCitation].map((t) => t.userId)
	]);

	return {
		edition,
		pdfUrl: null,
		articles,
		templates,
		pickableCover,
		pickableIndex,
		pickableCitation,
		availablePapers,
		authors
	};
};
