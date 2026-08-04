// Shared canvas state - the single source of truth for everything placed on
// the page: template-panel/components.svelte adds elements from the palette,
// canvas.svelte renders + drags/resizes/rotates them, template-panel/
// layers.svelte is just another view onto the same tree (with a single
// level of grouping - a group can only hold elements, not other groups).
// A plain module with $state works as a lightweight store in Svelte 5.

import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { componentSchemas } from '$lib/data/components';

// the element-tree types themselves live in $lib/types/canvas.ts (a plain
// module, safe for server-only code like the Drizzle schema to import) -
// re-exported here so every existing importer of this file keeps working.
export type { CanvasElementType, CanvasElement, CanvasGroup, CanvasNode } from '$lib/types/canvas';
import type { CanvasElement, CanvasGroup, CanvasNode, CanvasElementType } from '$lib/types/canvas';

// flattened, in-visual-order view of every currently visible layers-panel
// row (a collapsed group hides its children there). used for shift-range
// select and for hit-testing during drag - not for canvas rendering, which
// always shows every element regardless of a group's expanded state.
type VisibleRow = { id: string; parentId: string | null; index: number; isGroup: boolean };

export type DropTarget =
	{ kind: 'between'; parentId: string | null; index: number } | { kind: 'into'; groupId: string };

const DRAG_THRESHOLD_PX = 4;

class CanvasStore {
	// stacking order, front-to-back: index 0 is the topmost/front-most node,
	// the last index is the back-most. This is also the order the layers
	// panel renders top-to-bottom (top of list = front of stack, matching
	// Figma). Canvas rendering has to reverse this, since later DOM siblings
	// paint over earlier ones.
	nodes = $state<CanvasNode[]>([]);

	// the paper's own background - shown in the properties panel (as "Page") when
	// nothing is selected. defaults to the same tone as --color-canvas-paper
	// so it looks unchanged until someone customizes it.
	pageBackgroundColor = $state('#fbf8f1');
	pageBackgroundImage = $state('');

	// the live paper DOM node, kept in sync by canvas.svelte - lets code
	// outside the canvas (e.g. template-sync.svelte.ts's autosave-triggered
	// thumbnail capture) get at it without prop-drilling.
	paperEl = $state<HTMLElement | null>(null);

	// multiple elements can be selected (Ctrl/Cmd+A, shift/ctrl+click in the
	// layers panel), but Moveable only ever attaches to a single target -
	// `selectedId` (below) is only non-null when exactly one element is
	// selected, and drives the drag/resize/rotate handles + the properties panel.
	selectedIds = new SvelteSet<string>();
	lastSelectedId = $state<string | null>(null);

	// double-click to rename, in the layers panel (works for both elements
	// and groups).
	editingId = $state<string | null>(null);
	editingValue = $state('');

	// drag to reorder / drag into a group, in the layers panel. the whole
	// row is draggable: pointerdown just arms it, and only once the pointer
	// has moved past a small threshold does it turn into a real drag (so a
	// plain click still reaches the select button). while dragging,
	// hovering the middle band of a group row drops *into* it; hovering the
	// top/bottom band of any row drops *between* rows.
	draggedId = $state<string | null>(null);
	dropTarget = $state<DropTarget | null>(null);

	#armedId: string | null = null;
	#armedParentId: string | null = null;
	#armedY = 0;
	#draggedParentId: string | null = null;
	#rowEls = new SvelteMap<string, HTMLElement>();

	// internal clipboard (Ctrl+C/Ctrl+V) - not the system clipboard, just a
	// deep copy of whichever nodes were selected. #pasteCount grows with each
	// repeated paste so copies fan out instead of stacking on the same pixel,
	// and resets whenever something new is copied.
	#clipboard: CanvasNode[] = [];
	#pasteCount = 0;

	get selectedId(): string | null {
		return this.selectedIds.size === 1 ? [...this.selectedIds][0] : null;
	}

	// flattened list of every actual element, in stacking order - what
	// canvas.svelte renders. a group is purely an organizational device in
	// the layers panel, it has no visual presence of its own on the canvas.
	get elements(): CanvasElement[] {
		const flat: CanvasElement[] = [];
		for (const node of this.nodes) {
			if (node.kind === 'element') flat.push(node);
			else flat.push(...node.children);
		}
		return flat;
	}

	// only top-level elements can be grouped (keeps nesting to a single level).
	canGroup = $derived(
		this.nodes.filter((node) => node.kind === 'element' && this.selectedIds.has(node.id)).length >=
			2
	);

