<script lang="ts">
	import { editionState } from '../edition-state.svelte';

	let { drag, index }: { drag: (typeof editionState)['indexDrag']; index: number } = $props();
</script>

{#if drag.dropIndex === index}
	<li class="h-0.5 rounded-full bg-slytherin"></li>
{/if}
