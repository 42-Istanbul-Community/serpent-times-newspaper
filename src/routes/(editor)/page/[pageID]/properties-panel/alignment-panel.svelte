<script lang="ts">
	import {
		AlignCenterHorizontal,
		AlignCenterVertical,
		AlignEndHorizontal,
		AlignEndVertical,
		AlignHorizontalDistributeCenter,
		AlignStartHorizontal,
		AlignStartVertical,
		AlignVerticalDistributeCenter
	} from '@lucide/svelte';
	import { canvasStore } from '../canvas-state.svelte';

	const alignButtonClass =
		'flex items-center justify-center rounded-md border border-ui-border bg-ui-surface p-2 text-ui-text-main hover:bg-ui-bg disabled:cursor-not-allowed disabled:opacity-40';
</script>

<div class="flex flex-col gap-3">
	<span class="text-xs font-medium tracking-wide text-ui-text-muted uppercase">Align</span>
	<div class="grid grid-cols-3 gap-1.5">
		{@render alignButton(AlignStartVertical, 'Align left', () => canvasStore.alignLeft())}
		{@render alignButton(AlignCenterVertical, 'Align horizontal center', () =>
			canvasStore.alignHorizontalCenter()
		)}
		{@render alignButton(AlignEndVertical, 'Align right', () => canvasStore.alignRight())}
		{@render alignButton(AlignStartHorizontal, 'Align top', () => canvasStore.alignTop())}
		{@render alignButton(AlignCenterHorizontal, 'Align vertical center', () =>
			canvasStore.alignVerticalCenter()
		)}
		{@render alignButton(AlignEndHorizontal, 'Align bottom', () => canvasStore.alignBottom())}
	</div>

	<span class="text-xs font-medium tracking-wide text-ui-text-muted uppercase">Distribute</span>
	<div class="grid grid-cols-2 gap-1.5">
		{@render alignButton(
			AlignHorizontalDistributeCenter,
			'Distribute horizontal spacing',
			() => canvasStore.distributeHorizontal(),
			canvasStore.selectedIds.size < 3
		)}
		{@render alignButton(
			AlignVerticalDistributeCenter,
			'Distribute vertical spacing',
			() => canvasStore.distributeVertical(),
			canvasStore.selectedIds.size < 3
		)}
	</div>
	{#if canvasStore.selectedIds.size < 3}
		<p class="text-xs text-ui-text-muted">Select 3 or more to distribute spacing evenly.</p>
	{/if}
</div>

{#snippet alignButton(
	Icon: typeof AlignStartVertical,
	label: string,
	onAlign: () => void,
	disabled = false
)}
	<button type="button" onclick={onAlign} {disabled} aria-label={label} class={alignButtonClass}>
		<Icon class="h-4 w-4" />
	</button>
{/snippet}
