<script lang="ts">
	import PageView from '$lib/page-render/page-view.svelte';
	import type { EditionContent } from '$lib/server/edition-content';

	// pages are laid out at their fixed design size (720x960, see
	// page-view.svelte) and the whole box is scaled to whatever width the
	// reader has - scaling rather than reflowing is the point, a newspaper
	// page is a fixed composition.
	const PAGE_WIDTH = 720;
	const PAGE_HEIGHT = 960;

	let { content, userNames }: { content: EditionContent; userNames: Record<string, string> } =
		$props();

	let columnWidth = $state(PAGE_WIDTH);
	let scale = $derived(Math.min(1, columnWidth / PAGE_WIDTH));
</script>

<div class="h-full overflow-y-auto px-2 py-4">
	<div class="mx-auto flex max-w-3xl flex-col items-center gap-6" bind:clientWidth={columnWidth}>
		{#each content.pages as page (page.key)}
			<!-- a scaled element still occupies its unscaled box in flow, so the
			     wrapper carries the scaled height explicitly. -->
			<div class="page-frame w-full overflow-hidden" style="height: {PAGE_HEIGHT * scale}px;">
				<div
					class="page-scale origin-top-left"
					style="transform: scale({scale}); width: {PAGE_WIDTH}px;"
				>
					<PageView
						role={page.role}
						pageNumber={page.pageNumber}
						nodes={page.nodes}
						slotValues={page.slotValues}
						tocEntries={content.tocEntries}
						credits={content.credits}
						{userNames}
					/>
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	/* a reader hitting Cmd+P should get the sheets at their real size - the
	   fit-to-viewport scaling is a screen concern only. (The downloadable PDF
	   is baked from /print/newspaper/<id> instead, see $lib/server/pdf.ts.) */
	@media print {
		.page-frame {
			height: auto !important;
			overflow: visible !important;
		}
		.page-scale {
			transform: none !important;
		}
	}
</style>
