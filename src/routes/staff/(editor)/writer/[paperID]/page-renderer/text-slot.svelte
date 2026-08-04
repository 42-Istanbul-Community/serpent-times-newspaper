<script lang="ts">
	import { onMount } from 'svelte';
	import DOMPurify from 'dompurify';
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

	// loaded in the browser only: @lexical/clipboard and @lexical/rich-text
	// import each other, and that cycle throws on the server ("Cannot access
	// 'CoreImportExtension' before initialization"). It's a DOM editor, so
	// there's nothing to render server-side anyway - until it mounts, the
	// current value stands in.
	let LexicalEditor = $state<typeof import('./lexical-editor.svelte').default>();
	onMount(async () => {
		LexicalEditor = (await import('./lexical-editor.svelte')).default;
	});
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
	{:else if LexicalEditor}
		<LexicalEditor
			value={slotValues[el.id] ?? ''}
			onchange={(html) => onSlotChange(el.id, html)}
			textStyle="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
			placeholder={el.properties.content}
		/>
	{:else}
		<div
			class="w-full px-1"
			style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
		>
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html DOMPurify.sanitize(slotValues[el.id] ?? '')}
		</div>
	{/if}
</div>
