<script lang="ts">
	import ImageDropzone from './image-dropzone.svelte';
	import type { CanvasElement } from '$lib/types/canvas';

	let {
		el,
		slotValues,
		onSlotChange,
		uploadArticleImage
	}: {
		el: CanvasElement;
		slotValues: Record<string, string>;
		onSlotChange: (elementId: string, value: string) => void;
		uploadArticleImage: (file: File) => Promise<string>;
	} = $props();
</script>

<ImageDropzone
	value={slotValues[el.id] ?? ''}
	onchange={(url) => onSlotChange(el.id, url)}
	aspect={(el.width || 220) / (el.height || 160)}
	class="h-full w-full"
	upload={uploadArticleImage}
/>
