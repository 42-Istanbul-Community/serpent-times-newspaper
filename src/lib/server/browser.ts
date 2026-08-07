import puppeteer, { type Browser, type Page, type Viewport } from 'puppeteer';
import { env } from '$env/dynamic/private';

// One lazily-launched Chromium reused by every render in this process -
// a fresh browser per request would cost ~1s of startup each time.
let browserPromise: Promise<Browser> | null = null;

// Chromium's own sandbox needs privileges a container does not get by default,
// so the image passes --no-sandbox here rather than the flag being hardcoded
// for everyone. Comma-separated.
const launchArgs = env.PUPPETEER_ARGS?.split(',').filter(Boolean) ?? [];

export function getBrowser(): Promise<Browser> {
	if (!browserPromise) browserPromise = puppeteer.launch({ headless: true, args: launchArgs });
	return browserPromise;
}

// Opens a same-origin app route in a headless tab and hands it back for the
// caller to print or screenshot (and to close). `origin` must come from the
// triggering request's own `url.origin`, never a client-supplied value, so
// this can only ever hit routes on the server it is already running on.
export async function openAppPage(
	origin: string,
	targetPath: string,
	options: { cookie?: string; viewport?: Viewport; mediaType?: 'screen' | 'print' } = {}
): Promise<Page> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		if (options.viewport) await page.setViewport(options.viewport);
		// the editor routes are behind a session, and a headless tab has none -
		// it would just be redirected to the homepage. Replaying the triggering
		// request's cookie renders the page as its own user. Per-page headers,
		// not browser-wide: the browser is shared.
		if (options.cookie) await page.setExtraHTTPHeaders({ cookie: options.cookie });
		// a fresh tab has no stored theme preference, so mode-watcher falls back
		// to the headless default color scheme - which can resolve to dark and
		// paint the app's near-black background into the output.
		await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
		if (options.mediaType) await page.emulateMediaType(options.mediaType);

		const response = await page.goto(`${origin}${targetPath}`, { waitUntil: 'networkidle0' });

		// a guard redirect would otherwise be captured as a perfectly valid
		// render of the wrong page.
		const landed = new URL(response?.url() ?? page.url()).pathname;
		if (landed !== targetPath) {
			throw new Error(`Render of ${targetPath} was redirected to ${landed}`);
		}

		return page;
	} catch (err) {
		await page.close();
		throw err;
	}
}
