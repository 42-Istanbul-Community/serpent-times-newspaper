<script lang="ts">
	import { textBoxStyle, verticalAlignClass } from '../../../page/[pageID]/canvas/element-style';
	import type { CanvasElement } from '$lib/types/canvas';

	let {
		el,
		slotValues,
		onSlotChange
	}: {
		el: CanvasElement;
		slotValues: Record<string, string>;
		onSlotChange: (elementId: string, value: string) => void;
	} = $props();
</script>

<div
	class="pdf-manual-slot flex h-full w-full outline outline-1 outline-slytherin/40 outline-dashed focus-within:outline-2 focus-within:outline-slytherin {verticalAlignClass(
		el.properties
	)}"
>
	{#if el.type === 'title'}
		<input
			value={slotValues[el.id] ?? ''}
			oninput={(event) => onSlotChange(el.id, event.currentTarget.value)}
			placeholder={el.properties.content}
			class="w-full bg-transparent px-1 outline-none"
			style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
		/>
	{:else}
		<textarea
			value={slotValues[el.id] ?? ''}
			oninput={(event) => onSlotChange(el.id, event.currentTarget.value)}
			placeholder={el.properties.content}
			class="h-full w-full resize-none bg-transparent px-1 outline-none"
			style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
		></textarea>
	{/if}
</div>

<style>
	/* moved from the old flat page-renderer.svelte - .pdf-manual-slot lives
	   on this component's own root div now, so its print override has to
	   live here too (Svelte scoped styles don't cross component boundaries). */
	@media print {
		.pdf-manual-slot {
			outline: none !important;
		}
		.pdf-manual-slot :global(input),
		.pdf-manual-slot :global(textarea) {
			border: none !important;
			box-shadow: none !important;
			padding: 0 !important;
		}
	}
</style>
