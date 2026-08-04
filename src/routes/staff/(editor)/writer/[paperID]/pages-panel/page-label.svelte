<script lang="ts">
	import { paperState } from '../paper-state.svelte';
	import type { ArticlePage } from '$lib/server/db/schema/editor/article';

	let { page }: { page: ArticlePage } = $props();
</script>

<button
	type="button"
	onclick={() => {
		paperState.selectPage(page.id);
		// all pages render stacked in the main area now - jump to
		// this one instead of just marking it "selected".
		paperState.pageRendererEls.get(page.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}}
	ondblclick={() => paperState.startRename(page)}
	class="min-w-0 flex-1 truncate text-left"
>
	{page.label}
</button>
