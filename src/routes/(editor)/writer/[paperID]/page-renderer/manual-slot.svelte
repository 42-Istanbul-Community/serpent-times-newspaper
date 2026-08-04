<script lang="ts">
	import type { CanvasElement } from '$lib/types/canvas';
	import ImageSlot from './image-slot.svelte';
	import TextSlot from './text-slot.svelte';

	let {
		el,
		slotValues,
		onSlotChange,
		uploadArticleImage
	}: {
		el: CanvasElement;
		slotValues: Record<string, string>;
		onSlotChange: (elementId: string, value: string) => void;
		uploadArticleImage: (file: File) => Promise<string>;
	} = $props();
</script>

{#if el.type === 'image'}
	<ImageSlot {el} {slotValues} {onSlotChange} {uploadArticleImage} />
{:else}
	<TextSlot {el} {slotValues} {onSlotChange} />
{/if}
