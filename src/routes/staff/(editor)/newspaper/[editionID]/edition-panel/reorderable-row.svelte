<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import { Trash2, X } from '@lucide/svelte';
	import { editionState } from '../edition-state.svelte';

	let {
		id,
		drag,
		onRemove
	}: {
		id: number;
		drag: (typeof editionState)['indexDrag'];
		onRemove: (id: number) => void;
	} = $props();
</script>

<li
	use:drag.trackRow={id}
	class="flex items-center gap-1 transition-opacity"
	class:opacity-40={drag.draggedId === id}
>
	<ContextMenu.Root>
		<ContextMenu.Trigger
			onpointerdown={(event) => drag.armDragRow(id, event)}
			onpointermove={(event) => drag.dragRow(event)}
			onpointerup={() => drag.endDragRow()}
			onpointercancel={() => drag.endDragRow()}
			class="flex min-w-0 flex-1 cursor-grab touch-none items-center gap-2 rounded-md border border-transparent px-1.5 py-1.5 text-sm text-ui-text-main hover:bg-ui-bg active:cursor-grabbing"
		>
			<span class="min-w-0 flex-1 truncate text-left"
				>{editionState.articles[id]?.title ?? 'Untitled'}</span
			>
		</ContextMenu.Trigger>
		<ContextMenu.Portal>
			<ContextMenu.Content
				class="min-w-36 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
			>
				<ContextMenu.Item
					onSelect={() => onRemove(id)}
					class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-danger data-[highlighted]:bg-ui-bg"
				>
					<Trash2 class="h-3.5 w-3.5" />
					Delete
				</ContextMenu.Item>
			</ContextMenu.Content>
		</ContextMenu.Portal>
	</ContextMenu.Root>
	<button
		type="button"
		onclick={() => onRemove(id)}
		class="shrink-0 text-ui-text-muted hover:text-danger"
		aria-label="Delete"
	>
		<X class="h-3.5 w-3.5" />
	</button>
</li>
