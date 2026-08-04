import { Calendar, Hash, Heading1, Image, ListOrdered, Quote, Square, Type } from '@lucide/svelte';
import type { CanvasElementType } from '../canvas-state.svelte';

export type PaletteItem = { type: CanvasElementType; label: string; icon: typeof Type };

// one flat list - not enough items yet to justify grouping (a single
// "Shapes" group for just Rectangle wasn't worth it; round it via Roundable,
// or set Corner Radius to 9999px, for a circle/oval).
export const paletteItems: PaletteItem[] = [
	{ type: 'title', label: 'Title', icon: Heading1 },
	{ type: 'text', label: 'Text', icon: Type },
	{ type: 'image', label: 'Image', icon: Image },
	{ type: 'page-number', label: 'Page Number', icon: Hash },
	{ type: 'date', label: 'Date', icon: Calendar },
	{ type: 'rectangle', label: 'Rectangle', icon: Square },
	{ type: 'citation', label: 'Citation', icon: Quote },
	{ type: 'index', label: 'Index List', icon: ListOrdered }
];

// used by the layers panel to show each element's icon, keyed by its type.
export const iconsByType: Record<CanvasElementType, typeof Type> = Object.fromEntries(
	paletteItems.map((item) => [item.type, item.icon])
) as Record<CanvasElementType, typeof Type>;
