<script lang="ts">
	import EditionPanel from './edition-panel/edition-panel.svelte';
	import UploadedPanel from './edition-panel/uploaded-panel.svelte';
	import Topbar from './topbar.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// an uploaded back-issue has no articles or templates to assemble, so the
	// editor opens as metadata-only: rename and publish, nothing that would
	// pretend the PDF's own pages are editable.
	let uploaded = $derived(data.kind === 'pdf');
</script>

<div class="flex h-full min-h-0 flex-col print:block print:h-auto">
	<div class="print:hidden">
		<Topbar {uploaded} />
	</div>
	<div class="flex min-h-0 flex-1 print:block">
		<aside class="min-h-0 w-70 shrink-0 border-r border-paper-rule bg-paper-surface print:hidden">
			{#if uploaded}
				<UploadedPanel />
			{:else}
				<EditionPanel />
			{/if}
		</aside>
		<!-- print:overflow-visible - Chromium's print pass paginates via CSS
		     break-after (see page-view.svelte's .pdf-page), it doesn't need
		     (and shouldn't have) a scroll container clipping anything. -->
		<main
			class="min-h-0 min-w-0 flex-1 overflow-auto bg-paper-bg print:overflow-visible print:bg-white"
		>
			{@render children()}
		</main>
	</div>
</div>
