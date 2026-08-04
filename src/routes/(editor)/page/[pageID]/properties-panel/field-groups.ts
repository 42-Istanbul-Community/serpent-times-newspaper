import type { ComponentField } from '$lib/data/components';

export type FieldGroup = { name: string; fields: ComponentField[] };

// fields carry a `group` (Content/Typography/Appearance/Shadow/...) - this
// buckets them in the order groups first appear, so the panel reads like
// Figma's sectioned properties instead of one long flat list.
export function groupFields(fields: ComponentField[]): FieldGroup[] {
	const groups: FieldGroup[] = [];
	for (const field of fields) {
		let group = groups.find((g) => g.name === field.group);
		if (!group) {
			group = { name: field.group, fields: [] };
			groups.push(group);
		}
		group.fields.push(field);
	}
	return groups;
}
