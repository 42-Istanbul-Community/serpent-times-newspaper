import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type PDFOptions } from 'puppeteer';
import { CDN_ROOT } from '$lib/server/cdn-root';
import { openAppPage } from '$lib/server/browser';

// Renders a same-origin app route to a PDF buffer by actually navigating a
// headless tab to it and printing - reuses whatever Svelte component renders
// that route exactly as a browser would, no separate PDF-layout code to keep
// in sync.
export async function renderPdf(
	origin: string,
	targetPath: string,
	pdfOptions: PDFOptions = {},
	cookie?: string
): Promise<Buffer> {
	const page = await openAppPage(origin, targetPath, { cookie });
	try {
		return Buffer.from(await page.pdf({ printBackground: true, ...pdfOptions }));
	} finally {
		await page.close();
	}
}

// writes the edition's PDF to cdn/newspaper/<editionId>/newspaper.pdf,
// overwriting any previous one - this is the fixed URL the homepage's
// "read online" link points at, so it never needs to be looked up.
export async function saveEditionPdf(editionId: number, pdf: Buffer): Promise<void> {
	const dir = path.join(CDN_ROOT, 'newspaper', String(editionId));
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, 'newspaper.pdf'), pdf);
}

// shared by both the on-demand Download PDF endpoint and the publish-time
// bake below - matches PAPER_WIDTH/PAPER_HEIGHT in page-renderer.svelte
// exactly, one PDF page per 720x960 page, no scaling mismatch.
export function renderEditionPdf(
	origin: string,
	editionId: number,
	cookie: string
): Promise<Buffer> {
	if (!cookie) throw new Error('renderEditionPdf needs the requesting session cookie');

	return renderPdf(
		origin,
		`/staff/newspaper/${editionId}`,
		{
			width: '720px',
			height: '960px',
			margin: { top: '0', bottom: '0', left: '0', right: '0' }
		},
		cookie
	);
}
