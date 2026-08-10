import { toBlob } from 'html-to-image';

const PAPER_WIDTH = 720;
const PAPER_HEIGHT = 960;
const PIXEL_RATIO = 0.5;

// Screenshots a live rendered page/cover and uploads it as a thumbnail,
// always at the same fixed path (per `endpoint`) so it naturally overwrites
// on every autosave instead of piling up files. Returns the thumbnail's
// displayable URL, or null on any failure (this is a best-effort side
// effect of autosave, never allowed to break it). Shared by all three
// editors (page designer, writer, newspaper) - each supplies its own CDN
// endpoint.
export async function captureAndUploadThumbnail(
	endpoint: string,
	el: HTMLElement,
	// only the page designer's pannable/zoomable canvas leaves a live
	// `transform: scale(zoom)` on the element - reset it so the thumbnail
	// always reflects the page at its natural size, not whatever zoom the
	// designer happened to be at.
	{ resetTransform = false }: { resetTransform?: boolean } = {}
): Promise<string | null> {
	// capturing el directly (nested inside a scrollable/zoomed/clipping
	// ancestor) kept coming out as the wrong region instead of its own
	// content, most likely html-to-image picking up something from that live
	// ancestor context (scroll position/zoom transform/clipping). Sidestep
	// all of that by capturing an isolated off-screen CLONE instead: same
	// markup/styles, but with no scrollable/transformed/clipping ancestors
	// to interfere.
	const clone = el.cloneNode(true) as HTMLElement;
	const wrapper = document.createElement('div');
	wrapper.style.position = 'fixed';
	wrapper.style.top = '0';
	wrapper.style.left = '-99999px'; // off-screen, but still rendered/paintable
	wrapper.style.pointerEvents = 'none';
	wrapper.appendChild(clone);
	document.body.appendChild(wrapper);

	try {
		const blob = await toBlob(clone, {
			// cloneNode copies the live element's inline style along with it.
			...(resetTransform ? { style: { transform: 'none' } } : {}),
			pixelRatio: PIXEL_RATIO,
			canvasWidth: PAPER_WIDTH * PIXEL_RATIO,
			canvasHeight: PAPER_HEIGHT * PIXEL_RATIO,
			fontEmbedCSS: '',
			skipFonts: true
		});
		if (!blob) return null;

		const file = new File([blob], 'thumbnail.png', { type: 'image/png' });
		const form = new FormData();
		form.append('file', file);

		const response = await fetch(endpoint, { method: 'POST', body: form });
		if (!response.ok) return null;

		const { path } = (await response.json()) as { path: string };
		return `/api/cdn/${path}`;
	} catch {
		return null;
	} finally {
		wrapper.remove();
	}
}
