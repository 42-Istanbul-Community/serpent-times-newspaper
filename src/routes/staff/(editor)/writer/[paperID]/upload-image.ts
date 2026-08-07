// Uploads through the /api/cdn/<group> API (see
// src/routes/api/cdn/[...path]/+server.ts), scoped per paper (the article
// id): plain content images a writer drops into a manual image slot land
// under /cdn/writer/<article-id>/files/, separate from the reserved
// thumbnail.png filename the autosave screenshot writes to the same
// article's folder (see capture-thumbnail.ts).
export function createArticleImageUploader(articleId: number) {
	return async function uploadArticleImage(file: File): Promise<string> {
		// avoid collisions within the shared per-article files/ folder.
		const uniqueName = `${crypto.randomUUID()}-${file.name}`;
		const renamed = new File([file], uniqueName, { type: file.type });

		const form = new FormData();
		form.append('file', renamed);

		const response = await fetch(`/api/cdn/writer/${articleId}/files`, {
			method: 'POST',
			body: form
		});
		if (!response.ok) throw new Error(`Image upload failed (${response.status})`);

		const { path } = (await response.json()) as { path: string };
		return `/api/cdn/${path}`;
	};
}
