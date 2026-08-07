// Plain type declarations for the canvas element tree - split out from
// routes/(editor)/page/[pageID]/canvas-state.svelte.ts (which also defines
// $state and imports svelte/reactivity) so server-only code (the Drizzle
// schema, loaded by drizzle-kit outside the Svelte/Vite pipeline) can safely
// import these types without pulling in a .svelte.ts file.

export type CanvasElementType =
	'title' | 'text' | 'image' | 'page-number' | 'date' | 'rectangle' | 'citation' | 'index';

export type CanvasElement = {
	id: string;
	kind: 'element';
	type: CanvasElementType;
	label: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	// set once Moveable's Warpable ability distorts the element's corners -
	// when non-empty, this replaces `rotation` as the element's transform
	// (Moveable reports the full, self-consistent transform after a warp).
	warpTransform: string;
	// starting values come from src/lib/data/components/<type>.json, edited
	// afterwards from the properties panel.
	properties: Record<string, string>;
	// a locked element can't be clicked/dragged on the canvas (Moveable
	// won't even attach to it) - it can still be selected, renamed, grouped
	// etc. from the layers panel.
	locked: boolean;
};

export type CanvasGroup = {
	id: string;
	kind: 'group';
	label: string;
	expanded: boolean;
	children: CanvasElement[];
};

export type CanvasNode = CanvasElement | CanvasGroup;
