<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import { Pencil, Trash2 } from '@lucide/svelte';
	import { paperState } from '../paper-state.svelte';
	import type { ArticlePage } from '$lib/server/db/schema/editor/article';

	let { page }: { page: ArticlePage } = $props();
</script>

<ContextMenu.Portal>
	<ContextMenu.Content
		class="min-w-36 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
	>
		<ContextMenu.Item
			onSelect={() => paperState.startRename(page)}
			class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-ui-text-main data-[highlighted]:bg-ui-bg"
		>
			<Pencil class="h-3.5 w-3.5" />
			Rename
		</ContextMenu.Item>
		<ContextMenu.Item
			onSelect={() => paperState.removePage(page.id)}
			class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-danger data-[highlighted]:bg-ui-bg"
		>
			<Trash2 class="h-3.5 w-3.5" />
			Delete
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Portal>
