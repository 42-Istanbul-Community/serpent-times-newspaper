// Turns a canvas element's `properties` bag into real CSS. Every lookup
// falls back to a sane default so this stays safe to call for component
// types that don't define a given property yet.

// the page/paper's own background - the designer's canvas.svelte applies the
// same two properties via style:background-color/style:background-image
// (kept as separate style: directives there since it also needs bg-cover
// bg-center classes); every other place a template renders is a plain style
// string, so this covers the color+image combo the same way.
export function pageBackgroundStyle(backgroundColor: string, backgroundImage: string): string {
	return [
		`background-color: ${backgroundColor}`,
		`background-image: ${backgroundImage ? `url("${backgroundImage}")` : 'none'}`,
		`background-size: cover`,
		`background-position: center`
	].join('; ');
}

// applied to every element's outer box, regardless of type - fill, border,
// corner radius, opacity and drop shadow all make sense on text, an image
// or a plain rectangle alike.
export function boxAppearanceStyle(properties: Record<string, string>): string {
	const opacity = properties.opacity ? Number(properties.opacity) / 100 : 1;
	return [
		`background-color: ${properties.backgroundColor ?? 'transparent'}`,
		`border: ${properties.borderWidth ?? '0px'} solid ${properties.borderColor ?? 'transparent'}`,
		`border-radius: ${properties.borderRadius ?? '0px'}`,
		`opacity: ${opacity}`,
		`box-shadow: ${boxShadowStyle(properties)}`
	].join('; ');
}

export function boxShadowStyle(properties: Record<string, string>): string {
	const blur = properties.shadowBlur ?? '0px';
	const x = properties.shadowOffsetX ?? '0px';
	const y = properties.shadowOffsetY ?? '0px';
	if (blur === '0px' && x === '0px' && y === '0px') return 'none';
	return `${x} ${y} ${blur} ${properties.shadowColor ?? '#000000'}`;
}

// applied to the text itself, only for types that render text (title, text,
// page-number, date).
export function textBoxStyle(properties: Record<string, string>): string {
	return [
		`font-family: '${properties.fontFamily ?? 'inherit'}', sans-serif`,
		`font-size: ${properties.fontSize ?? '16px'}`,
		`font-weight: ${properties.fontWeight ?? '400'}`,
		`font-style: ${properties.fontStyle ?? 'normal'}`,
		`letter-spacing: ${properties.letterSpacing ?? 'normal'}`,
		`line-height: ${properties.lineHeight ?? 'normal'}`,
		`text-transform: ${properties.textTransform ?? 'none'}`,
		`text-decoration: ${properties.textDecoration ?? 'none'}`,
		`color: ${properties.color ?? '#000000'}`
	].join('; ');
}

export function verticalAlignClass(properties: Record<string, string>): string {
	switch (properties.verticalAlign) {
		case 'top':
			return 'items-start';
		case 'bottom':
			return 'items-end';
		default:
			return 'items-center';
	}
}