	add(type: CanvasElementType) {
		const schema = componentSchemas[type];
		const id = crypto.randomUUID();
		const offset = (this.elements.length % 6) * 20;
		// unshift, not push: index 0 is the front-most/topmost node (see the
		// note on `nodes` above), and a freshly placed element should land on
		// top of everything else, at the top of the layers list.
		this.nodes.unshift({
			id,
			kind: 'element',
			type,
			label: schema.label,
			x: 32 + offset,
			y: 32 + offset,
			width: schema.defaultWidth,
			height: schema.defaultHeight,
			rotation: 0,
			warpTransform: '',
			properties: { ...schema.properties },
			locked: false
		});
		this.select(id);
		return id;
	}

	toggleLockOne(id: string) {
		const el = this.elements.find((e) => e.id === id);
		if (el) el.locked = !el.locked;
	}

	// toggles the whole selection together: locks everything if any of it is
	// still unlocked, otherwise unlocks everything.
	toggleLockSelected() {
		const selected = this.elements.filter((el) => this.selectedIds.has(el.id));
		if (selected.length === 0) return;
		const allLocked = selected.every((el) => el.locked);
		for (const el of selected) el.locked = !allLocked;
	}

	findGroup(id: string): CanvasGroup | undefined {
		const node = this.nodes.find((n) => n.id === id);
		return node?.kind === 'group' ? node : undefined;
	}

	findNode(id: string): CanvasNode | undefined {
		for (const node of this.nodes) {
			if (node.id === id) return node;
			if (node.kind === 'group') {
				const child = node.children.find((c) => c.id === id);
				if (child) return child;
			}
		}
		return undefined;
	}

	getVisibleRows(): VisibleRow[] {
		const rows: VisibleRow[] = [];
		this.nodes.forEach((node, index) => {
			rows.push({ id: node.id, parentId: null, index, isGroup: node.kind === 'group' });
			if (node.kind === 'group' && node.expanded) {
				node.children.forEach((child, childIndex) => {
					rows.push({ id: child.id, parentId: node.id, index: childIndex, isGroup: false });
				});
			}
		});
		return rows;
	}

	// bound (arrow) because it's used directly as a `use:` action.
	trackRow = (node: HTMLElement, id: string) => {
		this.#rowEls.set(id, node);
		return {
			update: (newId: string) => {
				this.#rowEls.delete(id);
				id = newId;
				this.#rowEls.set(id, node);
			},
			destroy: () => {
				this.#rowEls.delete(id);
			}
		};
	};

	armDragRow(id: string, parentId: string | null, event: PointerEvent) {
		if (this.editingId !== null) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;
		this.#armedId = id;
		this.#armedParentId = parentId;
		this.#armedY = event.clientY;
	}

	dragRow(event: PointerEvent) {
		if (this.draggedId === null) {
			if (this.#armedId === null || Math.abs(event.clientY - this.#armedY) < DRAG_THRESHOLD_PX) {
				return;
			}
			this.draggedId = this.#armedId;
			this.#draggedParentId = this.#armedParentId;
			this.selectedIds.clear();
			this.selectedIds.add(this.#armedId);
			this.lastSelectedId = this.#armedId;
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}
		if (this.draggedId === null) return;

		const isDraggedAGroup = this.findNode(this.draggedId)?.kind === 'group';
		const rows = this.getVisibleRows().filter(
			(row) =>
				row.id !== this.draggedId &&
				row.parentId !== this.draggedId &&
				!(isDraggedAGroup && row.parentId !== null)
		);

		for (const row of rows) {
			const rect = this.#rowEls.get(row.id)?.getBoundingClientRect();
			if (!rect || event.clientY < rect.top || event.clientY > rect.bottom) continue;
			const relY = (event.clientY - rect.top) / rect.height;
			if (row.isGroup && !isDraggedAGroup && relY > 0.25 && relY < 0.75) {
				this.dropTarget = { kind: 'into', groupId: row.id };
			} else {
				this.dropTarget = {
					kind: 'between',
					parentId: row.parentId,
					index: relY < 0.5 ? row.index : row.index + 1
				};
			}
			return;
		}

		// cursor is in a gap between rows: fall back to nearest insertion point.
		for (const row of rows) {
			const rect = this.#rowEls.get(row.id)?.getBoundingClientRect();
			if (!rect) continue;
			if (event.clientY < rect.top + rect.height / 2) {
				this.dropTarget = { kind: 'between', parentId: row.parentId, index: row.index };
				return;
			}
		}
		this.dropTarget = { kind: 'between', parentId: null, index: this.nodes.length };
	}

	#moveNode(id: string, fromParentId: string | null, target: DropTarget) {
		let removed: CanvasNode | undefined;
		let fromIndex: number;

		if (fromParentId === null) {
			fromIndex = this.nodes.findIndex((n) => n.id === id);
			if (fromIndex !== -1) removed = this.nodes.splice(fromIndex, 1)[0];
		} else {
			const group = this.findGroup(fromParentId);
			if (!group) return;
			fromIndex = group.children.findIndex((n) => n.id === id);
			if (fromIndex !== -1) removed = group.children.splice(fromIndex, 1)[0];
		}
		if (!removed) return;

		if (target.kind === 'into') {
			if (removed.kind !== 'element') return; // groups can't be nested
			this.findGroup(target.groupId)?.children.push(removed);
			return;
		}

		let index = target.index;
		if (target.parentId === fromParentId && fromIndex < index) index -= 1;

		if (target.parentId === null) {
			this.nodes.splice(index, 0, removed);
		} else if (removed.kind === 'element') {
			this.findGroup(target.parentId)?.children.splice(index, 0, removed);
		}
	}

