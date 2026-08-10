<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Cropper from 'svelte-easy-crop';
	import type { OnCropCompleteEvent, Point } from 'svelte-easy-crop';
	import { Crop, Check, X, ZoomIn, ZoomOut } from '@lucide/svelte';

	let {
		open = $bindable(false),
		imageSrc,
		aspect = 4 / 3,
		onCropSave
	}: {
		open: boolean;
		imageSrc: string;
		aspect?: number;
		onCropSave: (croppedBlob: Blob) => Promise<void>;
	} = $props();

	let crop = $state<Point>({ x: 0, y: 0 });
	let zoom = $state(1);
	let croppedPixels = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let isSaving = $state(false);

	function handleCropComplete(event: OnCropCompleteEvent) {
		croppedPixels = event.pixels;
	}

	async function getCroppedImageBlob(
		src: string,
		pixelCrop: { x: number; y: number; width: number; height: number }
	): Promise<Blob> {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.src = src;
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});

		const canvas = document.createElement('canvas');
		canvas.width = pixelCrop.width;
		canvas.height = pixelCrop.height;
		const ctx = canvas.getContext('2d');

		if (!ctx) throw new Error('Could not get canvas context');

		ctx.drawImage(
			img,
			pixelCrop.x,
			pixelCrop.y,
			pixelCrop.width,
			pixelCrop.height,
			0,
			0,
			pixelCrop.width,
			pixelCrop.height
		);

		return new Promise((resolve, reject) => {
			canvas.toBlob(
				(blob) => {
					if (blob) resolve(blob);
					else reject(new Error('Canvas to Blob failed'));
				},
				'image/jpeg',
				0.95
			);
		});
	}

	async function handleSave() {
		if (!croppedPixels || isSaving) return;
		isSaving = true;
		try {
			const blob = await getCroppedImageBlob(imageSrc, croppedPixels);
			await onCropSave(blob);
			open = false;
		} catch (err) {
			console.error('Failed to crop image:', err);
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[90vw] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-ui-border bg-ui-surface p-5 shadow-2xl outline-none"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-ui-border pb-3">
				<div class="flex items-center gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-slytherin/10 text-slytherin"
					>
						<Crop class="h-4 w-4" />
					</div>
					<div>
						<Dialog.Title class="text-sm font-semibold text-ui-text-main">
							Adjust Image Crop & Position
						</Dialog.Title>
						<p class="text-[11px] text-ui-text-muted">
							Drag to position, pinch or use slider to zoom
						</p>
					</div>
				</div>
				<Dialog.Close
					class="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text-main"
					aria-label="Close"
				>
					<X class="h-4 w-4" />
				</Dialog.Close>
			</div>

			<!-- Cropper Area -->
			<div class="relative mt-4 h-80 w-full overflow-hidden rounded-lg bg-black/90">
				{#if imageSrc}
					<Cropper
						image={imageSrc}
						bind:crop
						bind:zoom
						{aspect}
						oncropcomplete={handleCropComplete}
						showGrid={true}
					/>
				{/if}
			</div>

			<!-- Controls -->
			<div class="mt-4 flex flex-col gap-3">
				<div class="flex items-center gap-3">
					<ZoomOut class="h-4 w-4 shrink-0 text-ui-text-muted" />
					<input
						type="range"
						min="1"
						max="3"
						step="0.05"
						bind:value={zoom}
						class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-ui-border accent-slytherin"
					/>
					<ZoomIn class="h-4 w-4 shrink-0 text-ui-text-muted" />
					<span class="w-12 text-right font-mono text-xs text-ui-text-muted">
						{Math.round(zoom * 100)}%
					</span>
				</div>

				<!-- Actions -->
				<div class="flex items-center justify-end gap-2 border-t border-ui-border pt-3">
					<button
						type="button"
						onclick={() => (open = false)}
						class="rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-xs font-medium text-ui-text-main transition-colors hover:bg-ui-bg"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleSave}
						disabled={isSaving}
						class="hover:bg-slytherin-dark flex cursor-pointer items-center gap-1.5 rounded-lg bg-slytherin px-4 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50"
					>
						<Check class="h-4 w-4" />
						{isSaving ? 'Applying...' : 'Apply Crop'}
					</button>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
