<script lang="ts">
	import type { CanvasElement } from '$lib/types/canvas';
	import StaticImage from './static-image.svelte';
	import StaticText from './static-text.svelte';

	let { el }: { el: CanvasElement } = $props();
</script>

{#if el.type === 'image'}
	<StaticImage {el} />
{:else if el.type === 'rectangle'}
	<!-- a rectangle IS just the outer box (fill/border/radius/shadow above) -->
{:else}
	<StaticText {el} />
{/if}
