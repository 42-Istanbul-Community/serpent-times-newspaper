// `{}` gets replaced if present (citation.json's and page-number.json's
// content defaults both use this token); a legacy page-number instance
// created before its default changed has no token at all, so this falls
// back to rendering the value alone.
export function substituteToken(content: string, value: string): string {
	return content.includes('{}') ? content.replaceAll('{}', value) : value;
}

export const SAMPLE_NAME_POOL = [
	'John Doe',
	'Jane Smith',
	'Alice Johnson',
	'Robert Brown',
	'Emily Davis',
	'Michael Wilson',
	'Sophia Martinez',
	'James Taylor',
	'Oliver Thomas',
	'Charlotte White',
	'Daniel Harris',
	'Emma Martin',
	'William Clark',
	'Olivia Lewis',
	'Alexander Walker',
	'Benjamin Hall',
	'Mia Allen',
	'Lucas Young',
	'Harper King',
	'Ethan Wright'
];

function parseLineHeight(lineHeightProp?: string, fontSizePx = 12): number {
	if (!lineHeightProp || lineHeightProp === 'normal') {
		// Browser default normal line-height for sans-serif fonts is ~1.35 - 1.4
		return fontSizePx * 1.35;
	}
	if (lineHeightProp.endsWith('px')) {
		return parseFloat(lineHeightProp) || fontSizePx * 1.35;
	}
	if (lineHeightProp.endsWith('em') || lineHeightProp.endsWith('rem')) {
		return (parseFloat(lineHeightProp) || 1.35) * fontSizePx;
	}
	const val = parseFloat(lineHeightProp);
	return !isNaN(val) ? val * fontSizePx : fontSizePx * 1.35;
}

/**
 * Formats each name using `content` template (e.g. "-{}-" -> "-John Doe-"),
 * joined by newlines.
 */
export function substituteCitation(content: string, names: string[]): string {
	if (!names || names.length === 0) return '';
	const format = content || '{}';
	return names.map((name) => substituteToken(format, name)).join('\n');
}

/**
 * Calculates how many names fit into `height` based on `fontSize` & `lineHeight`
 * and returns array of sample names.
 * Uses a seed (e.g. element ID) so names stay consistent during drag/resize.
 */
export function getSampleCitationNamesForHeight(
	seed = 'citation',
	height = 40,
	fontSize = '12px',
	lineHeightProp = 'normal'
): string[] {
	const fontSizePx = parseFloat(String(fontSize || '12px')) || 12;
	const lineHeightPx = parseLineHeight(lineHeightProp, fontSizePx);
	const availableHeight = Math.max(0, (height || 40) - 4);
	const count = Math.max(1, Math.floor(availableHeight / lineHeightPx));

	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}

	const pool = SAMPLE_NAME_POOL;
	const selected: string[] = [];

	for (let i = 0; i < count; i++) {
		const index = Math.abs(hash + i * 7) % pool.length;
		selected.push(pool[index]);
	}

	return selected;
}

export function getSampleCitationNames(
	seed = 'citation',
	height = 40,
	fontSize = '12px',
	lineHeightProp = 'normal'
): string[] {
	return getSampleCitationNamesForHeight(seed, height, fontSize, lineHeightProp);
}

export const SAMPLE_INDEX_ARTICLES = [
	'The Future of Technology',
	'Global Economic Trends',
	'Art & Modern Culture',
	'Discoveries in Science',
	'The World of Architecture',
	'Philosophy and Thought',
	'Environmental Perspectives',
	'Innovations in Medicine',
	'Travel Around the Globe',
	'The History of Literature',
	'Music and Soundscapes',
	'Exploring Deep Space',
	'Mind & Human Psychology',
	'The Evolution of Cinema',
	'Future Cities and Design'
];

/**
 * Generates dynamic sample index entries ({ title, page }) fitting into `height`
 * based on `fontSize` & `lineHeight`.
 */
