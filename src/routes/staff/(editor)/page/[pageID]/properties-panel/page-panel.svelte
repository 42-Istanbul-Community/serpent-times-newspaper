<script lang="ts">
	import { Label } from 'bits-ui';
	import { canvasStore } from '../canvas-state.svelte';
	import ImageDropzone from '../image-dropzone.svelte';
</script>

<div class="flex flex-col gap-3">
	<span class="text-xs font-medium tracking-wide text-ui-text-muted uppercase">Page</span>
	<div class="flex flex-col gap-1.5">
		<Label.Root for="page-bg-color" class="text-xs font-medium text-ui-text-muted"
			>Background Color</Label.Root
		>
		<input
			id="page-bg-color"
			type="color"
			bind:value={canvasStore.pageBackgroundColor}
			class="h-8 w-full cursor-pointer rounded-md border border-ui-border bg-ui-surface"
		/>
	</div>
	<div class="flex flex-col gap-1.5">
		<span class="text-xs font-medium text-ui-text-muted">Background Image</span>
		<ImageDropzone
			value={canvasStore.pageBackgroundImage}
			onchange={(dataUrl) => (canvasStore.pageBackgroundImage = dataUrl)}
		/>
	</div>
</div>
<p class="text-xs text-ui-text-muted">
	Select a component on the canvas to edit its own properties.
</p>
