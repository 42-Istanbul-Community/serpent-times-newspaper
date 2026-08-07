<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { CheckCircle2, EyeOff, FileDown, Loader2, RefreshCw } from '@lucide/svelte';
	import { editionSync } from './edition-sync.svelte';

	// an uploaded edition's PDF is the upload itself - there is nothing to
	// re-bake, and the endpoint refuses it (409) rather than overwrite.
	let { uploaded = false }: { uploaded?: boolean } = $props();

	let editionID = $derived(Number(page.params.editionID));
	let isPublished = $derived(editionSync.status !== 'draft');

	// re-bakes cdn/newspaper/<id>/newspaper.pdf on demand - Publish already
	// does this once, but further edits to an already-published edition
	// don't re-trigger it on their own (see the POST handler's own comment).
	let refreshing = $state(false);
	async function refreshPdf() {
		refreshing = true;
		try {
			await fetch(
				resolve('/api/newspaper-edition/[editionID]/pdf', { editionID: String(editionID) }),
				{ method: 'POST' }
			);
		} finally {
			refreshing = false;
		}
	}
</script>

<header
	class="flex h-14 shrink-0 items-center justify-between border-b border-paper-rule bg-paper-surface px-4"
>
	<div class="flex items-center gap-3">
		<span class="text-sm font-medium text-paper-ink">Newspaper</span>
	</div>
	<div class="flex items-center gap-3">
		{@render savingIndicator()}
		{@render downloadLink()}
		{#if !uploaded}
			{@render refreshButton()}
		{/if}
		{@render publishButton()}
	</div>
</header>

{#snippet savingIndicator()}
	<span class="flex items-center gap-1.5 text-xs text-ui-text-muted">
		{#if editionSync.saving}
			<Loader2 class="h-3.5 w-3.5 animate-spin" />
			Saving…
		{:else}
			<CheckCircle2 class="h-3.5 w-3.5 text-slytherin" />
			Saved
		{/if}
	</span>
{/snippet}

{#snippet downloadLink()}
	<a
		href={resolve('/api/newspaper-edition/[editionID]/pdf', { editionID: String(editionID) })}
		class="flex items-center gap-1.5 rounded-md border border-ui-border px-3 py-1.5 text-sm font-medium text-ui-text-main hover:bg-ui-bg"
	>
		<FileDown class="h-4 w-4" />
		Download PDF
	</a>
{/snippet}

{#snippet refreshButton()}
	<button
		type="button"
		disabled={refreshing}
		onclick={refreshPdf}
		class="flex items-center gap-1.5 rounded-md border border-ui-border px-3 py-1.5 text-sm font-medium text-ui-text-main hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
	>
		<RefreshCw class="h-4 w-4 {refreshing ? 'animate-spin' : ''}" />
		Refresh PDF
	</button>
{/snippet}

{#snippet publishButton()}
	{#if isPublished}
		<!-- published editions are what the homepage lists, so taking one back
		     to draft is the only way to pull it off the site again (and what
		     the dashboard's drafts-only delete needs first). -->
		<button
			type="button"
			disabled={editionSync.saving}
			onclick={() => editionSync.setStatus(editionID, 'draft')}
			class="flex items-center gap-1.5 rounded-md border border-ui-border px-3 py-1.5 text-sm font-medium text-ui-text-main hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-50"
		>
			<EyeOff class="h-4 w-4" />
			Unpublish
		</button>
	{:else}
		<button
			type="button"
			disabled={editionSync.saving}
			onclick={() => editionSync.setStatus(editionID, 'published')}
			class="flex items-center gap-1.5 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<CheckCircle2 class="h-4 w-4" />
			Publish
		</button>
	{/if}
{/snippet}
