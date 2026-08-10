<script lang="ts">
	import { Label } from 'bits-ui';

	let {
		id,
		value = $bindable('')
	}: {
		id: string;
		value?: string;
	} = $props();
</script>

<div class="flex flex-col gap-1.5">
	<Label.Root for={id} class="text-xs font-medium text-ui-text-muted">Title</Label.Root>
	<input
		{id}
		bind:value
		class="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin"
	/>
</div>
