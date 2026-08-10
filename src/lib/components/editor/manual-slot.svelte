<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CanvasElement } from '$lib/types/canvas';
	import ImageSlot from './image-slot.svelte';

	// the image case is identical everywhere, so it's handled directly here.
	// the text/title case isn't - the writer renders it through a rich-text
	// Lexical editor, the newspaper editor through a plain textarea (see
	// each route's own text-slot.svelte) - so the caller supplies it as a
	// snippet instead.
	let {
		el,
		slotValues,
		onSlotChange,
		uploadArticleImage,
		textSlot
	}: {
		el: CanvasElement;
		slotValues: Record<string, string>;
		onSlotChange: (elementId: string, value: string) => void;
		uploadArticleImage: (file: File) => Promise<string>;
		textSlot: Snippet<[CanvasElement]>;
	} = $props();
</script>

{#if el.type === 'image'}
	<ImageSlot {el} {slotValues} {onSlotChange} {uploadArticleImage} />
{:else}
	{@render textSlot(el)}
{/if}
