<script lang="ts">
	import { page } from '$app/state';
	import PageRenderer from './page-renderer/page-renderer.svelte';
	import { editionState } from './edition-state.svelte';
	import { editionSync } from './edition-sync.svelte';
	import * as articleRowSync from './article-row-sync';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		editionSync.hydrate(
			data.edition,
			data.articles,
			data.templates,
			data.pickableCover,
			data.pickableIndex,
			data.pickableCitation,
			data.availablePapers
		);
		// seed article-row-sync so the post-hydrate effect tick isn't
		// mistaken for a real slotValues edit.
		for (const articleRow of data.articles) {
			if (articleRow.category === 'cover' || articleRow.category === 'index') {
				articleRowSync.seed(articleRow.id, articleRow.pages);
			}
		}
	});

	// autosave the edition row itself (title/coverArticleId/index.../citation.../articleIds).
	$effect(() => {
		if (editionState.editionId === null) return;
		JSON.stringify([
			editionState.indexArticleIds,
			editionState.citationArticleIds,
			editionState.articleIds
		]);
		editionSync.track(
			editionState.editionId,
			editionState.title,
			editionState.coverArticleId,
			editionState.indexArticleIds,
			editionState.citationArticleIds,
			editionState.articleIds
		);
	});

	// separate concern: autosave cover/index slotValues edits against their
	// own article rows (a different endpoint from the edition row above).
	// Body papers and citation articles are never mutated from this editor,
	// so they're never tracked here.
	$effect(() => {
		if (editionState.coverArticleId !== null) {
			const row = editionState.articles[editionState.coverArticleId];
			if (row) {
				JSON.stringify(row.pages);
				articleRowSync.track(row.id, row.pages);
			}
		}
		for (const id of editionState.indexArticleIds) {
			const row = editionState.articles[id];
			if (row) {
				JSON.stringify(row.pages);
				articleRowSync.track(row.id, row.pages);
			}
		}
	});
</script>

{#if data.pdfUrl}
	{@render uploadedPdf(data.pdfUrl)}
{:else if editionState.assembledPages.length > 0 && editionState.editionId !== null}
	{@render pageStack()}
{:else}
	{@render emptyState()}
{/if}

{#snippet uploadedPdf(src: string)}
	<!-- read-only by construction: an uploaded edition's pages are a finished
	     PDF, so the editor shows the file rather than an assembly it can't
	     offer. Renaming and publishing live in the panel/topbar. -->
	<iframe {src} title="{data.edition.title} (PDF)" class="h-full w-full bg-paper-bg"></iframe>
{/snippet}

{#snippet pageStack()}
	<!-- every page stacked top-to-bottom, same "see the whole thing at a
	     glance" layout as the writer's own stacked page view. -->
	<div
		class="pdf-stack flex flex-col items-center gap-8 py-8 print:gap-0 print:py-0"
		style="--pdf-page-count: {editionState.assembledPages.length};"
	>
		{#each editionState.assembledPages as entry (entry.page.id)}
			{@const template = editionState.templates.find((t) => t.id === entry.page.pageTemplateId)}
			{#if template}
				<PageRenderer
					role={entry.role}
					pageNumber={entry.pageNumber}
					userNames={page.data.userNames}
					tocEntries={editionState.paperTocEntries}
					articleId={entry.articleId}
					pageId={entry.page.id}
					nodes={template.elements}
					slotValues={entry.page.slotValues}
					onSlotChange={(elementId, value) =>
						editionState.updateSlot(entry.articleId, elementId, value)}
				/>
			{/if}
		{/each}
	</div>
{/snippet}

{#snippet emptyState()}
	<div class="flex h-full items-center justify-center text-sm text-ui-text-muted">
		Add a cover, index, paper, or citation from the left panel to get started.
	</div>
{/snippet}

<style>
	/* Hard-clamps the printed content to exactly N * 960px (960px = one
	   .pdf-page, see page-renderer/page-renderer.svelte). Without this, any
	   stray sub-pixel layout drift across N stacked pages is enough for
	   Chromium's print pagination to allocate a whole extra (near-empty,
	   dark-UA-background) trailing page - clip it away instead of chasing
	   the exact source of the drift. */
	@media print {
		.pdf-stack {
			height: calc(var(--pdf-page-count) * 960px);
			overflow: hidden;
		}
	}
</style>
