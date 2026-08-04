<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import { paperState } from '../paper-state.svelte';
	import type { ArticlePage } from '$lib/server/db/schema/editor/article';
	import RenameInput from './rename-input.svelte';
	import PageLabel from './page-label.svelte';
	import PageMenu from './page-menu.svelte';

	let { page }: { page: ArticlePage } = $props();

	// bound (arrow) field, safe to use directly as a `use:` action.
	const { trackRow } = paperState;
</script>

<li
	use:trackRow={page.id}
	class="transition-opacity"
	class:opacity-40={paperState.draggedId === page.id}
>
	<ContextMenu.Root>
		<ContextMenu.Trigger
			onpointerdown={(event) => paperState.armDragRow(page.id, event)}
			onpointermove={(event) => paperState.dragRow(event)}
			onpointerup={() => paperState.endDragRow()}
			onpointercancel={() => paperState.endDragRow()}
			class="flex touch-none items-center gap-2 rounded-md border px-1.5 py-1.5 text-sm transition-colors {paperState.activePageId ===
			page.id
				? 'border-slytherin bg-slytherin/10 text-slytherin'
				: 'border-transparent text-ui-text-main hover:bg-ui-bg'} {paperState.editingId === page.id
				? ''
				: 'cursor-grab active:cursor-grabbing'}"
		>
			{#if paperState.editingId === page.id}
				<RenameInput />
			{:else}
				<PageLabel {page} />
			{/if}
		</ContextMenu.Trigger>

		<PageMenu {page} />
	</ContextMenu.Root>
</li>
