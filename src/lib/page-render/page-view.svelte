<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { boxAppearanceStyle, pageBackgroundStyle } from '$lib/canvas/element-style';
	import type { CanvasElement, CanvasNode } from '$lib/types/canvas';
	import type { Credits, Role, TocEntry } from '$lib/edition/assemble';
	import {
		buildIndexContent,
		formatDateToken,
		getSampleCitationNames,
		getSampleIndexEntries,
		substituteCitation,
		substituteToken
	} from './substitute';
	import StaticContent from './static-content.svelte';

	// matches canvas.svelte's own local PAPER_WIDTH/PAPER_HEIGHT consts (not
	// exported from $lib).
	const PAPER_WIDTH = 720;
	const PAPER_HEIGHT = 960;

	// One assembled page, rendered the same way everywhere it appears: the
	// editor (cover thumbnails, reader preview) and the reader itself.
	let {
		role,
		pageNumber,
		userNames,
		tocEntries,
		credits,
		nodes,
		slotValues = {},
		backgroundColor = '#fbf8f1',
		backgroundImage = '',
		manualSlot,
		registerEl
	}: {
		role: Role;
		pageNumber: number;
		userNames: Record<string, string>;
		tocEntries: TocEntry[];
		credits: Credits;
		nodes: CanvasNode[];
		slotValues?: Record<string, string>;
		backgroundColor?: string;
		backgroundImage?: string;
		manualSlot?: Snippet<[CanvasElement]>;
		registerEl?: Attachment<HTMLElement>;
	} = $props();

	import { fontStore } from '$lib/data/fonts.svelte';

	function flatten(nodes: CanvasNode[]): CanvasElement[] {
		const flat: CanvasElement[] = [];
		for (const node of nodes) {
			if (node.kind === 'element') flat.push(node);
			else flat.push(...node.children);
		}
		return flat;
	}

	// ensure any Google or custom fonts used in elements are loaded into the page
	$effect(() => {
		for (const el of flatten(nodes)) {
			if (el.properties.fontFamily) {
				fontStore.ensureFontLoaded(el.properties.fontFamily);
			}
		}
	});

	// manual editing is only ever available on the cover - the one page role
	// with no automatic source of content. Index is fully auto-generated (its
	// `index`-type component pours out every paper's title, see displayContent
	// below - there's nothing left for an editor to type), body papers are
	// already finalized by the writer (placed read-only here), and citation
	// pages are never manually filled either.
	function isManualSlot(el: CanvasElement) {
		return (
			Boolean(manualSlot) &&
			role === 'cover' &&
			(el.type === 'title' || el.type === 'text' || el.type === 'image') &&
			el.properties.manual === 'true'
		);
	}

	// a title/text/image element the DESIGNER marked manual - i.e. a slot some
	// writer/editor was meant to fill in. Where isManualSlot lets it actually
	// be typed into (the editor's cover), fine; everywhere else - crucially:
	// body papers, already filled in and finalized back in /writer, and every
	// page in the reader - it still needs to show what was filled in, just
	// read-only.
	function isFillable(el: CanvasElement) {
		return (
			(el.type === 'title' || el.type === 'text' || el.type === 'image') &&
			el.properties.manual === 'true'
		);
	}

	// resolves a citation credit type to the real userId(s) behind it, from
	// the edition's own actual data - never a static value, so it reflects
	// who's actually involved in THIS edition.
	function citationUserIds(citationType: string): string[] {
		if (citationType === 'designer') return credits.designerUserIds;
		if (citationType === 'writers') return credits.writerUserIds;
		if (citationType === 'editor') return credits.editorUserId ? [credits.editorUserId] : [];
		return [];
	}

	// page-number/citation/index are never manual slots (untouched by
	// isManualSlot's type check) - this substitution applies unconditionally
	// to every rendered instance of these three types, on any role, computed
	// fresh every render from the edition's assembled page order, its real
	// designer/writer/editor userIds resolved to display names via the
	// layout-provided shim (see +layout.server.ts), and (for index) its body
	// papers - `content` is only ever a design-time preview for these three,
	// entirely replaced here.
	//
	// for every other fillable type, the actual filled-in slotValue wins over
	// the template's own default `content` (a design-time placeholder, never
	// real content) - this is what makes a body paper's own writer-filled
	// text/title actually show up here instead of the template's blank default.
	function displayContent(el: CanvasElement): string {
		if (el.type === 'page-number')
			return substituteToken(el.properties.content, String(pageNumber));
		if (el.type === 'citation') {
			const realNames = citationUserIds(el.properties.citationType).map(
				(id) => userNames[id] ?? id
			);
			const names =
				realNames.length > 0
					? realNames
					: getSampleCitationNames(
							`${el.id}-${el.properties.citationType}`,
							el.height,
							el.properties.fontSize,
							el.properties.lineHeight
						);
			return substituteCitation(el.properties.content, names);
		}
		if (el.type === 'index') {
			const entries =
				tocEntries && tocEntries.length > 0
					? tocEntries
					: getSampleIndexEntries(
							`${el.id}-index`,
							el.height,
							el.properties.fontSize,
							el.properties.lineHeight
						);
			return buildIndexContent(el.properties.entryFormat || '{title} .... {page}', entries);
		}
		if (el.type === 'date') return formatDateToken(el.properties.content);
		if (isFillable(el)) return slotValues[el.id] || el.properties.content;
		return el.properties.content;
	}
</script>

<!-- the editor attaches here to keep its own map of live page nodes, which
     the autosave cover-thumbnail capture reads. -->
<div
	{@attach (node) => registerEl?.(node)}
	class="pdf-page relative mx-auto shrink-0 border border-paper-rule shadow-sm"
	style="width: {PAPER_WIDTH}px; height: {PAPER_HEIGHT}px; {pageBackgroundStyle(
		backgroundColor,
		backgroundImage
	)}"
>
	<!-- canvasStore.elements is front-to-back (index 0 = topmost); DOM order
	     paints later siblings on top, so reverse it here - same rule
	     canvas.svelte's own render loop follows. -->
	{#each flatten(nodes).reverse() as el (el.id)}
		<div
			class="absolute overflow-hidden"
			style="left: {el.x}px; top: {el.y}px; width: {el.width}px; height: {el.height}px; transform: {el.warpTransform ||
				`rotate(${el.rotation}deg)`}; {boxAppearanceStyle(el.properties)}"
		>
			{#if isManualSlot(el) && manualSlot}
				{@render manualSlot(el)}
			{:else}
				<StaticContent
					{el}
					imageSrc={isFillable(el) ? slotValues[el.id] || el.properties.src : el.properties.src}
					text={displayContent(el)}
				/>
			{/if}
		</div>
	{/each}
</div>

<style>
	/* Puppeteer's page.pdf() renders under the print media query (see
	   src/lib/server/pdf.ts) - this is what turns a page stack into plain
	   final-look pages: one Chromium PDF page per .pdf-page (matching the
	   fixed 720x960 size passed to page.pdf() 1:1, so nothing scales or
	   splits mid-page). .pdf-manual-slot's own print override lives in
	   text-slot.svelte instead - Svelte scoped styles don't cross component
	   boundaries. */
	@media print {
		.pdf-page {
			break-after: page;
			border: none !important;
			box-shadow: none !important;
			margin: 0 auto !important;
		}
	}
</style>
