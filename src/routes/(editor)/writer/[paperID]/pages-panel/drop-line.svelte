<script lang="ts">
	import { paperState } from '../paper-state.svelte';

	let { index }: { index: number } = $props();
</script>

{#if paperState.dropIndex === index}
	<li class="h-0.5 rounded-full bg-slytherin"></li>
{/if}
