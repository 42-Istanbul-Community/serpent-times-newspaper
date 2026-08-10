export interface FontItem {
	name: string;
	category: 'system' | 'google' | 'custom';
	url?: string;
}

export const INITIAL_FONTS: FontItem[] = [
	{ name: 'Roboto Slab', category: 'system' },
	{ name: 'Georgia', category: 'system' },
	{ name: 'Arial', category: 'system' },
	{ name: 'Helvetica', category: 'system' },
	{ name: 'Times New Roman', category: 'system' },
	{ name: 'Courier New', category: 'system' },
	{ name: 'Verdana', category: 'system' }
];

export const POPULAR_GOOGLE_FONTS: FontItem[] = [
	{ name: 'Inter', category: 'google' },
	{ name: 'Outfit', category: 'google' },
	{ name: 'Playfair Display', category: 'google' },
	{ name: 'Cinzel', category: 'google' },
	{ name: 'Montserrat', category: 'google' },
	{ name: 'Roboto', category: 'google' },
	{ name: 'Lora', category: 'google' },
	{ name: 'Oswald', category: 'google' },
	{ name: 'Merriweather', category: 'google' },
	{ name: 'Poppins', category: 'google' },
	{ name: 'Fira Code', category: 'google' },
	{ name: 'Dancing Script', category: 'google' },
	{ name: 'Caveat', category: 'google' },
	{ name: 'Abril Fatface', category: 'google' },
	{ name: 'Bebas Neue', category: 'google' },
	{ name: 'Great Vibes', category: 'google' },
	{ name: 'Raleway', category: 'google' },
	{ name: 'Noto Sans', category: 'google' },
	{ name: 'Pacifico', category: 'google' },
	{ name: 'Cinzel Decorative', category: 'google' },
	{ name: 'Cormorant Garamond', category: 'google' },
	{ name: 'Bodoni Moda', category: 'google' },
	{ name: 'EB Garamond', category: 'google' }
];

const LOCAL_STORAGE_KEY = 'serpent_times_custom_fonts';

class FontStore {
	fonts = $state<FontItem[]>([...INITIAL_FONTS]);
	isModalOpen = $state(false);

	constructor() {
		if (typeof window !== 'undefined') {
			this.#restoreSavedFonts();
		}
	}

	get options(): string[] {
		return ['+ Add Font', ...this.fonts.map((f) => f.name)];
	}

	#restoreSavedFonts() {
		try {
			const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (saved) {
				const fontList: FontItem[] = JSON.parse(saved);
				for (const item of fontList) {
					if (item.category === 'google') {
						this.loadGoogleFont(item.name, false);
					} else if (item.category === 'custom' && item.url) {
						this.#registerCustomFontFace(item.name, item.url, false);
					}
				}
			}
		} catch (e) {
			console.error('Failed to restore custom fonts', e);
		}
	}

	#persistFonts() {
		if (typeof localStorage === 'undefined') return;
		const customOrGoogle = this.fonts.filter((f) => f.category !== 'system');
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customOrGoogle));
	}

	#injectGoogleFontLink(fontName: string) {
		if (typeof document === 'undefined') return;
		const id = `google-font-${fontName.replace(/[^a-zA-Z0-9]/g, '-')}`;
		if (!document.getElementById(id)) {
			const link = document.createElement('link');
			link.id = id;
			link.rel = 'stylesheet';
			link.crossOrigin = 'anonymous';
			link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}&display=swap`;
			document.head.appendChild(link);
		}
	}

	#injectCustomFontStyle(fontName: string, cdnUrl: string) {
		if (typeof document === 'undefined') return;
		const styleId = `custom-font-style-${fontName.replace(/[^a-zA-Z0-9]/g, '-')}`;
		if (!document.getElementById(styleId)) {
			const style = document.createElement('style');
			style.id = styleId;
			style.textContent = `
				@font-face {
					font-family: '${fontName}';
					src: url('${cdnUrl}') format('truetype');
					font-display: swap;
				}
			`;
			document.head.appendChild(style);
		}

		const fontFace = new FontFace(fontName, `url('${cdnUrl}')`);
		fontFace
			.load()
			.then((loadedFace) => {
				document.fonts.add(loadedFace);
			})
			.catch((err) => console.warn(`FontFace load failed for ${fontName}:`, err));
	}

	ensureFontLoaded(fontName: string) {
		if (!fontName || fontName === '+ Add Font' || typeof document === 'undefined') return;
		const existing = this.fonts.find((f) => f.name.toLowerCase() === fontName.toLowerCase());
		if (existing?.category === 'custom' && existing.url) {
			this.#injectCustomFontStyle(existing.name, existing.url);
			return;
		}
		// Pure DOM injection without state mutation
		this.#injectGoogleFontLink(fontName);
	}

	loadGoogleFont(fontName: string, save = true) {
		this.#injectGoogleFontLink(fontName);

		const existingIndex = this.fonts.findIndex(
			(f) => f.name.toLowerCase() === fontName.toLowerCase()
		);
		if (existingIndex === -1) {
			this.fonts.push({ name: fontName, category: 'google' });
			if (save) this.#persistFonts();
		}
	}

	#registerCustomFontFace(fontName: string, cdnUrl: string, save = true) {
		this.#injectCustomFontStyle(fontName, cdnUrl);

		const existingIndex = this.fonts.findIndex(
			(f) => f.name.toLowerCase() === fontName.toLowerCase()
		);
		if (existingIndex === -1) {
			this.fonts.push({ name: fontName, category: 'custom', url: cdnUrl });
		} else {
			this.fonts[existingIndex].url = cdnUrl;
		}

		if (save) this.#persistFonts();
	}

	async loadCustomFont(fontName: string, file: File) {
		const uniqueName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
		const renamed = new File([file], uniqueName, { type: file.type });

		const form = new FormData();
		form.append('file', renamed);

		const response = await fetch('/api/cdn/fonts', { method: 'POST', body: form });
		if (!response.ok) throw new Error(`Font file upload failed (${response.status})`);

		const { path } = (await response.json()) as { path: string };
		const cdnUrl = `/api/cdn/${path}`;

		this.#registerCustomFontFace(fontName, cdnUrl, true);
		return cdnUrl;
	}

	removeFont(fontName: string) {
		const index = this.fonts.findIndex((f) => f.name === fontName);
		if (index !== -1 && this.fonts[index].category !== 'system') {
			this.fonts.splice(index, 1);
			this.#persistFonts();
		}
	}

	openModal() {
		this.isModalOpen = true;
	}

	closeModal() {
		this.isModalOpen = false;
	}
}

export const fontStore = new FontStore();
