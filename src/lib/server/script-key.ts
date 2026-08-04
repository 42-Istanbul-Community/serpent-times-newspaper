import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

/** Bearer auth for the out-of-band endpoints driven by scripts/. */
export function isScriptKeyAuthorized(request: Request) {
	const key = env.SCRIPT_KEY;
	if (!key) return false;

	const provided = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
	const a = Buffer.from(provided);
	const b = Buffer.from(key);
	return a.length === b.length && timingSafeEqual(a, b);
}
