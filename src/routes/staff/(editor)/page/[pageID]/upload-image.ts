// Uploads through the /api/cdn/<group> API (see
// src/routes/api/cdn/[...path]/+server.ts) instead of inlining images as
// data URLs. Pages don't have a real id yet (this editor isn't wired to the
// database), so everything lands in the shared /cdn/page/ bucket for now -
// once a page has an id this should become /cdn/page/<page-id>/ instead.
const CDN_GROUP = 'page';

export async function uploadImage(file: File): Promise<string> {
	// avoid collisions in the shared bucket until uploads are scoped per page.
	const uniqueName = `${crypto.randomUUID()}-${file.name}`;
	const renamed = new File([file], uniqueName, { type: file.type });

	const form = new FormData();
	form.append('file', renamed);

	const response = await fetch(`/api/cdn/${CDN_GROUP}`, { method: 'POST', body: form });
	if (!response.ok) throw new Error(`Image upload failed (${response.status})`);

	const { path } = (await response.json()) as { path: string };
	return `/api/cdn/${path}`;
}
