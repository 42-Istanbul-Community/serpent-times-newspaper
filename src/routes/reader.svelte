<script lang="ts">
	let { pageUrls }: { pageUrls: string[] } = $props();
</script>

<div class="h-full overflow-y-auto">
	<div class="mx-auto flex max-w-3xl flex-col gap-6 px-2 py-4">
		{#each pageUrls as url, i (url)}
			<!-- aspect-3/4 matches the 720x960 page, so the lazy pages below the
			     fold hold their place instead of collapsing the scrollbar. -->
			<img
				src={url}
				alt="Page {i + 1}"
				loading="lazy"
				class="aspect-3/4 w-full rounded-sm border border-paper-rule bg-canvas-paper shadow-sm"
			/>
		{/each}
	</div>
</div>
