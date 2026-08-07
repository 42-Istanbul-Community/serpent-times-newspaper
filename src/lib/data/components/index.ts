import citationSchema from './citation.json';
import dateSchema from './date.json';
import imageSchema from './image.json';
import indexSchema from './index.json';
import pageNumberSchema from './page-number.json';
import rectangleSchema from './rectangle.json';
import textSchema from './text.json';
import titleSchema from './title.json';
import {
	appearanceFields,
	appearanceProperties,
	shadowFields,
	shadowProperties,
	typographyFields,
	typographyProperties
} from './base-fields';
import type { ComponentSchema } from './schema';

export type { ComponentField, ComponentFieldType, ComponentSchema } from './schema';
export * from './base-fields';

// (cast because JSON imports widen string-literal fields like `field.type`
// to `string`, TS can't infer the narrower ComponentFieldType from a .json file)
// no separate ellipse/triangle - a rectangle rounded via Roundable already
// covers circles/ovals, and a plain-fill triangle wasn't worth the
// clip-path/no-stroke tradeoff.
const rawSchemas = {
	title: titleSchema,
	text: textSchema,
	image: imageSchema,
	'page-number': pageNumberSchema,
	date: dateSchema,
	rectangle: rectangleSchema,
	citation: citationSchema,
	index: indexSchema
} as Record<string, ComponentSchema>;

// every type renders text except these two.
const NON_TEXT_TYPES = new Set(['image', 'rectangle']);

// Each <type>.json only declares what's actually unique to it (its own
// "Content" field, like text or an image url). Everything a component could
// plausibly share with every other one - fill/border/corner radius, drop
// shadow, and (for anything that renders text) typography - is composed in
// here once, instead of being repeated across every json file.
function withSharedFields(type: string, schema: ComponentSchema): ComponentSchema {
	const isTextType = !NON_TEXT_TYPES.has(type);

	return {
		...schema,
		properties: {
			...appearanceProperties,
			...shadowProperties,
			...(isTextType ? typographyProperties : {}),
			...schema.properties
		},
		fields: [
			...schema.fields,
			...(isTextType ? typographyFields : []),
			...appearanceFields,
			...shadowFields
		]
	};
}

// keyed by CanvasElementType (see routes/(editor)/page/[pageID]/canvas-state.svelte.ts)
// - kept as plain strings here so this data layer doesn't depend on a route.
export const componentSchemas: Record<string, ComponentSchema> = Object.fromEntries(
	Object.entries(rawSchemas).map(([type, schema]) => [type, withSharedFields(type, schema)])
);
