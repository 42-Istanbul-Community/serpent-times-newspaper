<script lang="ts">
	import { editionState } from '../edition-state.svelte';
	import DropLine from './drop-line.svelte';
	import ReorderableRow from './reorderable-row.svelte';

	let {
		ids,
		drag,
		onRemove
	}: {
		ids: number[];
		drag: (typeof editionState)['indexDrag'];
		onRemove: (id: number) => void;
	} = $props();
</script>

<ul class="flex flex-col gap-1">
	<DropLine {drag} index={0} />
	{#each ids as id, index (id)}
		<ReorderableRow {id} {drag} {onRemove} />
		<DropLine {drag} index={index + 1} />
	{/each}
	{#if ids.length === 0}
		<li class="text-xs text-ui-text-muted">Nothing here yet.</li>
	{/if}
</ul>
