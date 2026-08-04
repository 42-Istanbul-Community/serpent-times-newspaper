<script lang="ts">
	import { page } from '$app/state';
	import { CheckCircle2, Loader2 } from '@lucide/svelte';
	import { templateSync } from './template-sync.svelte';

	let pageID = $derived(Number(page.params.pageID));
	let isApproved = $derived(templateSync.availability !== 'draft');
</script>

<header
	class="flex h-14 shrink-0 items-center justify-between border-b border-paper-rule bg-paper-surface px-4"
>
	<div class="flex items-center gap-3">
		<span class="text-sm font-medium text-paper-ink">Page Editor</span>
	</div>
	<div class="flex items-center gap-3">
		<!-- undo / redo / zoom actions go here -->
		<span class="flex items-center gap-1.5 text-xs text-ui-text-muted">
			{#if templateSync.saving}
				<Loader2 class="h-3.5 w-3.5 animate-spin" />
				Saving…
			{:else}
				<CheckCircle2 class="h-3.5 w-3.5 text-slytherin" />
				Saved
			{/if}
		</span>
		<button
			type="button"
			disabled={isApproved || templateSync.saving}
			onclick={() => templateSync.approve(pageID)}
			class="flex items-center gap-1.5 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
		>
			<CheckCircle2 class="h-4 w-4" />
			{isApproved ? 'Approved' : 'Approve'}
		</button>
	</div>
</header>
