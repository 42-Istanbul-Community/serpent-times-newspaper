<script lang="ts">
	// using the vanilla "moveable" package directly (not "svelte-moveable"),
	// since svelte-moveable's peerDependencies only cover Svelte 3/4 and this
	// project is on Svelte 5. "moveable" is plain framework-agnostic DOM/JS,
	// so there's no compatibility question - we just drive it ourselves from
	// an $effect (client-only, so it never touches the DOM during SSR).
	import Moveable, {
		type OnDrag,
		type OnDragEnd,
		type OnDragGroup,
		type OnDragGroupEnd,
		type OnResize,
		type OnResizeEnd,
		type OnResizeGroup,
		type OnResizeGroupEnd,
		type OnRotate,
		type OnRotateEnd,
		type OnRotateGroup,
		type OnRotateGroupEnd,
		type OnRound,
		type OnRoundEnd,
		type OnWarp,
		type OnWarpEnd
	} from 'moveable';
	import { SvelteMap } from 'svelte/reactivity';
	import { canvasStore } from '../canvas-state.svelte';
	import { uploadImage } from '$lib/components/editor/upload-image';
	import CanvasElement from './canvas-element.svelte';
	import { canvasHistory } from './canvas-history';
	import MarqueeOverlay from './marquee-overlay.svelte';
	import { buildMoveableOptions, moveableToolbox } from './moveable.svelte';
	import MoveableToolbox from './moveable-toolbox.svelte';
	import ZoomControl from './zoom-control.svelte';

	const PAPER_WIDTH = 720;
	const PAPER_HEIGHT = 960;
	// the scrollable "camera" area is much bigger than the paper itself, so
	// there's always room to pan around freely (especially when zoomed in) -
	// otherwise panning hits a wall right at the paper's own edges.
	const SURFACE_SIZE = 4000;
	// the paper is flex-centered inside the (unscaled) surface, so its
	// layout position within the surface is always this fixed offset,
	// regardless of zoom.
	const PAPER_OFFSET_X = (SURFACE_SIZE - PAPER_WIDTH) / 2;
	const PAPER_OFFSET_Y = (SURFACE_SIZE - PAPER_HEIGHT) / 2;

	let scrollEl: HTMLDivElement = $state()!;
	let surfaceEl: HTMLDivElement = $state()!;
	let paperEl: HTMLDivElement = $state()!;
	// a reactive map (not a plain object): populated by each CanvasElement
	// child (see its `registerTarget` action). It has to be reactive because
	// a freshly-selected element's own registration can land *after* the
	// Moveable effect below has already run and bailed out (child mount
	// order vs. effect flush order isn't something to rely on across a
	// component boundary) - reading a SvelteMap entry makes that effect
	// re-run automatically once the entry actually appears, instead of
	// silently staying unattached.
	let targetEls = new SvelteMap<string, HTMLDivElement>();

	// center the viewport on the paper once, on mount.
	$effect(() => {
		if (!scrollEl) return;
		scrollEl.scrollLeft = (SURFACE_SIZE - scrollEl.clientWidth) / 2;
		scrollEl.scrollTop = (SURFACE_SIZE - scrollEl.clientHeight) / 2;
	});

	// keep the store's reference to the paper node in sync, so code outside
	// the canvas (the autosave thumbnail capture) can get at it.
	$effect(() => {
		canvasStore.paperEl = paperEl ?? null;
		return () => {
			if (canvasStore.paperEl === paperEl) canvasStore.paperEl = null;
		};
	});

	// history: JSON.stringify deep-reads every element/property, so this
	// effect re-fires on any add/delete/move/resize/rotate/property edit,
	// not just when the elements array itself is reassigned.
	$effect(() => {
		canvasHistory.track(canvasStore.nodes);
	});

	function isTypingTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			(target instanceof HTMLElement && target.isContentEditable)
		);
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		const meta = event.ctrlKey || event.metaKey;

		if (meta && event.key.toLowerCase() === 'z') {
			event.preventDefault();
			if (event.shiftKey) canvasHistory.redo();
			else canvasHistory.undo();
			return;
		}
		if (meta && event.key.toLowerCase() === 'y') {
			event.preventDefault();
			canvasHistory.redo();
			return;
		}
		if (meta && event.key.toLowerCase() === 'a') {
			if (isTypingTarget(event.target)) return; // let normal text select-all happen
			event.preventDefault();
			canvasStore.selectAll();
			return;
		}
		if (
			(event.key === 'Delete' || event.key === 'Backspace') &&
			!isTypingTarget(event.target) &&
			canvasStore.selectedIds.size > 0
		) {
			event.preventDefault();
			canvasStore.removeSelected();
		}
		if (meta && event.key.toLowerCase() === 'c') {
			if (isTypingTarget(event.target)) return; // let normal text copy happen
			event.preventDefault();
			canvasStore.copySelected();
		}
	}

	// Ctrl/Cmd+V: an image on the system clipboard drops into a new image
	// component (same vehicle used for placing one from the palette);
	// otherwise it's a paste of whatever was last copied with Ctrl/Cmd+C.
	async function handlePaste(event: ClipboardEvent) {
		if (isTypingTarget(event.target)) return; // let normal text paste happen
		const item = [...(event.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
		const file = item?.getAsFile();
		if (file) {
			event.preventDefault();
			const id = canvasStore.add('image');
			const el = canvasStore.elements.find((e) => e.id === id);
			if (el) el.properties.src = await uploadImage(file);
			return;
		}
		canvasStore.pasteClipboard();
	}

	// the Moveable control box needs to live inside the same (scaled,
	// relatively-positioned) element the target actually sits in - anywhere
	// further out (e.g. document.body) ends up miscalculating the box
	// position once you're nested inside the centered/scrollable canvas area.
	$effect(() => {
		const id = canvasStore.selectedId;
		const el = canvasStore.elements.find((e) => e.id === id);
		const targetEl = id ? targetEls.get(id) : undefined;
		// same reasoning as the group effect below: a live marquee can pass
		// through a transient single-element selection, and we don't want to
		// attach/detach a Moveable instance for every intermediate frame.
		if (!el || !targetEl || !paperEl || el.locked || marqueeRect || canvasStore.editingTextId === id) return;

		const guideEls = [...targetEls.values()].filter((node) => node !== targetEl);

		const moveable = new Moveable(
			paperEl,
			buildMoveableOptions({
				target: targetEl,
				container: paperEl,
				guideEls,
				paperWidth: PAPER_WIDTH,
				paperHeight: PAPER_HEIGHT,
				zoom
			})
		);

		// While a gesture is live, let Moveable own the target's DOM style
		// directly (it reads the target's current size/position back on every
		// step, e.g. for resize deltas) - our template's own reactive
		// `style=` binding only re-applies from $state, which is batched
		// async, so if we synced $state on every step instead, resize would
		// end up reading stale sizes and go haywire (drag doesn't hit this
		// because it tracks its own delta, not the DOM). Only reconcile
		// $state once, when the gesture ends.
		moveable.on('drag', (event: OnDrag) => {
			event.target.style.left = `${event.left}px`;
			event.target.style.top = `${event.top}px`;
		});
		moveable.on('dragEnd', (event: OnDragEnd) => {
			const last = event.lastEvent as OnDrag | undefined;
			if (!last) return;
			el.x = last.left;
			el.y = last.top;
		});

		moveable.on('resize', (event: OnResize) => {
			event.target.style.width = `${event.width}px`;
			event.target.style.height = `${event.height}px`;
			event.target.style.left = `${event.drag.left}px`;
			event.target.style.top = `${event.drag.top}px`;
		});
		moveable.on('resizeEnd', (event: OnResizeEnd) => {
			const last = event.lastEvent as OnResize | undefined;
			if (!last) return;
			el.width = last.width;
			el.height = last.height;
			el.x = last.drag.left;
			el.y = last.drag.top;
		});

		moveable.on('rotate', (event: OnRotate) => {
			event.target.style.transform = `rotate(${event.rotation}deg)`;
		});
		moveable.on('rotateEnd', (event: OnRotateEnd) => {
			const last = event.lastEvent as OnRotate | undefined;
			if (!last) return;
			el.rotation = last.rotation;
			el.warpTransform = ''; // a plain rotate re-establishes rotation as the source of truth
		});

		// Roundable: drag a handle on the shape to edit border-radius live.
		moveable.on('round', (event: OnRound) => {
			event.target.style.borderRadius = event.borderRadius;
		});
		moveable.on('roundEnd', (event: OnRoundEnd) => {
			const last = event.lastEvent as OnRound | undefined;
			if (!last) return;
			el.properties.borderRadius = last.borderRadius;
		});

		// Warpable: drag any corner independently. Moveable reports a full,
		// self-consistent transform here (not just a delta), so we store it
		// as-is and let it replace the rotate-based transform below.
		moveable.on('warp', (event: OnWarp) => {
			event.target.style.transform = event.transform;
		});
		moveable.on('warpEnd', (event: OnWarpEnd) => {
			const last = event.lastEvent as OnWarp | undefined;
			if (!last) return;
			el.warpTransform = last.transform;
		});

		return () => moveable.destroy();
	});

	// Group Moveable: when multiple elements are selected, attach a single
	// Moveable instance across all of their target elements at once -
	// Moveable natively supports this when `target` is an array (it becomes
	// a "group" with its own combined bounding box/handles, and emits
	// dragGroup/resizeGroup/rotateGroup events instead of the singular
	// ones above). Roundable/Warpable stay off here: those edit an
	// individual shape's own border-radius/corner-distortion, which doesn't
	// mean anything applied across a mixed group at once.
	$effect(() => {
		const ids = [...canvasStore.selectedIds];
		// a live marquee drag calls setSelection() on every pointermove, which
		// would otherwise tear down and rebuild this whole native Moveable
		// instance on every intermediate frame of the gesture - wait for the
		// drag to settle (marqueeRect back to null) before attaching it.
		if (ids.length <= 1 || !paperEl || marqueeRect || canvasStore.editingTextId !== null) return;

		const idByTarget = new SvelteMap<HTMLElement | SVGElement, string>();
		for (const id of ids) {
			const el = canvasStore.elements.find((e) => e.id === id);
			const targetEl = targetEls.get(id);
			if (el && targetEl && !el.locked) idByTarget.set(targetEl, id);
		}
		const targets = [...idByTarget.keys()];
		if (targets.length <= 1) return;

		const guideEls = [...targetEls.entries()]
			.filter(([id]) => !canvasStore.selectedIds.has(id))
			.map(([, node]) => node);

		const moveable = new Moveable(paperEl, {
			target: targets,
			container: paperEl,
			origin: false,
			draggable: true,
			resizable: true,
			rotatable: true,
			keepRatio: false,
			zoom,
			bounds: { left: 0, top: 0, right: 0, bottom: 0, position: 'css' },

			snappable: moveableToolbox.snapEnabled,
			snapContainer: paperEl,
			snapGap: true,
			snapDirections: true,
			elementSnapDirections: true,
			elementGuidelines: guideEls,
			verticalGuidelines: [0, PAPER_WIDTH / 2, PAPER_WIDTH],
			horizontalGuidelines: [0, PAPER_HEIGHT / 2, PAPER_HEIGHT],
			snapThreshold: 5,
			isDisplaySnapDigit: true
		});

		moveable.on('dragGroup', (event: OnDragGroup) => {
			for (const ev of event.events) {
				ev.target.style.left = `${ev.left}px`;
				ev.target.style.top = `${ev.top}px`;
			}
		});
		moveable.on('dragGroupEnd', (event: OnDragGroupEnd) => {
			for (const ev of event.events) {
				const last = ev.lastEvent as OnDrag | undefined;
				const el = canvasStore.elements.find((e) => e.id === idByTarget.get(ev.target));
				if (!last || !el) continue;
				el.x = last.left;
				el.y = last.top;
			}
		});

		moveable.on('resizeGroup', (event: OnResizeGroup) => {
			for (const ev of event.events) {
				ev.target.style.width = `${ev.width}px`;
				ev.target.style.height = `${ev.height}px`;
				ev.target.style.left = `${ev.drag.left}px`;
				ev.target.style.top = `${ev.drag.top}px`;
			}
		});
		moveable.on('resizeGroupEnd', (event: OnResizeGroupEnd) => {
			for (const ev of event.events) {
				const last = ev.lastEvent as OnResize | undefined;
				const el = canvasStore.elements.find((e) => e.id === idByTarget.get(ev.target));
				if (!last || !el) continue;
				el.width = last.width;
				el.height = last.height;
				el.x = last.drag.left;
				el.y = last.drag.top;
			}
		});

		// group rotation pivots around the group's shared center, not each
		// element's own center, so every element's position drifts too - the
		// accompanying `drag` sub-event carries that position delta.
		moveable.on('rotateGroup', (event: OnRotateGroup) => {
			for (const ev of event.events) {
				ev.target.style.transform = `rotate(${ev.rotation}deg)`;
				ev.target.style.left = `${ev.drag.left}px`;
				ev.target.style.top = `${ev.drag.top}px`;
			}
		});
		moveable.on('rotateGroupEnd', (event: OnRotateGroupEnd) => {
			for (const ev of event.events) {
				const last = ev.lastEvent as OnRotate | undefined;
				const el = canvasStore.elements.find((e) => e.id === idByTarget.get(ev.target));
				if (!last || !el) continue;
				el.rotation = last.rotation;
				el.warpTransform = '';
				el.x = last.drag.left;
				el.y = last.drag.top;
			}
		});

		return () => moveable.destroy();
	});

	// --- zoom (ctrl/cmd + wheel, centered on the cursor) ---
	const MIN_ZOOM = 0.25;
	const MAX_ZOOM = 3;
	let zoom = $state(1);

	function setZoomAt(nextZoom: number, clientX: number, clientY: number) {
		const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
		if (clamped === zoom) return;
		const rect = scrollEl.getBoundingClientRect();

		// surface-space (unscaled) point currently under the cursor.
		const surfaceX = scrollEl.scrollLeft + (clientX - rect.left);
		const surfaceY = scrollEl.scrollTop + (clientY - rect.top);

		// only the paper itself scales (the surface around it doesn't), so
		// convert to a paper-intrinsic point - that's what has to stay fixed
		// under the cursor across the zoom change.
		const paperX = (surfaceX - PAPER_OFFSET_X) / zoom;
		const paperY = (surfaceY - PAPER_OFFSET_Y) / zoom;

		zoom = clamped;
		requestAnimationFrame(() => {
			scrollEl.scrollLeft = PAPER_OFFSET_X + paperX * clamped - (clientX - rect.left);
			scrollEl.scrollTop = PAPER_OFFSET_Y + paperY * clamped - (clientY - rect.top);
		});
	}

	function handleWheel(event: WheelEvent) {
		if (!event.ctrlKey && !event.metaKey) return; // plain scroll = native pan
		event.preventDefault();
		const factor = Math.exp(-event.deltaY * 0.001);
		setZoomAt(zoom * factor, event.clientX, event.clientY);
	}

	function handleToolbarZoom(delta: number) {
		setZoomAt(zoom + delta, scrollEl.clientWidth / 2, scrollEl.clientHeight / 2);
	}

	// --- pan (middle-mouse-button drag, like Figma's hand tool) ---
	let isPanning = $state(false);
	let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

	// --- marquee selection (left-button drag on empty background, like
	// Figma's rubber-band select) - hand-rolled in raw client coordinates
	// rather than via a library (e.g. Selecto): the marquee has to compare
	// against element rects that sit inside the zoomed/panned paper, and
	// getBoundingClientRect() already accounts for that (plus rotation/warp)
	// for free, so there's no transform math to get wrong here.
	const MARQUEE_THRESHOLD_PX = 4;
	let marqueeOrigin: { x: number; y: number } | null = null;
	let marqueeRect = $state<{ left: number; top: number; width: number; height: number } | null>(
		null
	);

	function updateMarqueeSelection(rect: {
		left: number;
		top: number;
		width: number;
		height: number;
	}) {
		const right = rect.left + rect.width;
		const bottom = rect.top + rect.height;
		const hitIds: string[] = [];
		for (const el of canvasStore.elements) {
			if (el.locked) continue; // canvas interactions can't touch locked elements
			const targetRect = targetEls.get(el.id)?.getBoundingClientRect();
			if (!targetRect) continue;
			const intersects =
				targetRect.left < right &&
				targetRect.right > rect.left &&
				targetRect.top < bottom &&
				targetRect.bottom > rect.top;
			if (intersects) hitIds.push(el.id);
		}
		canvasStore.setSelection(hitIds);
	}

	function handleScrollPointerDown(event: PointerEvent) {
		if (event.button !== 1) {
			// only arm a marquee/deselect for presses that land directly on
			// empty background - not on a target (stops propagation itself) and
			// not on Moveable's own resize/rotate handles, which also live in
			// this subtree and would otherwise get their drag interrupted.
			const isBackground =
				event.target === scrollEl || event.target === surfaceEl || event.target === paperEl;
			if (event.button === 0 && isBackground) {
				marqueeOrigin = { x: event.clientX, y: event.clientY };
				(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
			}
			return;
		}
		event.preventDefault();
		isPanning = true;
		panStart = {
			x: event.clientX,
			y: event.clientY,
			scrollLeft: scrollEl.scrollLeft,
			scrollTop: scrollEl.scrollTop
		};
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function handleScrollPointerMove(event: PointerEvent) {
		if (isPanning) {
			scrollEl.scrollLeft = panStart.scrollLeft - (event.clientX - panStart.x);
			scrollEl.scrollTop = panStart.scrollTop - (event.clientY - panStart.y);
			return;
		}
		if (!marqueeOrigin) return;
		const dx = event.clientX - marqueeOrigin.x;
		const dy = event.clientY - marqueeOrigin.y;
		if (!marqueeRect && Math.hypot(dx, dy) < MARQUEE_THRESHOLD_PX) return;
		const rect = {
			left: Math.min(marqueeOrigin.x, event.clientX),
			top: Math.min(marqueeOrigin.y, event.clientY),
			width: Math.abs(dx),
			height: Math.abs(dy)
		};
		marqueeRect = rect;
		updateMarqueeSelection(rect);
	}

	function handleScrollPointerUp() {
		if (isPanning) {
			isPanning = false;
			return;
		}
		if (marqueeOrigin && !marqueeRect) canvasStore.select(null); // plain click, no drag
		marqueeOrigin = null;
		marqueeRect = null;
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} onpaste={handlePaste} />

<div class="relative h-full">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={scrollEl}
		onwheel={handleWheel}
		onpointerdown={handleScrollPointerDown}
		onpointermove={handleScrollPointerMove}
		onpointerup={handleScrollPointerUp}
		onpointercancel={handleScrollPointerUp}
		class="absolute inset-0 overflow-auto {isPanning ? 'cursor-grabbing' : ''}"
	>
		<div
			bind:this={surfaceEl}
			class="flex items-center justify-center"
			style="width: {SURFACE_SIZE}px; height: {SURFACE_SIZE}px;"
		>
			<!-- the paper's background stays whatever it's set to (a fixed light
			     "print paper" tone by default) regardless of the app's light/dark
			     theme - editable from the properties panel's "Page" section. -->
			<div
				bind:this={paperEl}
				class="relative shrink-0 border border-paper-rule bg-cover bg-center shadow-sm"
				style="width: {PAPER_WIDTH}px; height: {PAPER_HEIGHT}px; transform: scale({zoom}); transform-origin: top left;"
				style:background-color={canvasStore.pageBackgroundColor}
				style:background-image={canvasStore.pageBackgroundImage
					? `url("${canvasStore.pageBackgroundImage}")`
					: 'none'}
			>
				<!-- canvasStore.elements is front-to-back (index 0 = topmost); DOM
				     order paints later siblings on top, so reverse it here. -->
				{#each canvasStore.elements.reverse() as el (el.id)}
					<CanvasElement {el} {targetEls} />
				{/each}
			</div>
		</div>
	</div>

	{#if marqueeRect}
		<MarqueeOverlay rect={marqueeRect} />
	{/if}

	<MoveableToolbox />
	<ZoomControl
		{zoom}
		onZoomOut={() => handleToolbarZoom(-0.1)}
		onZoomIn={() => handleToolbarZoom(0.1)}
		onReset={() => (zoom = 1)}
	/>
</div>
