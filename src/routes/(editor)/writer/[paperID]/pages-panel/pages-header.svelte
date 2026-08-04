<script lang="ts">
	import { Plus } from '@lucide/svelte';

	let { onAdd }: { onAdd: () => void } = $props();
</script>

<div class="flex items-center justify-between">
	<span class="text-xs font-medium tracking-wide text-ui-text-muted uppercase">Pages</span>
	<button
		type="button"
		onclick={onAdd}
		class="flex items-center gap-1 rounded-md border border-ui-border bg-ui-surface px-2 py-1 text-xs font-medium text-ui-text-main hover:bg-ui-bg"
	>
		<Plus class="h-3.5 w-3.5" />
		Add
	</button>
</div>
