// Hydrates the canvas/identity singletons from a loaded pageTemplate row and
// debounce-autosaves them back. canvasStore/identityState are module-level
// singletons (not per-page-instance state), so this also has to handle
// client-side pageID -> pageID navigation, where +page.svelte is reused
// rather than remounted - hydrate() resets the singletons whenever the
// loaded row's id changes, and a snapshot compare (the same idiom
// canvas-history.ts uses for undo) stops a hydration from immediately
// triggering a spurious autosave.
import { canvasStore, type CanvasNode } from './canvas-state.svelte';
import { captureAndUploadThumbnail } from './capture-thumbnail';
import { identityState } from './template-panel/identity-state.svelte';
import type { pageTemplate } from '$lib/server/db/schema';

type TemplateRow = typeof pageTemplate.$inferSelect;

// longer than canvas-history.ts's 400ms undo debounce, so a single user
// gesture (which already collapses to one undo step at 400ms) also
// collapses to at most one network write.
const SAVE_DEBOUNCE_MS = 1000;

function snapshotOf(
	id: number,
	nodes: CanvasNode[],
	title: string,
	description: string,
	category: string
) {
	return JSON.stringify({ id, nodes, title, description, category });
}

class TemplateSync {
	#hydratedId: number | null = null;
	#lastSavedSnapshot = '';
	#timer: ReturnType<typeof setTimeout> | undefined;
	#capturingThumbnail = false;
	saving = $state(false);
	// mirrors the DB row's availability - read by the topbar's Approve
	// button (both to label itself and to know what to PATCH).
	availability = $state<TemplateRow['availability']>('draft');

	// called from an $effect keyed on the loaded row - resets the singletons
	// to exactly match the server row, then snapshots that state so the very
	// next autosave-effect tick sees "no change" and skips the network call.
	hydrate(row: TemplateRow) {
		if (this.#hydratedId === row.id) return;
		clearTimeout(this.#timer); // kill any pending save armed for the PREVIOUS id
		this.#timer = undefined;

		canvasStore.nodes = (row.elements ?? []) as CanvasNode[];
		canvasStore.selectedIds.clear();
		canvasStore.lastSelectedId = null;
		canvasStore.editingId = null;

		identityState.title = row.title;
		identityState.description = row.description ?? '';
		identityState.category = row.category;

		this.#hydratedId = row.id;
		this.availability = row.availability;
		this.#lastSavedSnapshot = snapshotOf(
			row.id,
			canvasStore.nodes,
			row.title,
			row.description ?? '',
			row.category
		);
	}

	// called from an $effect that deep-reads canvasStore.nodes + the identity
	// fields on every change.
	track(id: number, nodes: CanvasNode[], title: string, description: string, category: string) {
		if (id !== this.#hydratedId) return; // load hasn't hydrated this id yet - never save
		const snapshot = snapshotOf(id, nodes, title, description, category);
		if (snapshot === this.#lastSavedSnapshot) return; // also covers the post-hydrate no-op tick
		clearTimeout(this.#timer);
		this.#timer = setTimeout(
			() => this.#save(id, nodes, title, description, category, snapshot),
			SAVE_DEBOUNCE_MS
		);
	}

	async #save(
		id: number,
		nodes: CanvasNode[],
		title: string,
		description: string,
		category: string,
		snapshot: string
	) {
		this.saving = true;
		try {
			const res = await fetch(`/api/page-template/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ elements: nodes, title, description, category })
			});
			// only mark saved on success - a failed request leaves the snapshot
			// stale, so the next edit (or effect tick) retries it.
			if (res.ok) {
				this.#lastSavedSnapshot = snapshot;
				// fire-and-forget: the thumbnail is a best-effort side effect of a
				// successful save, not part of what "Saving..." represents.
				this.#refreshThumbnail(id);
			}
		} finally {
			this.saving = false;
		}
	}

	async #refreshThumbnail(id: number) {
		if (this.#capturingThumbnail || !canvasStore.paperEl) return;
		this.#capturingThumbnail = true;
		try {
			const cdnUrl = await captureAndUploadThumbnail(id, canvasStore.paperEl);
			if (!cdnUrl) return;
			await fetch(`/api/page-template/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ cdnUrl })
			});
		} finally {
			this.#capturingThumbnail = false;
		}
	}

	// the topbar's "Approve" button - moves a draft out of draft. Goes
	// through the same saving indicator as autosave.
	async approve(id: number) {
		this.saving = true;
		try {
			const res = await fetch(`/api/page-template/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ availability: 'unused' })
			});
			if (res.ok) this.availability = 'unused';
		} finally {
			this.saving = false;
		}
	}
}

export const templateSync = new TemplateSync();
