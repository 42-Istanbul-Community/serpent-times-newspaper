<script lang="ts">
	import PropertiesPanel from './properties-panel/properties-panel.svelte';
	import Topbar from './topbar.svelte';
	import TemplatePanel from './template-panel/template-panel.svelte';

	let { children } = $props();

	const MIN_SIDEBAR_WIDTH = 220;
	const MAX_SIDEBAR_WIDTH = 480;

	let leftWidth = $state(280);
	let rightWidth = $state(280);
	let dragging = $state<'left' | 'right' | null>(null);
	let bodyEl: HTMLDivElement;

	function clamp(value: number) {
		return Math.min(Math.max(value, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
	}

	function startDrag(side: 'left' | 'right', event: PointerEvent) {
		dragging = side;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handleDrag(side: 'left' | 'right', event: PointerEvent) {
		if (dragging !== side) return;
		const rect = bodyEl.getBoundingClientRect();
		if (side === 'left') {
			leftWidth = clamp(event.clientX - rect.left);
		} else {
			rightWidth = clamp(rect.right - event.clientX);
		}
	}

	function endDrag() {
		dragging = null;
	}

	function handleKeydown(side: 'left' | 'right', event: KeyboardEvent) {
		const step = 16;
		if (event.key === 'ArrowLeft') {
			if (side === 'left') leftWidth = clamp(leftWidth - step);
			else rightWidth = clamp(rightWidth + step);
		} else if (event.key === 'ArrowRight') {
			if (side === 'left') leftWidth = clamp(leftWidth + step);
			else rightWidth = clamp(rightWidth - step);
		}
	}
</script>

<div class="flex h-full min-h-0 flex-col" class:select-none={dragging !== null}>
	<Topbar />
	<div bind:this={bodyEl} class="flex min-h-0 flex-1">
		<aside
			style:width="{leftWidth}px"
			class="min-h-0 shrink-0 border-r border-paper-rule bg-paper-surface"
		>
			<TemplatePanel />
		</aside>

		{@render handle('left')}

		<main class="min-h-0 min-w-0 flex-1 bg-paper-bg">
			{@render children()}
		</main>

		{@render handle('right')}

		<aside
			style:width="{rightWidth}px"
			class="min-h-0 shrink-0 border-l border-paper-rule bg-paper-surface"
		>
			<PropertiesPanel />
		</aside>
	</div>
</div>

{#snippet handle(side: 'left' | 'right')}
	<div
		role="slider"
		aria-orientation="vertical"
		aria-label={side === 'left' ? 'Resize left panel' : 'Resize right panel'}
		aria-valuenow={side === 'left' ? leftWidth : rightWidth}
		aria-valuemin={MIN_SIDEBAR_WIDTH}
		aria-valuemax={MAX_SIDEBAR_WIDTH}
		tabindex="0"
		onpointerdown={(event) => startDrag(side, event)}
		onpointermove={(event) => handleDrag(side, event)}
		onpointerup={endDrag}
		onpointercancel={endDrag}
		onkeydown={(event) => handleKeydown(side, event)}
		class="w-1 shrink-0 cursor-col-resize touch-none bg-paper-rule transition-colors duration-150 hover:bg-slytherin {dragging ===
		side
			? 'bg-slytherin'
			: ''}"
	></div>
{/snippet}
