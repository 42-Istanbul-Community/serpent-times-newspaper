import { fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq } from 'drizzle-orm';
import { resolve } from '$app/paths';
import { db } from '$lib/server/db';
import { newspaperEdition } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/require-login';
import {
	editionCoverUrl,
	saveEditionCoverFromPdf,
	saveUploadedEditionPdf
} from '$lib/server/edition-upload';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = requireUserId(locals);
	const editions = await db
		.select({
			id: newspaperEdition.id,
			title: newspaperEdition.title,
			status: newspaperEdition.status,
			kind: newspaperEdition.kind,
			articleIds: newspaperEdition.articleIds,
			cdnUrl: newspaperEdition.cdnUrl
		})
		.from(newspaperEdition)
		.where(eq(newspaperEdition.userId, userId))
		.orderBy(asc(newspaperEdition.position), desc(newspaperEdition.updatedAt));

	return { editions };
};

export const actions: Actions = {
	// creates an empty draft edition and redirects straight into its editor.
	create: async ({ locals }) => {
		const userId = requireUserId(locals);
		const [row] = await db
			.insert(newspaperEdition)
			.values({ userId, title: 'Untitled' })
			.returning({ id: newspaperEdition.id });

		redirect(303, resolve('/staff/(editor)/newspaper/[editionID]', { editionID: String(row.id) }));
	},
	// uploads a back-issue that only exists as a PDF. It becomes a real
	// edition row (so it lists and publishes like any other) with kind='pdf':
	// nothing to assemble, nothing to edit, and the file itself is what a
	// reader gets. Its cover is its own first page, rasterized server-side.
	uploadPdf: async ({ request, locals }) => {
		const userId = requireUserId(locals);
		const form = await request.formData();

		const title = String(form.get('title') ?? '').trim();
		const file = form.get('file');

		if (!title) return fail(400, { upload: 'Give the edition a title.' });
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { upload: 'Pick a PDF to upload.' });
		}
		if (file.type !== 'application/pdf') {
			return fail(400, { upload: 'That file is not a PDF.' });
		}

		// the row comes first: every stored path is keyed by the edition id.
		const [row] = await db
			.insert(newspaperEdition)
			.values({ userId, title, kind: 'pdf' })
			.returning({ id: newspaperEdition.id });

		const bytes = Buffer.from(await file.arrayBuffer());
		await saveUploadedEditionPdf(row.id, bytes);
		if (await saveEditionCoverFromPdf(row.id, bytes)) {
			await db
				.update(newspaperEdition)
				.set({ cdnUrl: editionCoverUrl(row.id) })
				.where(eq(newspaperEdition.id, row.id));
		}

		return { success: true };
	},
	// moves an edition one slot up or down the reading order. The neighbour
	// it swaps with is the next one in the SAME tab (published and drafts are
	// listed separately, so swapping past a row the user can't see would look
	// like the button did nothing), and the whole list is then renumbered:
	// rows that predate this column all sit at position 0, where swapping two
	// zeroes would change nothing at all.
	move: async ({ request, locals }) => {
		const userId = requireUserId(locals);
		const form = await request.formData();
		const id = Number(form.get('id'));
		const direction = form.get('direction');

		if (!Number.isInteger(id)) return fail(400, { message: 'Invalid id' });
		if (direction !== 'up' && direction !== 'down') return fail(400, { message: 'Invalid move' });

		const rows = await db
			.select({ id: newspaperEdition.id, status: newspaperEdition.status })
			.from(newspaperEdition)
			.where(eq(newspaperEdition.userId, userId))
			.orderBy(asc(newspaperEdition.position), desc(newspaperEdition.updatedAt));

		const target = rows.find((row) => row.id === id);
		if (!target) return fail(404, { message: 'Not found' });

		const sameTab = rows.filter((row) => row.status === target.status);
		const at = sameTab.findIndex((row) => row.id === id);
		const neighbour = sameTab[direction === 'up' ? at - 1 : at + 1];
		if (!neighbour) return { success: true }; // already at the end of its tab

		const order = rows.map((row) => row.id);
		const from = order.indexOf(id);
		const to = order.indexOf(neighbour.id);
		[order[from], order[to]] = [order[to], order[from]];

		await Promise.all(
			order.map((rowId, index) =>
				db
					.update(newspaperEdition)
					.set({ position: index })
					.where(and(eq(newspaperEdition.id, rowId), eq(newspaperEdition.userId, userId)))
			)
		);

		return { success: true };
	},
	// drafts only - a published edition is what readers are pointed at.
	delete: async ({ request, locals }) => {
		const userId = requireUserId(locals);
		const id = Number((await request.formData()).get('id'));
		if (!Number.isInteger(id)) return fail(400, { message: 'Invalid id' });

		await db
			.delete(newspaperEdition)
			.where(
				and(
					eq(newspaperEdition.id, id),
					eq(newspaperEdition.userId, userId),
					eq(newspaperEdition.status, 'draft')
				)
			);

		return { success: true };
	}
};
