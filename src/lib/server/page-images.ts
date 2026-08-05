import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CDN_ROOT } from '$lib/server/cdn-root';
import { openAppPage } from '$lib/server/browser';

// pages are 720x960 CSS px (page-renderer.svelte); 1.5x and JPEG keep them
// crisp in the reader without shipping a megabyte per page.
const SCALE = 1.5;
const QUALITY = 82;

function pagesDir(editionId: number) {
	return path.join(CDN_ROOT, 'newspaper', String(editionId), 'pages');
}

export function pageImagePath(editionId: number, index: number) {
	return path.join(pagesDir(editionId), `${String(index).padStart(3, '0')}.jpg`);
}

export async function countEditionPageImages(editionId: number): Promise<number> {
	const entries = await readdir(pagesDir(editionId)).catch(() => []);
	return entries.filter((name) => name.endsWith('.jpg')).length;
}

// Screenshots every page of the edition's editor route into
// cdn/newspaper/<id>/pages/ - the homepage reader scrolls these instead of
// rasterizing the PDF in the browser. Printed media is emulated because the
// route's print CSS is what strips the manual-slot editing chrome, exactly
// as the PDF bake relies on.
export async function saveEditionPageImages(
	origin: string,
	editionId: number,
	cookie: string
): Promise<number> {
	if (!cookie) throw new Error('saveEditionPageImages needs the requesting session cookie');

	const tab = await openAppPage(origin, `/staff/newspaper/${editionId}`, {
		cookie,
		mediaType: 'print',
		viewport: { width: 900, height: 1200, deviceScaleFactor: SCALE }
	});

	try {
		const pages = await tab.$$('.pdf-stack > *');
		const dir = pagesDir(editionId);
		// a re-bake of a now-shorter edition would otherwise leave the dropped
		// pages behind for the reader to count.
		await rm(dir, { recursive: true, force: true });
		await mkdir(dir, { recursive: true });

		for (const [index, element] of pages.entries()) {
			const shot = await element.screenshot({ type: 'jpeg', quality: QUALITY });
			await writeFile(pageImagePath(editionId, index + 1), Buffer.from(shot));
		}

		return pages.length;
	} finally {
		await tab.close();
	}
}
