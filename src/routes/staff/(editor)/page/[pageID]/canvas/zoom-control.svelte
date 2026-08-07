<script lang="ts">
	let {
		zoom,
		onZoomOut,
		onZoomIn,
		onReset
	}: { zoom: number; onZoomOut: () => void; onZoomIn: () => void; onReset: () => void } = $props();
</script>

<div
	class="absolute right-4 bottom-4 flex items-center gap-1 rounded-md border border-ui-border bg-ui-surface px-1 py-1 text-xs text-ui-text-main shadow-sm"
>
	<button type="button" onclick={onZoomOut} class="rounded px-2 py-1 hover:bg-ui-bg">−</button>
	<button
		type="button"
		onclick={onReset}
		class="min-w-12 rounded px-2 py-1 text-center hover:bg-ui-bg"
	>
		{Math.round(zoom * 100)}%
	</button>
	<button type="button" onclick={onZoomIn} class="rounded px-2 py-1 hover:bg-ui-bg">+</button>
</div>
