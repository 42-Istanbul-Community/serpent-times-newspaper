import { pgEnum } from 'drizzle-orm/pg-core';

export const publicationStatus = pgEnum('publication_status', ['draft', 'published']);

export const pageTemplateCategory = pgEnum('page_template_category', [
	'cover',
	'page',
	'index',
	'citation'
]);

export const pageTemplateAvailability = pgEnum('page_template_availability', [
	'draft',
	'used',
	'unused'
]);

export const elementFillMode = pgEnum('element_fill_mode', ['auto', 'manual']);

// How an edition's pages come to exist:
// - assembled -> built in the newspaper editor out of articles + templates,
//   rendered as HTML (see $lib/page-render).
// - pdf       -> a back-issue whose PDF was uploaded whole. Nothing to
//   assemble and nothing to edit; readers get the file itself.
export const editionKind = pgEnum('edition_kind', ['assembled', 'pdf']);
