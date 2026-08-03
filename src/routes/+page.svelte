<script lang="ts">
	import { onMount } from 'svelte';
	import { Newspaper } from '@lucide/svelte';
	import { homepageNav } from './homepage-nav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type EditionSummary = (typeof data.editions)[number];

	// touches browser-only APIs (Canvas, WASM) - static import would crash SSR.
	let PDFViewer = $state<typeof import('@embedpdf/svelte-pdf-viewer').PDFViewer>();
	let ZoomMode = $state<typeof import('@embedpdf/svelte-pdf-viewer').ZoomMode>();
	onMount(async () => {
		const mod = await import('@embedpdf/svelte-pdf-viewer');
		PDFViewer = mod.PDFViewer;
		ZoomMode = mod.ZoomMode;
	});

	const disabledCategories = [
		'annotation',
		'form',
		'redaction',
		'document',
		'panel',
		'tools',
		'history',
		'insert',
		'security'
	];

	$effect(() => {
		homepageNav.editions = data.editions;
		return () => {
			homepageNav.editions = [];
			homepageNav.selectedId = null;
		};
	});

	let selectedEdition = $derived(
		data.editions.find((e) => e.id === homepageNav.selectedId) ?? data.editions[0] ?? null
	);
	let pdfUrl = $derived(
		selectedEdition ? `/api/cdn/newspaper/${selectedEdition.id}/newspaper.pdf` : null
	);
</script>

<div class="mx-auto flex max-w-7xl flex-col gap-4 md:grid md:h-full md:grid-cols-12 md:gap-6">
	<div class="h-full shrink-0 md:col-span-10 md:h-full md:min-h-0">
		{#if pdfUrl}
			{@render viewer(pdfUrl)}
		{:else}
			{@render emptyState()}
		{/if}
	</div>

	<aside class="hidden flex-col gap-3 overflow-y-auto md:col-span-2 md:flex">
		{#each data.editions as edition (edition.id)}
			{@render editionCard(edition)}
		{:else}
			<p class="text-xs text-ui-text-muted">No editions yet.</p>
		{/each}
	</aside>
</div>

{#snippet viewer(src: string)}
	{#if PDFViewer && ZoomMode}
		{#key selectedEdition?.id}
			<PDFViewer
				config={{ src, disabledCategories, zoom: { defaultZoomLevel: ZoomMode.FitPage } }}
				style="width: 100%; height: 100%;"
			/>
		{/key}
	{/if}
{/snippet}

{#snippet emptyState()}
	<div
		class="flex h-full items-center justify-center rounded-md border border-dashed border-paper-rule text-sm text-ui-text-muted"
	>
		No newspaper published yet.
	</div>
{/snippet}

{#snippet editionCard(edition: EditionSummary)}
	<button
		type="button"
		onclick={() => (homepageNav.selectedId = edition.id)}
		class="flex flex-col gap-1.5 rounded-md border p-1.5 text-left transition-colors {selectedEdition?.id ===
		edition.id
			? 'border-slytherin bg-slytherin/10'
			: 'border-transparent hover:border-paper-rule'}"
	>
		<div
			class="flex aspect-3/4 items-center justify-center overflow-hidden rounded border border-ui-border bg-ui-bg text-ui-text-muted {edition.cdnUrl
				? ''
				: 'border-dashed'}"
		>
			{#if edition.cdnUrl}
				<img src={edition.cdnUrl} alt="" class="h-full w-full object-cover" />
			{:else}
				<Newspaper class="h-5 w-5" />
			{/if}
		</div>
		<span class="truncate text-xs font-medium text-paper-ink">{edition.title}</span>
	</button>
{/snippet}
