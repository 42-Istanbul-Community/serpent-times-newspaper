// Undo/redo for everything done on the canvas (add, delete, drag, resize,
// rotate, round, warp, group/ungroup, and every properties-panel edit).
// Driven by an $effect in canvas.svelte that deep-reads canvasStore.nodes on
// every change and calls `track()` here - deep-reading (via JSON.stringify)
// is what makes the effect re-fire on a nested change like `el.x` too, not
// just when the array itself is reassigned.
import { canvasStore, type CanvasNode } from '../canvas-state.svelte';

// changes within this window collapse into a single undo step, so e.g. a
// drag gesture or a burst of keystrokes in a text field don't each get their
// own entry.
const DEBOUNCE_MS = 400;
const MAX_ENTRIES = 100;

class CanvasHistory {
	#undoStack: string[] = [];
	#redoStack: string[] = [];
	#lastSnapshot = '[]';
	#timer: ReturnType<typeof setTimeout> | undefined;

	seed(nodes: CanvasNode[]) {
		clearTimeout(this.#timer);
		this.#undoStack = [];
		this.#redoStack = [];
		this.#lastSnapshot = JSON.stringify(nodes);
	}

	track(nodes: CanvasNode[]) {
		const snapshot = JSON.stringify(nodes);
		if (snapshot === this.#lastSnapshot) return;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => {
			this.#undoStack.push(this.#lastSnapshot);
			if (this.#undoStack.length > MAX_ENTRIES) this.#undoStack.shift();
			this.#lastSnapshot = snapshot;
			this.#redoStack = [];
		}, DEBOUNCE_MS);
	}

	undo() {
		clearTimeout(this.#timer);
		if (this.#undoStack.length === 0) return;
		const previous = this.#undoStack.pop()!;
		this.#redoStack.push(this.#lastSnapshot);
		this.#lastSnapshot = previous;
		canvasStore.nodes = JSON.parse(previous) as CanvasNode[];
	}

	redo() {
		clearTimeout(this.#timer);
		if (this.#redoStack.length === 0) return;
		const next = this.#redoStack.pop()!;
		this.#undoStack.push(this.#lastSnapshot);
		this.#lastSnapshot = next;
		canvasStore.nodes = JSON.parse(next) as CanvasNode[];
	}
}

export const canvasHistory = new CanvasHistory();
