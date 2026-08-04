<script lang="ts">
	import { Label } from 'bits-ui';
	import { editionState } from '../edition-state.svelte';
</script>

<div class="flex flex-col gap-1.5">
	<Label.Root for="edition-title" class="text-xs font-medium text-ui-text-muted">Title</Label.Root>
	<input
		id="edition-title"
		bind:value={editionState.title}
		class="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin"
	/>
</div>
