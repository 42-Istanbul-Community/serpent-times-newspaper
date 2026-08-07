<script lang="ts">
	import PageView from '$lib/page-render/page-view.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<!-- Nothing but the pages, at their real 720x960 size: Chromium prints this
     one PDF page per .pdf-page (see page-view.svelte's print CSS). The
     .pdf-stack height clamp hard-limits the printed content to exactly
     N * 960px - without it, sub-pixel layout drift across N stacked pages is
     enough for print pagination to allocate a whole extra near-empty
     trailing page. -->
<div
	class="pdf-stack flex flex-col items-center gap-8 py-8 print:gap-0 print:py-0"
	style="--pdf-page-count: {data.content.pages.length};"
>
	{#each data.content.pages as page (page.key)}
		<PageView
			role={page.role}
			pageNumber={page.pageNumber}
			nodes={page.nodes}
			slotValues={page.slotValues}
			tocEntries={data.content.tocEntries}
			credits={data.content.credits}
			userNames={data.userNames}
		/>
	{/each}
</div>

<style>
	@media print {
		.pdf-stack {
			height: calc(var(--pdf-page-count) * 960px);
			overflow: hidden;
		}
	}
</style>
