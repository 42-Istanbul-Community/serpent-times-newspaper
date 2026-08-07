// Uploads through the /api/cdn/<group> API (see
// src/routes/api/cdn/[...path]/+server.ts), scoped per cover/index article:
// plain content images dropped into a manual image slot land under
// /cdn/newspaper/<article-id>/files/, separate from the reserved
// thumbnail.png filename the cover's autosave screenshot writes to (see
// capture-thumbnail.ts). Byte-identical shape to
// ../../writer/[paperID]/upload-image.ts, just a different CDN path segment.
export function createArticleImageUploader(articleId: number) {
	return async function uploadArticleImage(file: File): Promise<string> {
		// avoid collisions within the shared per-article files/ folder.
		const uniqueName = `${crypto.randomUUID()}-${file.name}`;
		const renamed = new File([file], uniqueName, { type: file.type });

		const form = new FormData();
		form.append('file', renamed);

		const response = await fetch(`/api/cdn/newspaper/${articleId}/files`, {
			method: 'POST',
			body: form
		});
		if (!response.ok) throw new Error(`Image upload failed (${response.status})`);

		const { path } = (await response.json()) as { path: string };
		return `/api/cdn/${path}`;
	};
}
