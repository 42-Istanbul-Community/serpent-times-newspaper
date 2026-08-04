<script lang="ts">
	import PagesPanel from './pages-panel/pages-panel.svelte';
	import Topbar from './topbar.svelte';

	let { children } = $props();
</script>

<div class="flex h-full min-h-0 flex-col">
	<Topbar />
	<div class="flex min-h-0 flex-1">
		<aside class="min-h-0 w-70 shrink-0 border-r border-paper-rule bg-paper-surface">
			<PagesPanel />
		</aside>
		<main class="min-h-0 min-w-0 flex-1 overflow-auto bg-paper-bg">
			{@render children()}
		</main>
	</div>
</div>
