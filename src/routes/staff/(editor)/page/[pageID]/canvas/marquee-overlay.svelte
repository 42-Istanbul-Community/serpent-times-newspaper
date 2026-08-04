<script lang="ts">
	let { rect }: { rect: { left: number; top: number; width: number; height: number } } = $props();
</script>

<!-- fixed = raw client coordinates, deliberately outside the zoomed/panned
     paper so no transform math is needed to draw it. -->
<div
	class="pointer-events-none fixed border border-slytherin bg-slytherin/10"
	style="left: {rect.left}px; top: {rect.top}px; width: {rect.width}px; height: {rect.height}px; z-index: 50;"
></div>
