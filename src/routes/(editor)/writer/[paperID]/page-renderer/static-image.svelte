<script lang="ts">
	import type { CanvasElement } from '$lib/types/canvas';

	let { el }: { el: CanvasElement } = $props();
</script>

{#if el.properties.src}
	<img
		src={el.properties.src}
		alt=""
		class="h-full w-full"
		style="object-fit: {el.properties.objectFit};"
	/>
{/if}
