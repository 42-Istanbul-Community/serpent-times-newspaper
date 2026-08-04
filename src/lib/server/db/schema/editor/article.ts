import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { pageTemplateCategory, publicationStatus } from './enums';

// One page within an article's `pages` array. `id` is a client-generated
// crypto.randomUUID() - same role as CanvasElement.id: stable identity for
// array management/reordering/keying, not a foreign key. `label` is the
// writer's own organizational name for the page (defaults to the chosen
// template's title, renameable), separate from the template's own title.
export type ArticlePage = {
	id: string;
	label: string;
	pageTemplateId: number;
	// filled-in values for the slots in pageTemplate.elements the designer
	// marked `manual` (element id -> value).
	slotValues: Record<string, string>;
};

// The actual content filled in on top of one or more pageTemplates.
// Renamed "writer.ts" -> "article.ts" since the table holds the article
// that was written, not the writer themselves.
//
// A "paper" (a writer's own multi-page piece, see src/routes/(editor)/
// writer) is just an article whose `pages` array has more than one entry;
// a single cover/index/citation page (filled by an editor/system elsewhere,
// see src/routes/(editor)/newspaper) is an article with exactly one page.
// `category` (below) is the actual discriminator between these:
// - category=page  -> written by a writer, who can only touch the slots
//   (slotValues) the designer allowed, not the layout/design.
// - category=cover -> filled in by the editor while assembling the edition,
//   same manual-slot mechanism as a writer's page.
// - category=index -> also filled in manually by the editor (same
//   mechanism), just picked/placed rather than written from scratch.
// - category=citation -> never manually filled - its `citation`-type
//   components are substituted at render time from the edition's
//   assembled page sequence, never stored into slotValues.
//
// pageTemplateId lives inside the jsonb `pages` array, so it is NOT a real
// FK-enforced reference (same trade-off pageTemplate.elements already has
// for its own internal references, e.g. image URLs) - acceptable, matches
// existing precedent in this schema.
export const article = pgTable('article', {
	id: serial('id').primaryKey(),
	// whoever filled in the content (writer or editor). Once the user table
	// exists, add `.references(() => user.id)` here.
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	// which kind of page(s) this article holds - lets /writer's dashboard
	// filter to real papers only, and the newspaper editor query "which
	// article is this edition's cover/index/citation" directly.
	category: pageTemplateCategory('category').notNull().default('page'),
	status: publicationStatus('status').notNull().default('draft'),
	// full CDN URL to a screenshot of the currently/last-edited page - set by
	// an autosave-triggered capture, same mechanism as pageTemplate.cdnUrl.
	cdnUrl: text('cdn_url'),
	pages: jsonb('pages').$type<ArticlePage[]>().notNull().default([]),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
