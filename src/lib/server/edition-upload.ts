import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pdf } from 'pdf-to-img';
import { CDN_ROOT } from '$lib/server/cdn-root';

// `scale` is a multiplier on the PDF's own point size, so this lands around
// 360px wide for A4/Letter back-issues and a little more for the 720pt pages
// this app bakes - close enough to capture-thumbnail.ts's 360x480 output for
// the same cover slots, and every consumer object-covers it anyway.
const COVER_SCALE = 0.6;

function editionDir(editionId: number) {
	return path.join(CDN_ROOT, 'newspaper', String(editionId));
}

// Stores an uploaded back-issue at the exact path a bake would have written
// (cdn/newspaper/<id>/newspaper.pdf), so every reader of that path - the
// download endpoint, /api/cdn - works without knowing which kind it is.
export async function saveUploadedEditionPdf(editionId: number, bytes: Buffer): Promise<void> {
	const dir = editionDir(editionId);
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'newspaper.pdf'), bytes);
}

// The edition's cover IS its first page, rasterized here rather than asked
// for separately. It lands at cdn/newspaper/<id>/thumbnail.png, the fixed
// name the dashboard, the homepage and the logged-out blur (see preview.ts)
// all read. Returns false if the PDF couldn't be rasterized - an edition
// with no cover still lists fine, so this never fails an upload.
export async function saveEditionCoverFromPdf(
	editionId: number,
	pdfBytes: Buffer
): Promise<boolean> {
	try {
		const document = await pdf(pdfBytes, { scale: COVER_SCALE });
		const firstPage = await document.getPage(1);

		const dir = editionDir(editionId);
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, 'thumbnail.png'), firstPage);
		return true;
	} catch {
		return false;
	}
}

/** The URL of an edition's cover, matching what capture-thumbnail.ts returns. */
export function editionCoverUrl(editionId: number): string {
	return `/api/cdn/newspaper/${editionId}/thumbnail.png`;
}
