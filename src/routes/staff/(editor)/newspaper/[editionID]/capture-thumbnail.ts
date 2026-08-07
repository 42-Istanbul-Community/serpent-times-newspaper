import { toBlob } from 'html-to-image';

const PAPER_WIDTH = 720;
const PAPER_HEIGHT = 960;
const PIXEL_RATIO = 0.5;

// Screenshots the currently-rendered cover and uploads it as this edition's
// thumbnail, always at the same fixed path
// (cdn/newspaper/<edition-id>/thumbnail.png) so it naturally overwrites on
// every autosave instead of piling up files. Returns the thumbnail's
// displayable URL, or null on any failure (this is a best-effort side
// effect of autosave, never allowed to break it). Byte-identical strategy to
// ../../writer/[paperID]/capture-thumbnail.ts - see that file for why the
// off-screen clone is necessary.
export async function captureAndUploadThumbnail(
	editionId: number,
	coverEl: HTMLElement
): Promise<string | null> {
	const clone = coverEl.cloneNode(true) as HTMLElement;
	const wrapper = document.createElement('div');
	wrapper.style.position = 'fixed';
	wrapper.style.top = '0';
	wrapper.style.left = '-99999px'; // off-screen, but still rendered/paintable
	wrapper.style.pointerEvents = 'none';
	wrapper.appendChild(clone);
	document.body.appendChild(wrapper);

	try {
		const blob = await toBlob(clone, {
			pixelRatio: PIXEL_RATIO,
			canvasWidth: PAPER_WIDTH * PIXEL_RATIO,
			canvasHeight: PAPER_HEIGHT * PIXEL_RATIO
		});
		if (!blob) return null;

		const file = new File([blob], 'thumbnail.png', { type: 'image/png' });
		const form = new FormData();
		form.append('file', file);

		const response = await fetch(`/api/cdn/newspaper/${editionId}`, { method: 'POST', body: form });
		if (!response.ok) return null;

		const { path } = (await response.json()) as { path: string };
		return `/api/cdn/${path}`;
	} catch {
		return null;
	} finally {
		wrapper.remove();
	}
}
