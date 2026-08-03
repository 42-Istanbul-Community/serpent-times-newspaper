<script lang="ts">
	import { componentSchemas } from '$lib/data/components';
	import { canvasStore } from '../canvas-state.svelte';
	import AlignmentPanel from './alignment-panel.svelte';
	import ElementProperties from './element-properties.svelte';
	import PagePanel from './page-panel.svelte';

	let selected = $derived(canvasStore.elements.find((el) => el.id === canvasStore.selectedId));
	let schema = $derived(selected ? componentSchemas[selected.type] : undefined);
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto p-4">
	<h2 class="text-sm font-semibold text-paper-ink">Properties</h2>

	{#if canvasStore.selectedIds.size > 1}
		<AlignmentPanel />
	{:else if selected && schema}
		<ElementProperties element={selected} {schema} />
	{:else}
		<PagePanel />
	{/if}
</div>
