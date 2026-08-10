<script lang="ts">
	import { ImagePlus, Crop, Upload, Trash2 } from '@lucide/svelte';
	import { uploadImage } from './upload-image';
	import CropperModal from './cropper-modal.svelte';

	let {
		value,
		onchange,
		class: sizeClass = 'h-24',
		aspect = 4 / 3,
		upload = uploadImage
	}: {
		value: string;
		onchange: (url: string) => void;
		class?: string;
		aspect?: number;
		upload?: (file: File) => Promise<string>;
	} = $props();

	let isDraggingOver = $state(false);
	let isUploading = $state(false);
	let isCropperOpen = $state(false);
	let objectFit = $state<'cover' | 'contain' | 'fill'>('cover');
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

	async function handleCropSave(blob: Blob) {
		isUploading = true;
		try {
			const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
			onchange(await upload(file));
		} catch (err) {
			console.error('Failed to save cropped image:', err);
		} finally {
			isUploading = false;
		}
	}
</script>

<div
	role="group"
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
	class="group relative flex {sizeClass} flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed {isDraggingOver
		? 'border-slytherin bg-slytherin/10'
		: 'border-ui-border bg-ui-surface'}"
>
	{#if isUploading}
		<span class="text-xs text-ui-text-muted">Processing image…</span>
	{:else if value}
		<img src={value} alt="" class="h-full w-full" style="object-fit: {objectFit};" />
		<!-- Overlay controls -->
		<div
			class="absolute inset-0 flex flex-wrap items-center justify-center gap-1.5 bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100"
		>
			<!-- Fit Mode Button Group -->
			<div class="flex items-center rounded border border-white/20 bg-black/60 p-0.5 shadow">
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						objectFit = 'cover';
					}}
					class="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors {objectFit ===
					'cover'
						? 'bg-slytherin text-white'
						: 'text-white/70 hover:text-white'}"
					title="Cover (Fill & Crop)"
				>
					Cover
				</button>
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						objectFit = 'contain';
					}}
					class="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors {objectFit ===
					'contain'
						? 'bg-slytherin text-white'
						: 'text-white/70 hover:text-white'}"
					title="Contain (Fit inside)"
				>
					Contain
				</button>
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						objectFit = 'fill';
					}}
					class="cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors {objectFit ===
					'fill'
						? 'bg-slytherin text-white'
						: 'text-white/70 hover:text-white'}"
					title="Fill (Stretch to fit)"
				>
					Fill
				</button>
			</div>

			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						isCropperOpen = true;
					}}
					class="hover:bg-slytherin-dark flex cursor-pointer items-center gap-1 rounded bg-slytherin px-2 py-1 text-[11px] font-medium text-white shadow transition-colors"
					title="Crop & Adjust Position"
				>
					<Crop class="h-3.5 w-3.5" />
					Crop
				</button>
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						fileInput.click();
					}}
					class="cursor-pointer rounded bg-white/90 p-1 text-ui-text-main shadow transition-colors hover:bg-white"
					title="Change Image"
				>
					<Upload class="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						onchange('');
					}}
					class="cursor-pointer rounded bg-red-500/90 p-1 text-white shadow transition-colors hover:bg-red-600"
					title="Remove Image"
				>
					<Trash2 class="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	{:else}
		<button
			type="button"
			onclick={() => !isUploading && fileInput.click()}
			class="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1"
		>
			<ImagePlus class="h-4 w-4 text-ui-text-muted" />
			<span class="text-center text-xs text-ui-text-muted">Click or drop an image</span>
		</button>
	{/if}
</div>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	class="hidden"
	onchange={(event) => handleFiles(event.currentTarget.files)}
/>

{#if value}
	<CropperModal bind:open={isCropperOpen} imageSrc={value} {aspect} onCropSave={handleCropSave} />
{/if}
