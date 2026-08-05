import puppeteer, { type Browser } from 'puppeteer';

// One lazily-launched Chromium reused by every render in this process -
// a fresh browser per request would cost ~1s of startup each time.
let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
	if (!browserPromise) browserPromise = puppeteer.launch({ headless: true });
	return browserPromise;
}
