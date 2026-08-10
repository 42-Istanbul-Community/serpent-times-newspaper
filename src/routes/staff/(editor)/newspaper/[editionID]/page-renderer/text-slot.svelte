<script lang="ts">
	import { textBoxStyle, verticalAlignClass } from '$lib/canvas/element-style';
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
	class="pdf-manual-slot group relative flex h-full w-full rounded-xs border-2 border-dashed border-slytherin/60 bg-slytherin/[0.04] hover:border-slytherin hover:bg-slytherin/[0.08] focus-within:border-solid focus-within:border-slytherin focus-within:bg-transparent focus-within:ring-2 focus-within:ring-slytherin/30 transition-all {verticalAlignClass(
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
