<script lang="ts">
	import { X } from '@lucide/svelte';
	import { editionState } from '../edition-state.svelte';
	import { removeCover } from '../edition-sync.svelte';
</script>

{#if editionState.coverArticleId === null}
	<p class="text-xs text-ui-text-muted">No cover yet.</p>
{:else}
	{@const id = editionState.coverArticleId}
	<div
		class="flex items-center gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-sm text-ui-text-main"
	>
		<span class="min-w-0 flex-1 truncate">{editionState.articles[id]?.title ?? 'Untitled'}</span>
		<button
			type="button"
			onclick={() => removeCover()}
			class="text-ui-text-muted hover:text-danger"
			aria-label="Remove cover"
		>
			<X class="h-3.5 w-3.5" />
		</button>
	</div>
{/if}
