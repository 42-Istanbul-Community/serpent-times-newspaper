<script lang="ts">
	import { autofocus } from '$lib/utils/autofocus';
	import { paperState } from '../paper-state.svelte';
</script>

<input
	bind:value={paperState.editingValue}
	onblur={() => paperState.commitRename()}
	onkeydown={(event) => {
		if (event.key === 'Enter') paperState.commitRename();
		else if (event.key === 'Escape') paperState.cancelRename();
	}}
	use:autofocus
	class="min-w-0 flex-1 rounded border border-slytherin bg-ui-surface px-1 py-0.5 text-sm text-ui-text-main outline-none"
/>
