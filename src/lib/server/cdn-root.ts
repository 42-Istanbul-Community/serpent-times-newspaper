import { env } from '$env/dynamic/private';
import path from 'node:path';

// overridable via CDN_ROOT in .env (e.g. to point at a mounted volume once
// this runs in Docker) - defaults to ./cdn under the project root for local
// dev. Single source of truth for both the /api/cdn/[...path] endpoint and
// anything writing to the CDN directly server-side (e.g. lib/server/pdf.ts).
export const CDN_ROOT = path.resolve(env.CDN_ROOT || path.resolve(process.cwd(), 'cdn'));
