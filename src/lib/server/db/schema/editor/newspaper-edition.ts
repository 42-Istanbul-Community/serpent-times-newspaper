import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { article } from './article';
import { editionKind, publicationStatus } from './enums';

export const newspaperEdition = pgTable('newspaper_edition', {
	id: serial('id').primaryKey(),
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	// 'pdf' editions are uploaded back-issues: every article/template column
	// below stays empty for them, their newspaper.pdf is the upload itself
	// rather than a bake, and the editor refuses to open them.
	kind: editionKind('kind').notNull().default('assembled'),
	// reading order, lowest first - what the homepage's list and the editor's
	// dashboard are sorted by. Every row starts at 0 and ties break on
	// updatedAt (newest first), so an untouched install keeps the
	// newest-first order it had before anyone reordered anything; the first
	// reorder renumbers the whole list (see the dashboard's `move` action).
	position: integer('position').notNull().default(0),
	// cover, index and citation pages are also filled-in instances of a
	// pageTemplate (with a different category), so they reference article.id.
	// cover is a single page, filled in by the editor while assembling the
	// edition. nullable since it may not have been picked yet.
	coverArticleId: integer('cover_article_id').references(() => article.id),
	// index can span multiple pages, hence the array (order = page order).
	// picked/placed by the editor same as the cover (manual title/text/image
	// slots), just not written from scratch.
	indexArticleIds: jsonb('index_article_ids').$type<number[]>().notNull().default([]),
	// citation pages are also picked/placed, but never manually filled - see
	// src/routes/(editor)/newspaper: `citation`-type components are
	// substituted at render time (page position, credit names), never
	// written into an article row's slotValues.
	citationArticleIds: jsonb('citation_article_ids').$type<number[]>().notNull().default([]),
	// the list of published (content) articles included in this edition.
	articleIds: jsonb('article_ids').$type<number[]>().notNull().default([]),
	status: publicationStatus('status').notNull().default('draft'),
	// full CDN URL to a screenshot of the cover - set by an autosave-
	// triggered capture, same mechanism as article.cdnUrl/pageTemplate.cdnUrl.
	cdnUrl: text('cdn_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
