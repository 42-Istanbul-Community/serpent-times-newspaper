import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { admin, genericOAuth } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { oauthSecret } from '$lib/server/db/schema';

async function getIntraClientSecret() {
	const [row] = await db
		.select({ secret: oauthSecret.secret })
		.from(oauthSecret)
		.where(eq(oauthSecret.providerId, 'intra'));
	if (!row) throw new Error('Intra client secret is not set. POST it to /api/intra-secret first.');
	return row.secret;
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: 'intra',
					clientId: env.INTRA_CLIENT_ID ?? '',
					authorizationUrl: 'https://api.intra.42.fr/oauth/authorize',
					tokenUrl: 'https://api.intra.42.fr/oauth/token',
					userInfoUrl: 'https://api.intra.42.fr/v2/me',
					scopes: ['public'],
					overrideUserInfo: true,
					getToken: async ({ code, redirectURI }) => {
						const clientSecret = await getIntraClientSecret();
						const res = await fetch('https://api.intra.42.fr/oauth/token', {
							method: 'POST',
							headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
							body: new URLSearchParams({
								grant_type: 'authorization_code',
								code,
								redirect_uri: redirectURI,
								client_id: env.INTRA_CLIENT_ID ?? '',
								client_secret: clientSecret
							})
						});
						if (!res.ok) {
							throw new Error(`Intra token exchange failed: ${res.status} ${await res.text()}`);
						}
						const data = await res.json();
						return {
							tokenType: data.token_type,
							accessToken: data.access_token,
							refreshToken: data.refresh_token,
							accessTokenExpiresAt: data.expires_in
								? new Date(Date.now() + data.expires_in * 1000)
								: undefined,
							scopes: data.scope ? data.scope.split(' ') : undefined,
							raw: data
						};
					},
					getUserInfo: async (tokens) => {
						const res = await fetch('https://api.intra.42.fr/v2/me', {
							headers: { Authorization: `Bearer ${tokens.accessToken}` }
						});
						const profile = await res.json();
						return {
							id: profile.id,
							email: profile.email,
							emailVerified: true,
							name: profile.login,
							image: profile.image?.link
						};
					}
				}
			]
		}),
		admin(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
