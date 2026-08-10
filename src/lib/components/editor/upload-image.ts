// Uploads through the /api/cdn/<group> API (see
// src/routes/api/cdn/[...path]/+server.ts). Shared by all three editors
// (page designer, writer, newspaper) - each supplies its own CDN path.
async function uploadTo(endpoint: string, file: File): Promise<string> {
	// avoid collisions within the destination folder.
	const uniqueName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
	const renamed = new File([file], uniqueName, { type: file.type });

	const form = new FormData();
	form.append('file', renamed);

	const response = await fetch(endpoint, { method: 'POST', body: form });
	if (!response.ok) throw new Error(`Image upload failed (${response.status})`);

	const { path } = (await response.json()) as { path: string };
	return `/api/cdn/${path}`;
}

// Default fallback uploader
export function uploadImage(file: File, pageId?: number): Promise<string> {
	if (pageId) {
		return uploadTo(`/api/cdn/page/${pageId}/files`, file);
	}
	return uploadTo('/api/cdn/page', file);
}

// Standardized uploader for all editors: /cdn/<category>/<id>/files/<filename>
export function createScopedImageUploader(
	group: 'writer' | 'newspaper' | 'page' | 'page-template',
	id: number
) {
	return (file: File) => uploadTo(`/api/cdn/${group}/${id}/files`, file);
}

export function createArticleImageUploader(group: 'writer' | 'newspaper', articleId: number) {
	return createScopedImageUploader(group, articleId);
}