	endDragRow() {
		if (this.draggedId !== null && this.dropTarget !== null) {
			this.#moveNode(this.draggedId, this.#draggedParentId, this.dropTarget);
		}
		this.#armedId = null;
		this.#armedParentId = null;
		this.draggedId = null;
		this.#draggedParentId = null;
		this.dropTarget = null;
	}

	handleContextMenu(id: string) {
		if (!this.selectedIds.has(id)) {
			this.selectedIds.clear();
			this.selectedIds.add(id);
			this.lastSelectedId = id;
		}
	}

	// simple single-select, used by clicking an element directly on the canvas.
	select(id: string | null) {
		this.selectedIds.clear();
		if (id === null) return;
		this.selectedIds.add(id);
		this.lastSelectedId = id;
	}

	// click = select only, ctrl/cmd+click = toggle, shift+click = range -
	// used by the layers panel, where rows have a stable visual order to
	// range-select over.
	handleSelect(id: string, event: MouseEvent) {
		if (event.shiftKey && this.lastSelectedId !== null) {
			const rows = this.getVisibleRows();
			const fromIndex = rows.findIndex((row) => row.id === this.lastSelectedId);
			const toIndex = rows.findIndex((row) => row.id === id);
			if (fromIndex !== -1 && toIndex !== -1) {
				const [start, end] = [fromIndex, toIndex].sort((a, b) => a - b);
				for (let i = start; i <= end; i++) this.selectedIds.add(rows[i].id);
			}
		} else if (event.metaKey || event.ctrlKey) {
			if (this.selectedIds.has(id)) this.selectedIds.delete(id);
			else this.selectedIds.add(id);
			this.lastSelectedId = id;
		} else {
			this.selectedIds.clear();
			this.selectedIds.add(id);
			this.lastSelectedId = id;
		}
	}

	selectAll() {
		this.selectedIds.clear();
		for (const el of this.elements) this.selectedIds.add(el.id);
	}

	// bulk-replace the selection - used by the canvas's own marquee (drag-to-
	// select) instead of the click/ctrl/shift rules in handleSelect above.
	setSelection(ids: string[]) {
		this.selectedIds.clear();
		for (const id of ids) this.selectedIds.add(id);
		this.lastSelectedId = ids.length > 0 ? ids[ids.length - 1] : null;
	}

	// shift-click on the canvas: add/remove just this one element, leaving
	// the rest of the selection untouched. Unlike the layers panel (where
	// shift range-selects over the rows' visual order), canvas elements
	// don't have a meaningful line to range over, so shift always toggles.
	toggleSelection(id: string) {
		if (this.selectedIds.has(id)) this.selectedIds.delete(id);
		else this.selectedIds.add(id);
		this.lastSelectedId = id;
	}

	startRename(node: CanvasNode) {
		this.editingId = node.id;
		this.editingValue = node.label;
	}

	commitRename() {
		if (this.editingId === null) return;
		const trimmed = this.editingValue.trim();
		if (trimmed) {
			const node = this.findNode(this.editingId);
			if (node) node.label = trimmed;
		}
		this.editingId = null;
	}

