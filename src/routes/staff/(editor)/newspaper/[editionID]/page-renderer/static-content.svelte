<script lang="ts">
	import type { CanvasElement } from '$lib/types/canvas';
	import StaticImage from './static-image.svelte';
	import StaticText from './static-text.svelte';

	// imageSrc/text are pre-resolved by the parent page-renderer.svelte
	// (which owns the substitution logic - page-number/citation/index
	// tokens, slotValue-over-template-default fallback), so this component
	// stays purely presentational.
	let {
		el,
		imageSrc,
		text
	}: {
		el: CanvasElement;
		imageSrc: string | undefined;
		text: string;
	} = $props();
</script>

{#if el.type === 'image'}
	<StaticImage {el} src={imageSrc} />
{:else if el.type === 'rectangle'}
	<!-- a rectangle IS just the outer box (fill/border/radius/shadow above) -->
{:else}
	<StaticText {el} content={text} />
{/if}
