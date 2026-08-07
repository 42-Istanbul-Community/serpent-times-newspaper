export type ComponentFieldType =
	'text' | 'textarea' | 'number' | 'color' | 'select' | 'toggle' | 'image';

export type ComponentField = {
	key: string;
	label: string;
	type: ComponentFieldType;
	options?: string[];
	// which section of the properties panel this field is grouped
	// under (e.g. "Content", "Typography", "Appearance", "Shadow").
	group: string;
};

export type ComponentSchema = {
	type: string;
	label: string;
	defaultWidth: number;
	defaultHeight: number;
	// starting values for a freshly-placed instance of this component.
	properties: Record<string, string>;
	// describes the editable controls the properties panel builds for this
	// component - each key here should exist in `properties`.
	fields: ComponentField[];
};
