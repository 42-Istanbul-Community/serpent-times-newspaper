// `{}` gets replaced if present (citation.json's and page-number.json's
// content defaults both use this token); a legacy page-number instance
// created before its default changed has no token at all, so this falls
// back to rendering the value alone.
export function substituteToken(content: string, value: string): string {
	return content.includes('{}') ? content.replaceAll('{}', value) : value;
}

// Builds an `index`-type component's rendered content: one line per body
// paper included in the edition, `entryFormat` (e.g. "{title} .... {page}")
// applied to each. Joined with `\n` - the renderer applies `white-space:
// pre-line` so these actually break onto separate lines.
export function buildIndexContent(
	entryFormat: string,
	entries: { title: string; page: number }[]
): string {
	return entries
		.map((entry) =>
			entryFormat.replaceAll('{title}', entry.title).replaceAll('{page}', String(entry.page))
		)
		.join('\n');
}
