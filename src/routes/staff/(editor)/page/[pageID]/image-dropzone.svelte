<script lang="ts">
	import { ImagePlus } from '@lucide/svelte';
	import { uploadImage } from './upload-image';

	let {
		value,
		onchange,
		class: sizeClass = 'h-24',
		upload = uploadImage
	}: {
		value: string;
		onchange: (url: string) => void;
		class?: string;
		// where the file actually goes - defaults to the page-designer's own
		// CDN bucket. Other callers (e.g. the writer) inject their own
		// uploader to land files under a different bucket/path.
		upload?: (file: File) => Promise<string>;
	} = $props();

	let isDraggingOver = $state(false);
	let isUploading = $state(false);
	let fileInput: HTMLInputElement;

	async function handleFiles(files: FileList | null | undefined) {
		const file = files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		isUploading = true;
		try {
			onchange(await upload(file));
		} catch (err) {
			console.error(err);
		} finally {
			isUploading = false;
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={() => !isUploading && fileInput.click()}
	onkeydown={(event) => {
		if (!isUploading && (event.key === 'Enter' || event.key === ' ')) {
			event.preventDefault();
			fileInput.click();
		}
	}}
	ondragover={(event) => {
		event.preventDefault();
		isDraggingOver = true;
	}}
	ondragleave={() => (isDraggingOver = false)}
	ondrop={(event) => {
		event.preventDefault();
		isDraggingOver = false;
		handleFiles(event.dataTransfer?.files);
	}}
	class="flex {sizeClass} cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed {isDraggingOver
		? 'border-slytherin bg-slytherin/10'
		: 'border-ui-border bg-ui-surface'}"
>
	{#if isUploading}
		<span class="text-xs text-ui-text-muted">Uploading…</span>
	{:else if value}
		<img src={value} alt="" class="h-full w-full object-cover" />
	{:else}
		<ImagePlus class="h-4 w-4 text-ui-text-muted" />
		<span class="text-center text-xs text-ui-text-muted">Click or drop an image</span>
	{/if}
</div>
<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	class="hidden"
	onchange={(event) => handleFiles(event.currentTarget.files)}
/>