	cancelRename() {
		this.editingId = null;
	}

	#cloneElement(element: CanvasElement): CanvasElement {
		return {
			...element,
			id: crypto.randomUUID(),
			label: `${element.label} copy`,
			x: element.x + 16,
			y: element.y + 16,
			properties: { ...element.properties }
		};
	}

	duplicateSelected() {
		const next: CanvasNode[] = [];
		for (const node of this.nodes) {
			if (node.kind === 'group') {
				const children: CanvasElement[] = [];
				for (const child of node.children) {
					children.push(child);
					if (this.selectedIds.has(child.id)) children.push(this.#cloneElement(child));
				}
				next.push({ ...node, children });
				if (this.selectedIds.has(node.id)) {
					next.push({
						...node,
						id: crypto.randomUUID(),
						label: `${node.label} copy`,
						children: node.children.map((child) => this.#cloneElement(child))
					});
				}
			} else {
				next.push(node);
				if (this.selectedIds.has(node.id)) next.push(this.#cloneElement(node));
			}
		}
		this.nodes = next;
	}

	copySelected() {
		if (this.selectedIds.size === 0) return;
		const picked: CanvasNode[] = [];
		for (const node of this.nodes) {
			if (this.selectedIds.has(node.id)) {
				picked.push(node);
			} else if (node.kind === 'group') {
				const children = node.children.filter((child) => this.selectedIds.has(child.id));
				if (children.length > 0) picked.push({ ...node, children });
			}
		}
		if (picked.length === 0) return;
		// deep clone now, so later edits to the live nodes don't leak into the clipboard.
		this.#clipboard = JSON.parse(JSON.stringify(picked)) as CanvasNode[];
		this.#pasteCount = 0;
	}

	pasteClipboard() {
		if (this.#clipboard.length === 0) return;
		this.#pasteCount += 1;
		const offset = this.#pasteCount * 16;

		const pasted: CanvasNode[] = [];
		const newIds: string[] = [];
		for (const node of this.#clipboard) {
			if (node.kind === 'group') {
				const children = node.children.map((child) => this.#cloneClipboardElement(child, offset));
				const group: CanvasGroup = {
					id: crypto.randomUUID(),
					kind: 'group',
					label: node.label,
					expanded: node.expanded,
					children
				};
				pasted.push(group);
				newIds.push(group.id);
			} else {
				const clone = this.#cloneClipboardElement(node, offset);
				pasted.push(clone);
				newIds.push(clone.id);
			}
		}

		// same rule as add(): freshly placed content goes to the front/top.
		this.nodes.unshift(...pasted);
		this.setSelection(newIds);
	}

	#cloneClipboardElement(element: CanvasElement, offset: number): CanvasElement {
		return {
			...element,
			id: crypto.randomUUID(),
			x: element.x + offset,
			y: element.y + offset,
			properties: { ...element.properties }
		};
	}

	remove(id: string) {
		this.nodes = this.nodes.filter((node) => node.id !== id);
		for (const node of this.nodes) {
			if (node.kind === 'group') node.children = node.children.filter((child) => child.id !== id);
		}
		this.selectedIds.delete(id);
	}

	removeSelected() {
		if (this.selectedIds.size === 0) return;
		this.nodes = this.nodes.filter((node) => !this.selectedIds.has(node.id));
		for (const node of this.nodes) {
			if (node.kind === 'group') {
				node.children = node.children.filter((child) => !this.selectedIds.has(child.id));
			}
		}
		this.selectedIds.clear();
	}

	#reorderWithinScope(toFront: boolean) {
		const topSelected = this.nodes.filter((node) => this.selectedIds.has(node.id));
		if (topSelected.length > 0) {
			const rest = this.nodes.filter((node) => !this.selectedIds.has(node.id));
			this.nodes = toFront ? [...topSelected, ...rest] : [...rest, ...topSelected];
		}
		for (const node of this.nodes) {
			if (node.kind !== 'group') continue;
			const selectedChildren = node.children.filter((child) => this.selectedIds.has(child.id));
			if (selectedChildren.length === 0) continue;
			const restChildren = node.children.filter((child) => !this.selectedIds.has(child.id));
			node.children = toFront
				? [...selectedChildren, ...restChildren]
				: [...restChildren, ...selectedChildren];
		}
	}

	bringToFront() {
		this.#reorderWithinScope(true);
	}

	sendToBack() {
		this.#reorderWithinScope(false);
	}

	groupSelected() {
		const candidates = this.nodes.filter(
			(node): node is CanvasElement => node.kind === 'element' && this.selectedIds.has(node.id)
		);
		if (candidates.length < 2) return;

		const insertIndex = this.nodes.findIndex((node) => node.id === candidates[0].id);
		for (const item of candidates) {
			const idx = this.nodes.findIndex((node) => node.id === item.id);
			this.nodes.splice(idx, 1);
		}

		const group: CanvasGroup = {
			id: crypto.randomUUID(),
			kind: 'group',
			label: 'Group',
			expanded: true,
			children: candidates
		};
		this.nodes.splice(insertIndex, 0, group);

		this.selectedIds.clear();
		this.selectedIds.add(group.id);
	}

	ungroupSelected() {
		const groupIds = this.nodes
			.filter((node): node is CanvasGroup => node.kind === 'group' && this.selectedIds.has(node.id))
			.map((group) => group.id);

		const ungroupedChildIds: string[] = [];
		for (const groupId of groupIds) {
			const idx = this.nodes.findIndex((node) => node.id === groupId);
			const group = this.nodes[idx];
			if (idx === -1 || group.kind !== 'group') continue;
			ungroupedChildIds.push(...group.children.map((child) => child.id));
			this.nodes.splice(idx, 1, ...group.children);
		}

		this.selectedIds.clear();
		for (const id of ungroupedChildIds) this.selectedIds.add(id);
	}

	#selectedElements(): CanvasElement[] {
		return this.elements.filter((el) => this.selectedIds.has(el.id));
	}

	// align/distribute act on the selection's own bounding box (the leftmost
	// edge, shared center, etc. of whatever is currently selected) - same
	// convention as Figma's align toolbar.
	alignLeft() {
		const els = this.#selectedElements();
		if (els.length < 2) return;
		const left = Math.min(...els.map((el) => el.x));
		for (const el of els) el.x = left;
	}

	alignHorizontalCenter() {
		const els = this.#selectedElements();
		if (els.length < 2) return;
		const left = Math.min(...els.map((el) => el.x));
		const right = Math.max(...els.map((el) => el.x + el.width));
		const center = (left + right) / 2;
		for (const el of els) el.x = center - el.width / 2;
	}

	alignRight() {
		const els = this.#selectedElements();
		if (els.length < 2) return;
		const right = Math.max(...els.map((el) => el.x + el.width));
		for (const el of els) el.x = right - el.width;
	}

	alignTop() {
		const els = this.#selectedElements();
		if (els.length < 2) return;
		const top = Math.min(...els.map((el) => el.y));
		for (const el of els) el.y = top;
	}

	alignVerticalCenter() {
		const els = this.#selectedElements();
		if (els.length < 2) return;
		const top = Math.min(...els.map((el) => el.y));
		const bottom = Math.max(...els.map((el) => el.y + el.height));
		const center = (top + bottom) / 2;
		for (const el of els) el.y = center - el.height / 2;
	}

	alignBottom() {
		const els = this.#selectedElements();
		if (els.length < 2) return;
		const bottom = Math.max(...els.map((el) => el.y + el.height));
		for (const el of els) el.y = bottom - el.height;
	}

	// spreads elements out so the gaps between their edges are equal, keeping
	// the leftmost/topmost and rightmost/bottommost elements where they are
	// (only the ones in between actually move).
	distributeHorizontal() {
		const els = this.#selectedElements();
		if (els.length < 3) return;
		const sorted = [...els].sort((a, b) => a.x - b.x);
		const left = sorted[0].x;
		const right = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
		const totalWidth = sorted.reduce((sum, el) => sum + el.width, 0);
		const gap = (right - left - totalWidth) / (sorted.length - 1);
		let cursor = left;
		for (const el of sorted) {
			el.x = cursor;
			cursor += el.width + gap;
		}
	}

	distributeVertical() {
		const els = this.#selectedElements();
		if (els.length < 3) return;
		const sorted = [...els].sort((a, b) => a.y - b.y);
		const top = sorted[0].y;
		const bottom = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
		const totalHeight = sorted.reduce((sum, el) => sum + el.height, 0);
		const gap = (bottom - top - totalHeight) / (sorted.length - 1);
		let cursor = top;
		for (const el of sorted) {
			el.y = cursor;
			cursor += el.height + gap;
		}
	}
}

export const canvasStore = new CanvasStore();
