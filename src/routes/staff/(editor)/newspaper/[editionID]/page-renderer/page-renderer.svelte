<script lang="ts">
	import PageView from '$lib/page-render/page-view.svelte';
	import type { CanvasElement, CanvasNode } from '$lib/types/canvas';
	import type { Role, TocEntry } from '$lib/edition/assemble';
	import { editionState } from '../edition-state.svelte';
	import { createArticleImageUploader } from '../upload-image';
	import ManualSlot from './manual-slot.svelte';

	// the editor's take on a rendered page: the shared read-only PageView plus
	// the one thing only this route offers - typeable cover slots, handed down
	// as the `manualSlot` snippet.
	let {
		role,
		pageNumber,
		userNames,
		tocEntries,
		articleId,
		pageId,
		nodes,
		slotValues,
		onSlotChange
	}: {
		role: Role;
		pageNumber: number;
		userNames: Record<string, string>;
		tocEntries: TocEntry[];
		articleId: number;
		pageId: string;
		nodes: CanvasNode[];
		slotValues: Record<string, string>;
		onSlotChange: (elementId: string, value: string) => void;
	} = $props();

	let uploadArticleImage = $derived(createArticleImageUploader(articleId));

	let credits = $derived({
		designerUserIds: editionState.designerUserIds,
		writerUserIds: editionState.writerUserIds,
		editorUserId: editionState.editorUserId
	});

	// all pages render simultaneously (see +page.svelte), so the store keeps
	// each page's live node by id for code outside this component - the
	// autosave cover-thumbnail capture.
	function registerEl(node: HTMLElement) {
		editionState.pageRendererEls.set(pageId, node);
		return () => editionState.pageRendererEls.delete(pageId);
	}
</script>

<PageView {role} {pageNumber} {userNames} {tocEntries} {credits} {nodes} {slotValues} {registerEl}>
	{#snippet manualSlot(el: CanvasElement)}
		<ManualSlot {el} {slotValues} {onSlotChange} {uploadArticleImage} />
	{/snippet}
</PageView>
