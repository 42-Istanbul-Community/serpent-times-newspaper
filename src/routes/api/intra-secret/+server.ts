import { timingSafeEqual } from 'node:crypto';
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { oauthSecret } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

function isAuthorized(request: Request) {
	const updateKey = env.INTRA_SECRET_UPDATE_KEY;
	if (!updateKey) return false;

	const provided = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
	const a = Buffer.from(provided);
	const b = Buffer.from(updateKey);
	return a.length === b.length && timingSafeEqual(a, b);
}

async function isValidIntraSecret(secret: string) {
	const res = await fetch('https://api.intra.42.fr/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: env.INTRA_CLIENT_ID ?? '',
			client_secret: secret
		})
	});
	return res.ok;
}

export const POST: RequestHandler = async ({ request }) => {
	if (!isAuthorized(request)) return error(401, 'Unauthorized');

	const body = await request.json();
	const secret = body?.secret;
	if (typeof secret !== 'string' || !secret) return error(400, 'Missing "secret" in body');

	if (!(await isValidIntraSecret(secret))) {
		return error(400, "42 rejected this client_id/secret pair - didn't save it");
	}

	await db
		.insert(oauthSecret)
		.values({ providerId: 'intra', secret })
		.onConflictDoUpdate({
			target: oauthSecret.providerId,
			set: { secret, updatedAt: new Date() }
		});

	return json({ ok: true });
};
