import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer, { type Browser, type PDFOptions } from 'puppeteer';
import { CDN_ROOT } from '$lib/server/cdn-root';

// One headless Chromium instance, launched lazily and reused across every
// PDF request in this process - launching a fresh browser per request would
// make every export pay Chromium's ~1s+ startup cost.
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
	if (!browserPromise) browserPromise = puppeteer.launch({ headless: true });
	return browserPromise;
}

// Renders a same-origin app route to a PDF buffer by actually navigating a
// headless tab to it and printing - reuses whatever Svelte component
// renders that route exactly as a browser would, no separate PDF-layout
// code to keep in sync. `origin` must come from the triggering request's
// own `url.origin` (never a client-supplied value) so this can only ever
// hit routes on the server it's already running on.
export async function renderPdf(
	origin: string,
	targetPath: string,
	pdfOptions: PDFOptions = {}
): Promise<Buffer> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		// a fresh headless tab has no stored theme preference, so mode-watcher
		// falls back to matching the OS/headless default color scheme - which
		// can resolve to dark, painting the app's near-black dark-mode
		// background wherever nothing else is drawn (e.g. the trailing sliver
		// page below). Force light so print output is never theme-dependent.
		await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
		await page.goto(`${origin}${targetPath}`, { waitUntil: 'networkidle0' });
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
export function renderEditionPdf(origin: string, editionId: number): Promise<Buffer> {
	return renderPdf(origin, `/newspaper/${editionId}`, {
		width: '720px',
		height: '960px',
		margin: { top: '0', bottom: '0', left: '0', right: '0' }
	});
}
