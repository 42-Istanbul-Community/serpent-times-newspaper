<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import {
		Blocks,
		BringToFront,
		ChevronRight,
		Copy,
		Folder,
		Lock,
		LockOpen,
		Pencil,
		SendToBack,
		Trash2,
		Ungroup
	} from '@lucide/svelte';
	import { autofocus } from '$lib/utils/autofocus';
	import { canvasStore, type CanvasNode } from '../canvas-state.svelte';
	import { iconsByType } from './palette-items';

	// bound (arrow) field, safe to use directly as a `use:` action.
	const { trackRow } = canvasStore;
</script>

<ul class="flex flex-col gap-1">
	{@render dropLine(null, 0)}
	{#each canvasStore.nodes as node, index (node.id)}
		{@render layerRow(node, null)}
		{#if node.kind === 'group' && node.expanded}
			<li class="flex flex-col gap-1 py-1 pl-5">
				{@render dropLine(node.id, 0)}
				{#each node.children as child, childIndex (child.id)}
					{@render layerRow(child, node.id)}
					{@render dropLine(node.id, childIndex + 1)}
				{/each}
			</li>
		{/if}
		{@render dropLine(null, index + 1)}
	{/each}
</ul>

{#snippet dropLine(parentId: string | null, index: number)}
	{#if canvasStore.dropTarget?.kind === 'between' && canvasStore.dropTarget.parentId === parentId && canvasStore.dropTarget.index === index}
		<li class="h-0.5 rounded-full bg-slytherin"></li>
	{/if}
{/snippet}

{#snippet layerRow(node: CanvasNode, parentId: string | null)}
	<li
		use:trackRow={node.id}
		class="transition-opacity"
		class:opacity-40={canvasStore.draggedId === node.id}
	>
		<ContextMenu.Root>
			<ContextMenu.Trigger
				oncontextmenu={() => canvasStore.handleContextMenu(node.id)}
				onpointerdown={(event) => canvasStore.armDragRow(node.id, parentId, event)}
				onpointermove={(event) => canvasStore.dragRow(event)}
				onpointerup={() => canvasStore.endDragRow()}
				onpointercancel={() => canvasStore.endDragRow()}
				class="flex touch-none items-center gap-1 rounded-md border px-1.5 py-1.5 text-sm transition-colors {canvasStore.selectedIds.has(
					node.id
				)
					? 'border-slytherin bg-slytherin/10 text-slytherin'
					: 'border-transparent text-ui-text-main hover:bg-ui-bg'} {canvasStore.editingId ===
				node.id
					? ''
					: 'cursor-grab active:cursor-grabbing'} {canvasStore.dropTarget?.kind === 'into' &&
				canvasStore.dropTarget.groupId === node.id
					? 'ring-2 ring-slytherin'
					: ''}"
			>
				{#if node.kind === 'group'}
					<button
						type="button"
						aria-label={node.expanded ? 'Collapse group' : 'Expand group'}
						onclick={() => (node.expanded = !node.expanded)}
						class="shrink-0 text-ui-text-muted hover:text-ui-text-main"
					>
						<ChevronRight
							class="h-3.5 w-3.5 transition-transform {node.expanded ? 'rotate-90' : ''}"
						/>
					</button>
				{/if}

				{#if canvasStore.editingId === node.id}
					<div class="flex min-w-0 flex-1 items-center gap-2">
						{#if node.kind === 'group'}
							<Folder class="h-4 w-4 shrink-0" />
						{:else}
							{@const Icon = iconsByType[node.type]}
							<Icon class="h-4 w-4 shrink-0" />
						{/if}
						<input
							bind:value={canvasStore.editingValue}
							onblur={() => canvasStore.commitRename()}
							onkeydown={(event) => {
								if (event.key === 'Enter') canvasStore.commitRename();
								else if (event.key === 'Escape') canvasStore.cancelRename();
							}}
							use:autofocus
							class="min-w-0 flex-1 rounded border border-slytherin bg-ui-surface px-1 py-0.5 text-sm text-ui-text-main outline-none"
						/>
					</div>
				{:else}
					<button
						type="button"
						onclick={(event) => canvasStore.handleSelect(node.id, event)}
						ondblclick={() => canvasStore.startRename(node)}
						class="flex min-w-0 flex-1 items-center gap-2 text-left"
					>
						{#if node.kind === 'group'}
							<Folder class="h-4 w-4 shrink-0" />
						{:else}
							{@const Icon = iconsByType[node.type]}
							<Icon class="h-4 w-4 shrink-0" />
						{/if}
						<span class="min-w-0 flex-1 truncate">{node.label}</span>
					</button>
				{/if}

				{#if node.kind === 'element'}
					<button
						type="button"
						aria-label={node.locked ? 'Unlock' : 'Lock'}
						onclick={() => canvasStore.toggleLockOne(node.id)}
						class="shrink-0 text-ui-text-muted hover:text-ui-text-main"
					>
						{#if node.locked}
							<Lock class="h-3.5 w-3.5" />
						{:else}
							<LockOpen class="h-3.5 w-3.5" />
						{/if}
					</button>
				{/if}
			</ContextMenu.Trigger>

			<ContextMenu.Portal>
				<ContextMenu.Content
					class="min-w-40 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
				>
					{@render menuItem(Pencil, 'Rename', () => canvasStore.startRename(node))}
					{@render menuItem(Copy, 'Duplicate', () => canvasStore.duplicateSelected())}
					{#if node.kind === 'element'}
						{@render menuItem(node.locked ? LockOpen : Lock, node.locked ? 'Unlock' : 'Lock', () =>
							canvasStore.toggleLockSelected()
						)}
					{/if}
					{@render menuItem(Trash2, 'Delete', () => canvasStore.removeSelected(), { danger: true })}
					<ContextMenu.Separator class="my-1 h-px bg-ui-border" />
					{#if node.kind === 'group'}
						{@render menuItem(Ungroup, 'Ungroup', () => canvasStore.ungroupSelected())}
					{:else}
						{@render menuItem(Blocks, 'Group', () => canvasStore.groupSelected(), {
							disabled: !canvasStore.canGroup
						})}
					{/if}
					{@render menuItem(BringToFront, 'Bring to Front', () => canvasStore.bringToFront())}
					{@render menuItem(SendToBack, 'Send to Back', () => canvasStore.sendToBack())}
				</ContextMenu.Content>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	</li>
{/snippet}

{#snippet menuItem(
	Icon: typeof Pencil,
	label: string,
	onSelect: () => void,
	opts?: { danger?: boolean; disabled?: boolean }
)}
	<ContextMenu.Item
		{onSelect}
		disabled={opts?.disabled}
		class="flex items-center gap-2 rounded px-2 py-1.5 text-sm data-[highlighted]:bg-ui-bg {opts?.danger
			? 'text-danger'
			: 'text-ui-text-main'} {opts?.disabled
			? 'data-[disabled]:pointer-events-none data-[disabled]:opacity-40'
			: ''}"
	>
		<Icon class="h-3.5 w-3.5" />
		{label}
	</ContextMenu.Item>
{/snippet}
