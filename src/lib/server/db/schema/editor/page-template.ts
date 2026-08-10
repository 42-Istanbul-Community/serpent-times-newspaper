import { jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
// relative import (not the `$lib` alias) - drizzle-kit loads this file in
// plain Node outside the Vite pipeline, and can't be assumed to resolve
// SvelteKit path aliases the same way the app build does.
import type { CanvasNode } from '../../../../types/canvas';
import { pageTemplateAvailability, pageTemplateCategory } from './enums';

export const pageTemplate = pgTable('page_template', {
	id: serial('id').primaryKey(),
	userId: text('user_id').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	category: pageTemplateCategory('category').notNull(),
	availability: pageTemplateAvailability('availability').notNull().default('draft'),
	// full CDN URL to the cover image - not populated yet, will be set later
	// by an automatic periodic screenshot job.
	cdnUrl: text('cdn_url'),
	elements: jsonb('elements').$type<CanvasNode[]>().notNull().default([]),
	// the paper's own background, set from the properties panel (see
	// canvas-state.svelte.ts's pageBackgroundColor/pageBackgroundImage) -
	// matches --color-canvas-paper's default so an un-customized template
	// looks the same as before this existed.
	backgroundColor: text('background_color').notNull().default('#fbf8f1'),
	backgroundImage: text('background_image'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});
