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
