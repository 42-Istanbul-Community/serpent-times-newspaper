import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CDN_ROOT } from '$lib/server/cdn-root';
import { getBrowser } from '$lib/server/browser';

const PREVIEW_WIDTH = 360;
const PREVIEW_HEIGHT = 480;
const BLUR_PX = 14;
// blur samples past the image edges, which would fade to the background and
// frame the preview in a halo - overscale so that rim falls outside the shot.
const OVERSCALE = 1.12;

// renders are slow, so a burst of first-time readers shares one.
const inFlight = new Map<number, Promise<Buffer>>();

function editionFile(editionId: number, name: string) {
	return path.join(CDN_ROOT, 'newspaper', String(editionId), name);
}

// The teaser a logged-out reader gets instead of the edition: its cover
// thumbnail with the blur burned into the pixels here, server-side - a CSS
// blur would ship the sharp cover and leave it one devtools toggle away.
// Null when the edition never captured a cover. Cached until the thumbnail
// it was made from changes.
export async function getBlurredCover(editionId: number): Promise<Buffer | null> {
	const source = editionFile(editionId, 'thumbnail.png');
	const cached = editionFile(editionId, 'preview.png');

	const [sourceStat, cachedStat] = await Promise.all([
		stat(source).catch(() => null),
		stat(cached).catch(() => null)
	]);
	if (!sourceStat) return null;
	if (cachedStat && cachedStat.mtimeMs >= sourceStat.mtimeMs) return readFile(cached);

	let pending = inFlight.get(editionId);
	if (!pending) {
		pending = renderBlurredCover(source, cached).finally(() => inFlight.delete(editionId));
		inFlight.set(editionId, pending);
	}
	return pending;
}

async function renderBlurredCover(source: string, cached: string): Promise<Buffer> {
	const dataUri = `data:image/png;base64,${(await readFile(source)).toString('base64')}`;
	const browser = await getBrowser();
	const tab = await browser.newPage();
	try {
		await tab.setViewport({ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT });
		await tab.setContent(
			`<style>
				html, body { margin: 0; height: 100%; overflow: hidden; background: #fbf8f1; }
				img {
					width: 100%;
					height: 100%;
					object-fit: cover;
					filter: blur(${BLUR_PX}px);
					transform: scale(${OVERSCALE});
				}
			</style>
			<img src="${dataUri}" alt="">`,
			{ waitUntil: 'load' }
		);

		const png = Buffer.from(await tab.screenshot({ type: 'png' }));
		await writeFile(cached, png);
		return png;
	} finally {
		await tab.close();
	}
}
