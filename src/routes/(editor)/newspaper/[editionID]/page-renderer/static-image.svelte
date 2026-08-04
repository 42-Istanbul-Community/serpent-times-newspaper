<script lang="ts">
	import type { CanvasElement } from '$lib/types/canvas';

	let { el, src }: { el: CanvasElement; src: string | undefined } = $props();
</script>

{#if src}
	<img {src} alt="" class="h-full w-full" style="object-fit: {el.properties.objectFit};" />
{/if}
