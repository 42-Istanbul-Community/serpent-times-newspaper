<script lang="ts">
	import { canvasStore } from '../canvas-state.svelte';
	import { paletteItems } from './palette-items';
</script>

<div class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
	{#each paletteItems as item (item.type)}
		<button
			type="button"
			onclick={(event) => {
				canvasStore.add(item.type);
				// otherwise this button keeps keyboard focus after the click, and a
				// later Space press (e.g. to pan) re-triggers it, adding another
				// copy of the same component.
				event.currentTarget.blur();
			}}
			class="flex flex-col items-center gap-1.5 rounded-md border border-ui-border bg-ui-surface px-2 py-3 text-xs text-ui-text-main transition-colors hover:border-slytherin hover:text-slytherin"
		>
			<item.icon class="h-4 w-4" />
			{item.label}
		</button>
	{/each}
</div>
