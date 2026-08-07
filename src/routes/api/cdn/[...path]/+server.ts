import { error, json } from '@sveltejs/kit';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CDN_ROOT } from '$lib/server/cdn-root';
import { requireSectionUserId } from '$lib/server/require-login';
import type { RequestHandler } from './$types';

const CONTENT_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.avif': 'image/avif',
	'.pdf': 'application/pdf'
};

function resolveCdnPath(segments: string) {
	const target = path.resolve(CDN_ROOT, segments);
	if (target !== CDN_ROOT && !target.startsWith(CDN_ROOT + path.sep)) {
		error(400, 'Invalid path');
	}
	return target;
}

function sanitizeFilename(name: string) {
	return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

// GET /api/cdn/<group/path?> — a file streams its raw bytes (e.g. for
// <img src>), a group lists its files/subgroups as JSON.
export const GET: RequestHandler = async ({ params, locals }) => {
	const target = resolveCdnPath(params.path ?? '');
	const targetStat = await stat(target).catch(() => null);
	if (!targetStat) {
		error(404, 'Not found');
	}

	if (targetStat.isFile()) {
		const extension = path.extname(target).toLowerCase();
		// the baked edition PDFs live here and are the whole newspaper - a
		// logged-out reader only ever gets the blurred cover, so the direct URL
		// must not hand them the real thing. Images stay public.
		const isPdf = extension === '.pdf';
		if (isPdf && !locals.user) {
			error(401, 'Not authenticated');
		}

		const contentType = CONTENT_TYPES[extension] ?? 'application/octet-stream';
		const bytes = await readFile(target);
		return new Response(bytes, {
			headers: {
				'content-type': contentType,
				// PDFs are session-dependent, so never shared-cacheable.
				'cache-control': isPdf
					? 'private, max-age=0, must-revalidate'
					: 'public, max-age=31536000, immutable'
			}
		});
	}

	const entries = await readdir(target, { withFileTypes: true });
	const items = await Promise.all(
		entries.map(async (entry) => {
			const entryStat = await stat(path.join(target, entry.name));
			return {
				name: entry.name,
				type: entry.isDirectory() ? 'group' : 'file',
				size: entryStat.size,
				modifiedAt: entryStat.mtime.toISOString()
			};
		})
	);

	return json({ path: params.path ?? '', items });
};

// POST /api/cdn/<group/path?> — multipart form with a `file` field, uploads into that group
// (missing groups in the path are created automatically)
export const POST: RequestHandler = async ({ params, request, locals }) => {
	await requireSectionUserId(locals, 'page', 'newspaper', 'writer');

	const dir = resolveCdnPath(params.path ?? '');

	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) {
		error(400, 'Missing file');
	}

	await mkdir(dir, { recursive: true });

	const filename = sanitizeFilename(file.name);
	await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

	const uploadedPath = params.path ? `${params.path}/${filename}` : filename;
	return json({ path: uploadedPath, size: file.size });
};

// DELETE /api/cdn/<group/path> — deletes a file, or a whole group (recursively) if given a folder
export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireSectionUserId(locals, 'page', 'newspaper', 'writer');

	const target = resolveCdnPath(params.path ?? '');
	if (target === CDN_ROOT) {
		error(400, 'Cannot delete the CDN root');
	}

	await rm(target, { recursive: true, force: true });
	return json({ deleted: params.path });
};
