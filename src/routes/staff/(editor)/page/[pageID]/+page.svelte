<script lang="ts">
	import Canvas from './canvas/canvas.svelte';
	import { canvasStore } from './canvas-state.svelte';
	import { identityState } from './template-panel/identity-state.svelte';
	import { templateSync } from './template-sync.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// re-hydrates whenever the loaded row's id changes - covers first mount
	// AND client-side pageID -> pageID navigation (this component is reused,
	// not remounted, since canvasStore/identityState are module singletons).
	$effect(() => {
		templateSync.hydrate(data.template);
	});

	// autosave: JSON.stringify forces a deep read so this re-fires on nested
	// mutations too (e.g. el.x = ...), same trick as canvas-history.ts.
	$effect(() => {
		JSON.stringify(canvasStore.nodes);
		templateSync.track(
			data.template.id,
			canvasStore.nodes,
			identityState.title,
			identityState.description,
			identityState.category,
			canvasStore.pageBackgroundColor,
			canvasStore.pageBackgroundImage
		);
	});
</script>

<Canvas />
