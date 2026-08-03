<script lang="ts">
	import { boxAppearanceStyle } from '../../../page/[pageID]/canvas/element-style';
	import type { CanvasElement, CanvasNode } from '$lib/types/canvas';
	import { paperState } from '../paper-state.svelte';
	import { createArticleImageUploader } from '../upload-image';
	import StaticContent from './static-content.svelte';
	import ManualSlot from './manual-slot.svelte';

	// matches canvas.svelte's own local PAPER_WIDTH/PAPER_HEIGHT consts (not
	// exported from $lib).
	const PAPER_WIDTH = 720;
	const PAPER_HEIGHT = 960;

	let {
		articleId,
		pageId,
		nodes,
		slotValues,
		onSlotChange
	}: {
		articleId: number;
		pageId: string;
		nodes: CanvasNode[];
		slotValues: Record<string, string>;
		onSlotChange: (elementId: string, value: string) => void;
	} = $props();

	let uploadArticleImage = $derived(createArticleImageUploader(articleId));

	let paperRootEl: HTMLDivElement = $state()!;

	// keep the store's reference to this page's rendered node in sync (all
	// pages render simultaneously - see +page.svelte), so code outside this
	// component (the autosave thumbnail capture) can get at a specific one.
	$effect(() => {
		if (!paperRootEl) return;
		paperState.pageRendererEls.set(pageId, paperRootEl);
		return () => {
			paperState.pageRendererEls.delete(pageId);
		};
	});

	// a group has no visual presence of its own on the canvas (same rule as
	// canvasStore.elements) - flatten it away entirely for rendering.
	function flatten(nodes: CanvasNode[]): CanvasElement[] {
		return nodes.flatMap((n) => (n.kind === 'group' ? n.children : [n]));
	}

	function isManualSlot(el: CanvasElement) {
		return (
			(el.type === 'title' || el.type === 'text' || el.type === 'image') &&
			el.properties.manual === 'true'
		);
	}
</script>

<div
	bind:this={paperRootEl}
	class="relative mx-auto shrink-0 border border-paper-rule shadow-sm"
	style="width: {PAPER_WIDTH}px; height: {PAPER_HEIGHT}px; background-color: #fbf8f1;"
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
			{#if isManualSlot(el)}
				<ManualSlot {el} {slotValues} {onSlotChange} {uploadArticleImage} />
			{:else}
				<StaticContent {el} />
			{/if}
		</div>
	{/each}
</div>
