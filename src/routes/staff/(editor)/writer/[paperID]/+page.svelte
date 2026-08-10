<script lang="ts">
	import PageRenderer from './page-renderer/page-renderer.svelte';
	import { paperState } from './paper-state.svelte';
	import { paperSync } from './paper-sync.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// re-hydrates whenever the loaded row's id changes - covers first mount
	// AND client-side paperID -> paperID navigation (this component is
	// reused, not remounted, since paperState/paperSync are module singletons).
	$effect(() => {
		paperSync.hydrate(data.article, data.templates, data.pickableTemplates, data.authors);
	});

	// autosave: JSON.stringify forces a deep read so this re-fires on nested
	// mutations too (e.g. a slot value edit), same trick as canvas.svelte's
	// own autosave effect.
	$effect(() => {
		if (paperState.articleId === null) return;
		JSON.stringify(paperState.pages);
		paperSync.track(paperState.articleId, paperState.title, paperState.pages);
	});
</script>

{#if paperState.pages.length > 0 && paperState.articleId !== null}
	{@render pageStack(paperState.articleId)}
{:else}
	{@render emptyState()}
{/if}

{#snippet pageStack(articleId: number)}
	<!-- every page stacked top-to-bottom, so the whole paper is visible (and
	     grows downward as pages are added) at a glance, instead of switching
	     between pages one at a time. -->
	<div class="flex flex-col items-center gap-8 py-8">
		{#each paperState.pages as page (page.id)}
			{@const template = paperState.templates.find((t) => t.id === page.pageTemplateId)}
			{#if template}
				<PageRenderer
					{articleId}
					pageId={page.id}
					nodes={template.elements}
					slotValues={page.slotValues}
					backgroundColor={template.backgroundColor}
					backgroundImage={template.backgroundImage ?? ''}
					onSlotChange={(elementId, value) => paperState.updateSlot(page.id, elementId, value)}
				/>
			{/if}
		{/each}
	</div>
{/snippet}

{#snippet emptyState()}
	<div class="flex h-full items-center justify-center text-sm text-ui-text-muted">
		Add a page from the left panel to get started.
	</div>
{/snippet}
