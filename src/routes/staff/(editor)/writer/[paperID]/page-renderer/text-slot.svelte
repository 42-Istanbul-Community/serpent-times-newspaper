<script lang="ts">
	import { onMount } from 'svelte';
	import DOMPurify from 'dompurify';
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

	// loaded in the browser only: @lexical/clipboard and @lexical/rich-text
	// import each other, and that cycle throws on the server ("Cannot access
	// 'CoreImportExtension' before initialization"). It's a DOM editor, so
	// there's nothing to render server-side anyway - until it mounts, the
	// current value stands in.
	let LexicalEditor =
		$state<typeof import('$lib/components/editor/lexical-editor.svelte').default>();
	onMount(async () => {
		LexicalEditor = (await import('$lib/components/editor/lexical-editor.svelte')).default;
	});
</script>

<div
	class="pdf-manual-slot group relative flex h-full w-full rounded-xs border-2 border-dashed border-slytherin/60 bg-slytherin/[0.04] transition-all focus-within:border-solid focus-within:border-slytherin focus-within:bg-transparent focus-within:ring-2 focus-within:ring-slytherin/30 hover:border-slytherin hover:bg-slytherin/[0.08] {el.type ===
	'title'
		? verticalAlignClass(el.properties)
		: 'items-stretch'}"
>
	{#if el.type === 'title'}
		<input
			value={slotValues[el.id] ?? ''}
			oninput={(event) => onSlotChange(el.id, event.currentTarget.value)}
			placeholder={el.properties.content || 'Click to type title...'}
			class="w-full bg-transparent px-1.5 py-0.5 outline-none placeholder:text-slytherin/50 placeholder:italic"
			style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
		/>
	{:else if LexicalEditor}
		<LexicalEditor
			value={slotValues[el.id] ?? ''}
			onchange={(html) => onSlotChange(el.id, html)}
			textStyle="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
			placeholder={el.properties.content || 'Click to type text...'}
		/>
	{:else}
		<div
			class="w-full px-1.5"
			style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html DOMPurify.sanitize(slotValues[el.id] ?? '')}
		</div>
	{/if}
</div>

<style>
	@media print {
		.pdf-manual-slot {
			border: none !important;
			background: transparent !important;
			box-shadow: none !important;
		}
	}
</style>
