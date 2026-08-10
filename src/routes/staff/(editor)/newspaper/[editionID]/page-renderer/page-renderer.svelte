<script lang="ts">
	import PageView from '$lib/page-render/page-view.svelte';
	import ManualSlot from '$lib/components/editor/manual-slot.svelte';
	import type { CanvasElement, CanvasNode } from '$lib/types/canvas';
	import type { Role, TocEntry } from '$lib/edition/assemble';
	import { editionState } from '../edition-state.svelte';
	import { createArticleImageUploader } from '$lib/components/editor/upload-image';
	import TextSlot from './text-slot.svelte';

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
		backgroundColor,
		backgroundImage,
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
		backgroundColor: string;
		backgroundImage: string;
		onSlotChange: (elementId: string, value: string) => void;
	} = $props();

	let uploadArticleImage = $derived(createArticleImageUploader('newspaper', articleId));

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

<PageView
	{role}
	{pageNumber}
	{userNames}
	{tocEntries}
	{credits}
	{nodes}
	{slotValues}
	{backgroundColor}
	{backgroundImage}
	{registerEl}
>
	{#snippet manualSlot(el: CanvasElement)}
		<ManualSlot {el} {slotValues} {onSlotChange} {uploadArticleImage}>
			{#snippet textSlot(el: CanvasElement)}
				<TextSlot {el} {slotValues} {onSlotChange} />
			{/snippet}
		</ManualSlot>
	{/snippet}
</PageView>
