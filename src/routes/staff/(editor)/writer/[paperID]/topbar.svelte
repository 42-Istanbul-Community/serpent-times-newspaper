<script lang="ts">
	import { page } from '$app/state';
	import { CheckCircle2, Loader2 } from '@lucide/svelte';
	import { paperSync } from './paper-sync.svelte';

	let paperID = $derived(Number(page.params.paperID));
	let isPublished = $derived(paperSync.status !== 'draft');
</script>

<header
	class="flex h-14 shrink-0 items-center justify-between border-b border-paper-rule bg-paper-surface px-4"
>
	<div class="flex items-center gap-3">
		<span class="text-sm font-medium text-paper-ink">Writer</span>
	</div>
	<div class="flex items-center gap-3">
		{@render savingIndicator()}
		{@render publishButton()}
	</div>
</header>

{#snippet savingIndicator()}
	<span class="flex items-center gap-1.5 text-xs text-ui-text-muted">
		{#if paperSync.saving}
			<Loader2 class="h-3.5 w-3.5 animate-spin" />
			Saving…
		{:else}
			<CheckCircle2 class="h-3.5 w-3.5 text-slytherin" />
			Saved
		{/if}
	</span>
{/snippet}

{#snippet publishButton()}
	<button
		type="button"
		disabled={isPublished || paperSync.saving}
		onclick={() => paperSync.publish(paperID)}
		class="flex items-center gap-1.5 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
	>
		<CheckCircle2 class="h-4 w-4" />
		{isPublished ? 'Published' : 'Publish'}
	</button>
{/snippet}
