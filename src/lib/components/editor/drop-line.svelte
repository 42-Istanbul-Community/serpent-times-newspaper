<script lang="ts">
	let { dropIndex, index }: { dropIndex: number | null; index: number } = $props();
</script>

{#if dropIndex === index}
	<li class="h-0.5 rounded-full bg-slytherin"></li>
{/if}
