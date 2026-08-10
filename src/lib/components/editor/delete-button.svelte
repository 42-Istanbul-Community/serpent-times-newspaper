<script lang="ts">
	import { enhance } from '$app/forms';
	import { Trash2 } from '@lucide/svelte';

	// the small "x" on a draft card in each list dashboard (templates,
	// papers, editions) - posts to the current route's own `?/delete`
	// action, which is why this only takes an id/title and never the action
	// url itself.
	let { id, title }: { id: number; title: string } = $props();
</script>

<form method="POST" action="?/delete" use:enhance class="absolute top-3.5 right-3.5 z-10">
	<input type="hidden" name="id" value={id} />
	<button
		type="submit"
		aria-label="Delete {title}"
		onclick={(e) => {
			if (!confirm(`Delete "${title}"? This can't be undone.`)) e.preventDefault();
		}}
		class="rounded-md bg-ui-surface/90 p-1 text-ui-text-muted shadow-sm transition-colors hover:text-danger"
	>
		<Trash2 class="h-4 w-4" />
	</button>
</form>
