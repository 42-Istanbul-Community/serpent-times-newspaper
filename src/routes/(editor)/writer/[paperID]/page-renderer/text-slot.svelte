<script lang="ts">
	import { textBoxStyle, verticalAlignClass } from '../../../page/[pageID]/canvas/element-style';
	import type { CanvasElement } from '$lib/types/canvas';
	import LexicalEditor from './lexical-editor.svelte';

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
	class="flex h-full w-full outline outline-1 outline-slytherin/40 outline-dashed focus-within:outline-2 focus-within:outline-slytherin {el.type ===
	'title'
		? verticalAlignClass(el.properties)
		: 'items-stretch'}"
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
		<LexicalEditor
			value={slotValues[el.id] ?? ''}
			onchange={(html) => onSlotChange(el.id, html)}
			textStyle="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
			placeholder={el.properties.content}
		/>
	{/if}
</div>
