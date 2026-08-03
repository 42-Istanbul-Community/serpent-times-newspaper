import type { ComponentField } from './schema';

// Shared across *every* component type - a fill, a border and a corner
// radius make sense on text, an image or a plain rectangle alike (this is
// also what Moveable's Roundable ability edits directly on the shape).
export const appearanceProperties: Record<string, string> = {
	opacity: '100',
	backgroundColor: 'transparent',
	borderColor: '#2b2a27',
	borderWidth: '0px',
	borderRadius: '0px'
};

export const appearanceFields: ComponentField[] = [
	{ key: 'backgroundColor', label: 'Fill', type: 'color', group: 'Appearance' },
	{ key: 'borderColor', label: 'Border Color', type: 'color', group: 'Appearance' },
	{
		key: 'borderWidth',
		label: 'Border Width',
		type: 'select',
		options: ['0px', '1px', '2px', '4px', '8px'],
		group: 'Appearance'
	},
	{
		key: 'borderRadius',
		label: 'Corner Radius',
		type: 'select',
		options: ['0px', '4px', '8px', '16px', '24px', '9999px'],
		group: 'Appearance'
	},
	{ key: 'opacity', label: 'Opacity %', type: 'number', group: 'Appearance' }
];

// A drop shadow around the element's box - also universal, so it's a
// box-shadow on the shape itself rather than a text-hugging text-shadow.
export const shadowProperties: Record<string, string> = {
	shadowColor: '#000000',
	shadowBlur: '0px',
	shadowOffsetX: '0px',
	shadowOffsetY: '0px'
};

export const shadowFields: ComponentField[] = [
	{ key: 'shadowColor', label: 'Shadow Color', type: 'color', group: 'Shadow' },
	{
		key: 'shadowBlur',
		label: 'Shadow Blur',
		type: 'select',
		options: ['0px', '2px', '4px', '8px', '12px', '16px'],
		group: 'Shadow'
	},
	{
		key: 'shadowOffsetX',
		label: 'Shadow X',
		type: 'select',
		options: ['-8px', '-4px', '-2px', '0px', '2px', '4px', '8px'],
		group: 'Shadow'
	},
	{
		key: 'shadowOffsetY',
		label: 'Shadow Y',
		type: 'select',
		options: ['-8px', '-4px', '-2px', '0px', '2px', '4px', '8px'],
		group: 'Shadow'
	}
];

// Shared by every text-rendering type (title, text, page-number, date) -
// not by image or rectangle, which don't render text.
export const typographyProperties: Record<string, string> = {
	fontFamily: 'Roboto Slab',
	fontSize: '16px',
	fontWeight: '400',
	fontStyle: 'normal',
	letterSpacing: '0px',
	lineHeight: '1.4',
	textTransform: 'none',
	textDecoration: 'none',
	textAlign: 'left',
	verticalAlign: 'middle',
	color: '#2b2a27'
};

export const FONT_FAMILY_OPTIONS = [
	'Roboto Slab',
	'Georgia',
	'Arial',
	'Helvetica',
	'Times New Roman',
	'Courier New',
	'Verdana'
];

export const FONT_SIZE_OPTIONS = [
	'10px',
	'12px',
	'14px',
	'16px',
	'18px',
	'20px',
	'24px',
	'28px',
	'32px',
	'40px',
	'48px',
	'56px',
	'64px',
	'72px'
];

export const typographyFields: ComponentField[] = [
	{
		key: 'fontFamily',
		label: 'Font',
		type: 'select',
		options: FONT_FAMILY_OPTIONS,
		group: 'Typography'
	},
	{
		key: 'fontSize',
		label: 'Font Size',
		type: 'select',
		options: FONT_SIZE_OPTIONS,
		group: 'Typography'
	},
	{
		key: 'fontWeight',
		label: 'Weight',
		type: 'select',
		options: ['300', '400', '500', '600', '700', '800', '900'],
		group: 'Typography'
	},
	{
		key: 'fontStyle',
		label: 'Style',
		type: 'select',
		options: ['normal', 'italic'],
		group: 'Typography'
	},
	{
		key: 'textDecoration',
		label: 'Decoration',
		type: 'select',
		options: ['none', 'underline', 'line-through', 'underline line-through'],
		group: 'Typography'
	},
	{
		key: 'textTransform',
		label: 'Case',
		type: 'select',
		options: ['none', 'uppercase', 'lowercase', 'capitalize'],
		group: 'Typography'
	},
	{
		key: 'letterSpacing',
		label: 'Letter Spacing',
		type: 'select',
		options: ['-2px', '-1px', '0px', '1px', '2px', '4px'],
		group: 'Typography'
	},
	{
		key: 'lineHeight',
		label: 'Line Height',
		type: 'select',
		options: ['1', '1.2', '1.4', '1.6', '1.8', '2'],
		group: 'Typography'
	},
	{
		key: 'textAlign',
		label: 'Align',
		type: 'select',
		options: ['left', 'center', 'right', 'justify'],
		group: 'Typography'
	},
	{
		key: 'verticalAlign',
		label: 'Vertical Align',
		type: 'select',
		options: ['top', 'middle', 'bottom'],
		group: 'Typography'
	},
	{ key: 'color', label: 'Text Color', type: 'color', group: 'Typography' }
];
