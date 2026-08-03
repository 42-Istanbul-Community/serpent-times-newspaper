<script lang="ts">
	import { Magnet, Move3d, Smartphone } from '@lucide/svelte';
	import { moveableToolbox } from './moveable.svelte';
</script>

<!-- toggles for Moveable abilities that aren't just always-on. -->
<div
	class="absolute bottom-4 left-4 flex items-center gap-1 rounded-md border border-ui-border bg-ui-surface px-1 py-1 shadow-sm"
>
	{@render toggleButton(
		Magnet,
		'Toggle magnets (snapping)',
		moveableToolbox.snapEnabled,
		() => (moveableToolbox.snapEnabled = !moveableToolbox.snapEnabled)
	)}
	{@render toggleButton(
		Move3d,
		'Toggle warp (corner distortion, best on plain boxes)',
		moveableToolbox.warpEnabled,
		() => (moveableToolbox.warpEnabled = !moveableToolbox.warpEnabled)
	)}
	{@render toggleButton(
		Smartphone,
		'Toggle pinch gestures (for touch devices)',
		moveableToolbox.pinchEnabled,
		() => (moveableToolbox.pinchEnabled = !moveableToolbox.pinchEnabled)
	)}
</div>

{#snippet toggleButton(Icon: typeof Magnet, label: string, pressed: boolean, onToggle: () => void)}
	<button
		type="button"
		aria-label={label}
		aria-pressed={pressed}
		onclick={onToggle}
		class="rounded p-1.5 {pressed
			? 'bg-slytherin/10 text-slytherin'
			: 'text-ui-text-muted hover:bg-ui-bg'}"
	>
		<Icon class="h-4 w-4" />
	</button>
{/snippet}
