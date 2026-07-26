import { env } from '$env/dynamic/private';
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { admin, genericOAuth } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

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
					clientSecret: env.INTRA_CLIENT_SECRET ?? '',
					authorizationUrl: 'https://api.intra.42.fr/oauth/authorize',
					tokenUrl: 'https://api.intra.42.fr/oauth/token',
					userInfoUrl: 'https://api.intra.42.fr/v2/me',
					scopes: ['public'],
					overrideUserInfo: true,
					// better-auth's default getUserInfo assumes an OIDC-style flat `picture`
					// field and overwrites `image` with it, clobbering 42's nested
					// `image.link` field before mapProfileToUser ever runs. Fetch and
					// flatten the profile ourselves instead.
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
