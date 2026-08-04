<script lang="ts">
	import { ContextMenu } from 'bits-ui';
	import type { SvelteMap } from 'svelte/reactivity';
	import {
		AlignCenterHorizontal,
		AlignCenterVertical,
		AlignEndHorizontal,
		AlignEndVertical,
		AlignHorizontalDistributeCenter,
		AlignStartHorizontal,
		AlignStartVertical,
		AlignVerticalDistributeCenter,
		BringToFront,
		Copy,
		Lock,
		LockOpen,
		SendToBack,
		Trash2
	} from '@lucide/svelte';
	import { canvasStore, type CanvasElement } from '../canvas-state.svelte';
	import { uploadImage } from '../upload-image';
	import { boxAppearanceStyle, textBoxStyle, verticalAlignClass } from './element-style';

	let { el, targetEls }: { el: CanvasElement; targetEls: SvelteMap<string, HTMLDivElement> } =
		$props();

	// registers this element's DOM node into the parent's shared targetEls
	// map (read by canvas.svelte's Moveable effects) - an action instead of
	// `bind:this` since that div now lives in this child component, not the
	// parent that owns the map. It has to be a reactive SvelteMap (not a
	// plain object): this registration can land after a Moveable effect has
	// already run and bailed out on a not-yet-registered target, and only a
	// reactive read makes that effect re-run once the entry shows up.
	function registerTarget(node: HTMLDivElement) {
		targetEls.set(el.id, node);
		return {
			destroy() {
				targetEls.delete(el.id);
			}
		};
	}

	// a click on an element that's already part of a live multi-selection
	// must not collapse it back to a single selection - the group Moveable
	// effect in canvas.svelte is what actually owns the drag/resize/rotate
	// from there.
	function handlePointerDown(event: PointerEvent) {
		if (event.button !== 0 || el.locked) return;
		event.stopPropagation();

		if (event.shiftKey) {
			canvasStore.toggleSelection(el.id);
			return;
		}

		if (canvasStore.selectedIds.size > 1 && canvasStore.selectedIds.has(el.id)) return;
		canvasStore.select(el.id);
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		const file = event.dataTransfer?.files?.[0];
		if (file?.type.startsWith('image/')) {
			el.properties.src = await uploadImage(file);
		}
	}
</script>

<ContextMenu.Root>
	<ContextMenu.Trigger oncontextmenu={() => canvasStore.handleContextMenu(el.id)}>
		{#snippet child({ props })}
			<div
				{...props}
				use:registerTarget
				onpointerdown={handlePointerDown}
				class="absolute overflow-hidden {canvasStore.selectedIds.has(el.id)
					? 'outline outline-2 outline-offset-1 outline-slytherin outline-dashed'
					: ''}"
				style="left: {el.x}px; top: {el.y}px; width: {el.width}px; height: {el.height}px; transform: {el.warpTransform ||
					`rotate(${el.rotation}deg)`}; {boxAppearanceStyle(el.properties)}; {el.locked
					? 'pointer-events: none;'
					: ''}"
			>
				{#if el.type === 'image'}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						ondragover={(event) => event.preventDefault()}
						ondrop={handleDrop}
						class="h-full w-full"
					>
						{#if el.properties.src}
							<img
								src={el.properties.src}
								alt=""
								class="h-full w-full"
								style="object-fit: {el.properties.objectFit};"
							/>
						{:else}
							<div
								class="flex h-full w-full items-center justify-center text-xs text-paper-placeholder"
							>
								Drop an image
							</div>
						{/if}
					</div>
				{:else if el.type === 'rectangle'}
					<!-- a rectangle IS just the outer box (fill/border/radius/shadow above) -->
				{:else}
					<div class="flex h-full w-full px-1 {verticalAlignClass(el.properties)}">
						<span
							class="w-full whitespace-pre-line"
							style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
						>
							{el.properties.content}
						</span>
					</div>
				{/if}
			</div>
		{/snippet}
	</ContextMenu.Trigger>

	<ContextMenu.Portal>
		<ContextMenu.Content
			class="min-w-40 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
		>
			{@render menuItem(BringToFront, 'Bring to Front', () => canvasStore.bringToFront())}
			{@render menuItem(SendToBack, 'Send to Back', () => canvasStore.sendToBack())}

			{#if canvasStore.selectedIds.size > 1}
				<ContextMenu.Separator class="my-1 h-px bg-ui-border" />
				<ContextMenu.Sub>
					<ContextMenu.SubTrigger
						class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-ui-text-main data-[highlighted]:bg-ui-bg"
					>
						<AlignStartVertical class="h-3.5 w-3.5" />
						Align
					</ContextMenu.SubTrigger>
					<ContextMenu.Portal>
						<ContextMenu.SubContent
							class="min-w-44 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
						>
							{@render menuItem(AlignStartVertical, 'Align Left', () => canvasStore.alignLeft())}
							{@render menuItem(AlignCenterVertical, 'Align Horizontal Center', () =>
								canvasStore.alignHorizontalCenter()
							)}
							{@render menuItem(AlignEndVertical, 'Align Right', () => canvasStore.alignRight())}
							{@render menuItem(AlignStartHorizontal, 'Align Top', () => canvasStore.alignTop())}
							{@render menuItem(AlignCenterHorizontal, 'Align Vertical Center', () =>
								canvasStore.alignVerticalCenter()
							)}
							{@render menuItem(AlignEndHorizontal, 'Align Bottom', () =>
								canvasStore.alignBottom()
							)}
							<ContextMenu.Separator class="my-1 h-px bg-ui-border" />
							{@render menuItem(
								AlignHorizontalDistributeCenter,
								'Distribute Horizontally',
								() => canvasStore.distributeHorizontal(),
								{ disabled: canvasStore.selectedIds.size < 3 }
							)}
							{@render menuItem(
								AlignVerticalDistributeCenter,
								'Distribute Vertically',
								() => canvasStore.distributeVertical(),
								{ disabled: canvasStore.selectedIds.size < 3 }
							)}
						</ContextMenu.SubContent>
					</ContextMenu.Portal>
				</ContextMenu.Sub>
			{/if}

			<ContextMenu.Separator class="my-1 h-px bg-ui-border" />
			{@render menuItem(Copy, 'Duplicate', () => canvasStore.duplicateSelected())}
			{@render menuItem(el.locked ? LockOpen : Lock, el.locked ? 'Unlock' : 'Lock', () =>
				canvasStore.toggleLockSelected()
			)}
			{@render menuItem(Trash2, 'Delete', () => canvasStore.removeSelected(), { danger: true })}
		</ContextMenu.Content>
	</ContextMenu.Portal>
</ContextMenu.Root>

{#snippet menuItem(
	Icon: typeof BringToFront,
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
