<script lang="ts">
	import type { CanvasElement } from '$lib/types/canvas';

	let { el, src }: { el: CanvasElement; src: string | undefined } = $props();
</script>

<img
	src={src || '/sample-image.jpg'}
	alt=""
	class="h-full w-full"
	style="object-fit: {el.properties.objectFit ?? 'cover'};"
/>
