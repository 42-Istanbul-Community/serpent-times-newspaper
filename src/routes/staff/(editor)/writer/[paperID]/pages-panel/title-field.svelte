<script lang="ts">
	import { Label } from 'bits-ui';
	import { paperState } from '../paper-state.svelte';
</script>

<div class="flex flex-col gap-1.5">
	<Label.Root for="paper-title" class="text-xs font-medium text-ui-text-muted">Title</Label.Root>
	<input
		id="paper-title"
		bind:value={paperState.title}
		class="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin"
	/>
</div>
