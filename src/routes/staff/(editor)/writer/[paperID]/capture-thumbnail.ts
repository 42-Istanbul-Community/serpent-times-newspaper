import { toBlob } from 'html-to-image';

const PAPER_WIDTH = 720;
const PAPER_HEIGHT = 960;
const PIXEL_RATIO = 0.5;

// Screenshots the currently-rendered page and uploads it as this paper's
// thumbnail, always at the same fixed path
// (cdn/writer/<article-id>/thumbnail.png) so it naturally overwrites on
// every autosave instead of piling up files. Returns the thumbnail's
// displayable URL, or null on any failure (this is a best-effort side
// effect of autosave, never allowed to break it).
export async function captureAndUploadThumbnail(
	articleId: number,
	paperEl: HTMLElement
): Promise<string | null> {
	// capturing paperEl directly (nested inside the scrollable <main>) kept
	// coming out wrong - a different region than the div's own content, most
	// likely html-to-image picking up something from the live ancestor
	// context (scroll position/clipping). Sidestep all of that by capturing
	// an isolated off-screen CLONE instead: same markup/styles, but with no
	// scrollable/clipping ancestors to interfere.
	const clone = paperEl.cloneNode(true) as HTMLElement;
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

		const response = await fetch(`/api/cdn/writer/${articleId}`, { method: 'POST', body: form });
		if (!response.ok) return null;

		const { path } = (await response.json()) as { path: string };
		return `/api/cdn/${path}`;
	} catch {
		return null;
	} finally {
		wrapper.remove();
	}
}
