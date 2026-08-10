<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Search, Upload, Plus, Check, Trash2, X, Type, Sparkles } from '@lucide/svelte';
	import { fontStore, POPULAR_GOOGLE_FONTS } from '$lib/data/fonts.svelte';

	let searchQuery = $state('');
	let activeTab = $state<'google' | 'upload'>('google');
	let customFontName = $state('');
	let selectedFile = $state<File | null>(null);
	let uploadStatus = $state<string | null>(null);

	let filteredGoogleFonts = $derived(
		POPULAR_GOOGLE_FONTS.filter((f) =>
			f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
		)
	);

	function isFontLoaded(name: string) {
		return fontStore.fonts.some((f) => f.name.toLowerCase() === name.toLowerCase());
	}

	function handleAddGoogleFont(name: string) {
		fontStore.loadGoogleFont(name);
	}

	function handleSearchAdd() {
		const trimmed = searchQuery.trim();
		if (!trimmed) return;
		fontStore.loadGoogleFont(trimmed);
		searchQuery = '';
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			selectedFile = file;
			if (!customFontName) {
				const baseName = file.name.replace(/\.[^/.]+$/, '');
				customFontName = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
			}
		}
	}

	async function handleUploadCustomFont() {
		if (!selectedFile || !customFontName.trim()) return;
		try {
			uploadStatus = 'Loading font...';
			await fontStore.loadCustomFont(customFontName.trim(), selectedFile);
			uploadStatus = 'Font loaded successfully!';
			selectedFile = null;
			customFontName = '';
			setTimeout(() => (uploadStatus = null), 2000);
		} catch (err) {
			console.error(err);
			uploadStatus = 'Failed to load font file.';
		}
	}

	// Pre-load stylesheet preview for filtered fonts when visible
	$effect(() => {
		if (fontStore.isModalOpen && typeof document !== 'undefined') {
			filteredGoogleFonts.slice(0, 10).forEach((f) => {
				const id = `preview-font-${f.name}`;
				if (!document.getElementById(id)) {
					const link = document.createElement('link');
					link.id = id;
					link.rel = 'stylesheet';
					link.crossOrigin = 'anonymous';
					link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.name).replace(/%20/g, '+')}&display=swap`;
					document.head.appendChild(link);
				}
			});
		}
	});
</script>

<Dialog.Root bind:open={fontStore.isModalOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[90vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-ui-border bg-ui-surface p-6 shadow-2xl outline-none"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-ui-border pb-4">
				<div class="flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slytherin/10 text-slytherin">
						<Type class="h-4 w-4" />
					</div>
					<div>
						<Dialog.Title class="text-base font-semibold text-ui-text-main">
							Font Manager
						</Dialog.Title>
						<p class="text-xs text-ui-text-muted">Browse Google Fonts or upload custom font files</p>
					</div>
				</div>
				<Dialog.Close
					class="rounded-lg p-1.5 text-ui-text-muted hover:bg-ui-bg hover:text-ui-text-main transition-colors"
					aria-label="Close"
				>
					<X class="h-4 w-4" />
				</Dialog.Close>
			</div>

			<!-- Tabs -->
			<div class="mt-4 flex border-b border-ui-border gap-4 text-xs font-medium">
				<button
					type="button"
					onclick={() => (activeTab = 'google')}
					class="flex items-center gap-1.5 pb-2.5 border-b-2 transition-colors {activeTab === 'google'
						? 'border-slytherin text-slytherin font-semibold'
						: 'border-transparent text-ui-text-muted hover:text-ui-text-main'}"
				>
					<Sparkles class="h-3.5 w-3.5" />
					Google & Web Fonts
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'upload')}
					class="flex items-center gap-1.5 pb-2.5 border-b-2 transition-colors {activeTab === 'upload'
						? 'border-slytherin text-slytherin font-semibold'
						: 'border-transparent text-ui-text-muted hover:text-ui-text-main'}"
				>
					<Upload class="h-3.5 w-3.5" />
					Upload Font File (.ttf, .woff2)
				</button>
			</div>

			<!-- Tab Content -->
			<div class="mt-4 flex-1 overflow-y-auto pr-1 min-h-[320px]">
				{#if activeTab === 'google'}
					<!-- Search bar -->
					<div class="flex items-center gap-2 mb-4">
						<div class="relative flex-1">
							<Search class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ui-text-muted" />
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search fonts (e.g. Playfair, Inter, Oswald)..."
								class="w-full rounded-lg border border-ui-border bg-ui-bg py-2 pl-9 pr-3 text-xs text-ui-text-main outline-none focus:border-slytherin"
							/>
						</div>
						{#if searchQuery.trim() && !filteredGoogleFonts.some(f => f.name.toLowerCase() === searchQuery.trim().toLowerCase())}
							<button
								type="button"
								onclick={handleSearchAdd}
								class="flex items-center gap-1 rounded-lg bg-slytherin px-3 py-2 text-xs font-medium text-white hover:bg-slytherin-dark transition-colors"
							>
								<Plus class="h-3.5 w-3.5" />
								Add "{searchQuery.trim()}"
							</button>
						{/if}
					</div>

					<!-- Fonts Grid -->
					<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
						{#each filteredGoogleFonts as font (font.name)}
							<div
								class="flex items-center justify-between rounded-lg border border-ui-border bg-ui-bg/50 p-3 hover:border-slytherin/50 transition-colors"
							>
								<div class="overflow-hidden pr-2">
									<div
										class="truncate text-base"
										style="font-family: '{font.name}', sans-serif;"
									>
										{font.name}
									</div>
									<div class="text-[10px] text-ui-text-muted">The quick brown fox jumps</div>
								</div>
								{#if isFontLoaded(font.name)}
									<span
										class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slytherin/10 text-slytherin"
										title="Font loaded"
									>
										<Check class="h-4 w-4" />
									</span>
								{:else}
									<button
										type="button"
										onclick={() => handleAddGoogleFont(font.name)}
										class="flex h-7 px-2.5 shrink-0 items-center gap-1 rounded-md border border-ui-border bg-ui-surface text-xs font-medium text-ui-text-main hover:border-slytherin hover:bg-slytherin hover:text-white transition-colors cursor-pointer"
									>
										<Plus class="h-3.5 w-3.5" />
										Add
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- Upload Tab -->
					<div class="flex flex-col gap-4 p-2">
						<div class="rounded-xl border-2 border-dashed border-ui-border bg-ui-bg/40 p-6 text-center">
							<Upload class="mx-auto h-8 w-8 text-ui-text-muted mb-2" />
							<p class="text-xs font-medium text-ui-text-main mb-1">
								Select a custom font file
							</p>
							<p class="text-[11px] text-ui-text-muted mb-4">
								Supports TrueType (.ttf), OpenType (.otf), WOFF (.woff), and WOFF2 (.woff2)
							</p>
							<input
								type="file"
								id="font-file-input"
								accept=".ttf,.otf,.woff,.woff2"
								onchange={handleFileSelect}
								class="hidden"
							/>
							<label
								for="font-file-input"
								class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-xs font-medium text-ui-text-main hover:border-slytherin transition-colors"
							>
								Browse Font File
							</label>
							{#if selectedFile}
								<div class="mt-3 text-xs text-slytherin font-medium">
									Selected: {selectedFile.name}
								</div>
							{/if}
						</div>

						{#if selectedFile}
							<div class="flex flex-col gap-2">
								<label for="custom-font-name-input" class="text-xs font-medium text-ui-text-muted">
									Font Name in Editor
								</label>
								<input
									id="custom-font-name-input"
									type="text"
									bind:value={customFontName}
									placeholder="e.g. My Custom Serif"
									class="rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-xs text-ui-text-main outline-none focus:border-slytherin"
								/>
								<button
									type="button"
									onclick={handleUploadCustomFont}
									class="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slytherin py-2 text-xs font-medium text-white hover:bg-slytherin-dark transition-colors cursor-pointer"
								>
									<Plus class="h-3.5 w-3.5" />
									Load Font Into Project
								</button>
							</div>
						{/if}

						{#if uploadStatus}
							<p class="text-xs text-center font-medium text-slytherin">{uploadStatus}</p>
						{/if}
					</div>
				{/if}

				<!-- Active Loaded Fonts Section -->
				<div class="mt-6 border-t border-ui-border pt-4">
					<h4 class="text-xs font-semibold text-ui-text-muted mb-2">Active Fonts in Project</h4>
					<div class="flex flex-wrap gap-1.5">
						{#each fontStore.fonts as font (font.name)}
							<div
								class="flex items-center gap-1.5 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1 text-xs text-ui-text-main"
							>
								<span style="font-family: '{font.name}', sans-serif;">{font.name}</span>
								{#if font.category !== 'system'}
									<span class="rounded bg-slytherin/10 px-1 py-0.5 text-[9px] font-semibold text-slytherin">
										{font.category}
									</span>
									<button
										type="button"
										onclick={() => fontStore.removeFont(font.name)}
										class="text-ui-text-muted hover:text-red-500 transition-colors ml-1"
										title="Remove font"
									>
										<Trash2 class="h-3 w-3" />
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