export function getSampleIndexEntries(
	seed = 'index',
	height = 500,
	fontSize = '12px',
	lineHeightProp = 'normal'
): { title: string; page: number }[] {
	const fontSizePx = parseFloat(String(fontSize || '12px')) || 12;
	const lineHeightPx = parseLineHeight(lineHeightProp, fontSizePx);
	const availableHeight = Math.max(0, (height || 500) - 4);
	const count = Math.max(1, Math.floor(availableHeight / lineHeightPx));

	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash |= 0;
	}

	const pool = SAMPLE_INDEX_ARTICLES;
	const entries: { title: string; page: number }[] = [];
	let currentPage = 1;

	for (let i = 0; i < count; i++) {
		const index = Math.abs(hash + i * 7) % pool.length;
		entries.push({
			title: pool[index],
			page: currentPage
		});
		currentPage += (i % 3) + 2;
	}

	return entries;
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

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

const MONTH_NAMES_SHORT = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a date using explicit % specifiers:
 * %Y (or %YYYY): 4-digit year (2026)
 * %y (or %YY): 2-digit year (26)
 * %B: Full month name (August)
 * %b: Short month name (Aug)
 * %m (or %MM): 2-digit month (08)
 * %d (or %DD): 2-digit day of month (10)
 * %A: Full weekday name (Monday)
 * %a: Short weekday name (Mon)
 * %H: Hour 24-h clock (00-23)
 * %I: Hour 12-h clock (01-12)
 * %M: Minute (00-59)
 * %S: Second (00-59)
 * %p: am / pm
 * %w: Weekday index (0-6, 0=Sunday)
 * %c: Date & time (10/08/26 01:04:12)
 * %x: Date (10/08/26)
 * %X: Time (01:04:12)
 * %%: Literal % character
 *
 * Using explicit % specifiers prevents accidental replacement of letters in normal text (e.g. "Date: %d.%m.%Y").
 */
export function formatDateToken(format: string, date: Date = new Date()): string {
	if (!format || format === '{}') {
		format = '%d.%m.%Y';
	}

	const year = date.getFullYear();
	const month = date.getMonth(); // 0-11
	const day = date.getDate(); // 1-31
	const dayOfWeek = date.getDay(); // 0-6
	const hours24 = date.getHours(); // 0-23
	const hours12 = hours24 % 12 || 12; // 1-12
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();

	const strY = String(year);
	const stry = String(year).slice(-2);
	const strm = String(month + 1).padStart(2, '0');
	const strd = String(day).padStart(2, '0');
	const strH = String(hours24).padStart(2, '0');
	const strI = String(hours12).padStart(2, '0');
	const strM = String(minutes).padStart(2, '0');
	const strS = String(seconds).padStart(2, '0');

	const dateStr = `${strd}/${strm}/${stry}`;
	const timeStr = `${strH}:${strM}:${strS}`;
	const dateTimeStr = `${dateStr} ${timeStr}`;

	const PERCENT_PLACEHOLDER = '\u0000PERCENT\u0000';
	let fmt = format.replaceAll('%%', PERCENT_PLACEHOLDER);

	// Multi-char alias replacements first
	fmt = fmt
		.replaceAll('%YYYY', strY)
		.replaceAll('%YY', stry)
		.replaceAll('%MM', strm)
		.replaceAll('%DD', strd);

	const map: Record<string, string> = {
		'%a': DAY_NAMES_SHORT[dayOfWeek],
		'%A': DAY_NAMES[dayOfWeek],
		'%b': MONTH_NAMES_SHORT[month],
		'%B': MONTH_NAMES[month],
		'%c': dateTimeStr,
		'%d': strd,
		'%H': strH,
		'%I': strI,
		'%M': strM,
		'%m': strm,
		'%p': hours24 >= 12 ? 'pm' : 'am',
		'%S': strS,
		'%w': String(dayOfWeek),
		'%x': dateStr,
		'%X': timeStr,
		'%Y': strY,
		'%y': stry
	};

	for (const [token, val] of Object.entries(map)) {
		fmt = fmt.replaceAll(token, val);
	}

	return fmt.replaceAll(PERCENT_PLACEHOLDER, '%');
}

