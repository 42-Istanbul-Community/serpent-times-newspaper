// Central place for the vanilla "moveable" base config, so canvas.svelte
// doesn't carry the whole options object inline. Needs the .svelte.ts
// extension (not plain .ts) because the toolbox state below uses $state.
import type { MoveableOptions } from 'moveable';

// Toolbox: lets the user flip a few of Moveable's abilities on/off per
// selection, instead of them being fixed at setup time.
class MoveableToolboxState {
	// magnets: snap to page edges/center and to other elements.
	snapEnabled = $state(true);
	// distorts the 4 corners independently via a warp matrix. Doesn't make
	// much sense on text, but is handy when the selection is a plain box.
	warpEnabled = $state(false);
	// touch/trackpad pinch gestures drive drag/resize/rotate. No mobile UI
	// yet, but harmless to leave wired up and ready for when there is one.
	pinchEnabled = $state(true);
}

export const moveableToolbox = new MoveableToolboxState();

export type MoveableTargetContext = {
	target: HTMLElement;
	container: HTMLElement;
	guideEls: HTMLElement[];
	paperWidth: number;
	paperHeight: number;
	zoom: number;
};

export function buildMoveableOptions(ctx: MoveableTargetContext): MoveableOptions {
	return {
		target: ctx.target,
		container: ctx.container,
		origin: false,
		draggable: true,
		resizable: true,
		rotatable: true,
		keepRatio: false,
		zoom: ctx.zoom,
		bounds: { left: 0, top: 0, right: 0, bottom: 0, position: 'css' },

		// Roundable: drag a handle on the shape to edit border-radius
		// directly - the one ability here that changes a component property
		// instead of its geometry, so it's on for every component type.
		roundable: true,

		snappable: moveableToolbox.snapEnabled,
		snapContainer: ctx.container,
		snapGap: true,
		snapDirections: true,
		elementSnapDirections: true,
		elementGuidelines: ctx.guideEls,
		verticalGuidelines: [0, ctx.paperWidth / 2, ctx.paperWidth],
		horizontalGuidelines: [0, ctx.paperHeight / 2, ctx.paperHeight],
		snapThreshold: 5,
		isDisplaySnapDigit: true,

		warpable: moveableToolbox.warpEnabled,
		pinchable: moveableToolbox.pinchEnabled
	};
}
