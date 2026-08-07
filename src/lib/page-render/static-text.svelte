<script lang="ts">
	// isomorphic build, not plain `dompurify`: this component renders on the
	// server too now (the homepage reader and the print route), and dompurify
	// without a DOM has no `sanitize` at all.
	import DOMPurify from 'isomorphic-dompurify';
	import { textBoxStyle, verticalAlignClass } from '$lib/canvas/element-style';
	import type { CanvasElement } from '$lib/types/canvas';

	let { el, content }: { el: CanvasElement; content: string } = $props();
</script>

<div class="flex h-full w-full px-1 {verticalAlignClass(el.properties)}">
	<span
		class="w-full whitespace-pre-line"
		style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
	>
		{#if el.type === 'text'}
			<!-- writer-authored 'text' slots may contain Lexical-produced HTML
			     (bold/italic/underline) - sanitized immediately below. -->
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			{@html DOMPurify.sanitize(content)}
		{:else}
			{content}
		{/if}
	</span>
</div>
