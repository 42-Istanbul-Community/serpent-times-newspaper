<script lang="ts">
	import { resolve } from '$app/paths';
	import { LogIn, Newspaper } from '@lucide/svelte';
	import { homepageNav } from './homepage-nav.svelte';
	import AuthErrorToast from './auth-error-toast.svelte';
	import Reader from './reader.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type EditionSummary = (typeof data.editions)[number];

	// the mobile edition switcher lives up in the nav (see +layout.svelte),
	// which only knows what's published from here.
	$effect(() => {
		homepageNav.editions = data.editions;
		return () => {
			homepageNav.editions = [];
		};
	});

	let selectedEdition = $derived(data.editions.find((e) => e.id === data.selectedId) ?? null);
</script>

<!-- failed sign-ins always land back here (see onAPIError.errorURL in
     $lib/server/auth.ts), so the toast lives on the homepage. -->
<AuthErrorToast devLogins={data.devLogins} />

<div class="mx-auto flex max-w-7xl flex-col gap-4 md:grid md:h-full md:grid-cols-12 md:gap-6">
	<div class="h-full shrink-0 md:col-span-10 md:h-full md:min-h-0">
		{#if !data.user}
			{@render lockedPreview()}
		{:else if data.pdfUrl}
			{@render uploadedPdf(data.pdfUrl)}
		{:else if data.content && data.content.pages.length > 0}
			{#key data.selectedId}
				<Reader content={data.content} userNames={data.userNames} />
			{/key}
		{:else}
			{@render emptyState()}
		{/if}
	</div>

	<aside class="hidden flex-col gap-3 overflow-y-auto md:col-span-2 md:flex">
		{#each data.editions as edition (edition.id)}
			{@render editionCard(edition)}
		{:else}
			<p class="text-xs text-ui-text-muted">No editions yet.</p>
		{/each}
	</aside>
</div>

{#snippet lockedPreview()}
	<!-- `coverUrl` arrives already blurred (see $lib/server/preview.ts) - no
	     CSS filter here on purpose, that would be reversible from devtools. -->
	<div
		class="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-md border border-paper-rule bg-paper-surface md:h-full md:min-h-0"
	>
		{#if selectedEdition?.coverUrl}
			<img
				src={selectedEdition.coverUrl}
				alt=""
				class="absolute inset-0 h-full w-full object-contain p-4"
			/>
		{/if}

		<div class="absolute inset-0 flex items-center justify-center p-4">
			<div
				class="flex max-w-md flex-col items-center gap-4 rounded-lg border border-ui-border bg-ui-surface/95 px-6 py-7 text-center shadow-xl backdrop-blur-sm"
			>
				<Newspaper class="h-8 w-8 text-slytherin" />
				<h1 class="text-xl font-bold text-paper-ink">SerpentTimes</h1>
				<p class="text-sm text-ui-text-sub">
					A newspaper made by the students of 42 Istanbul, for the students of 42 Istanbul.
				</p>
				<p class="text-sm text-ui-text-muted">
					Log in with Intra to read {selectedEdition ? 'the full edition' : 'it'}.
				</p>
				<form method="post" action="?/signInIntra">
					<button
						type="submit"
						class="flex items-center gap-2 rounded-md bg-slytherin px-4 py-2 text-sm font-medium text-paper-bg transition-opacity hover:opacity-90"
					>
						<LogIn class="h-4 w-4" />
						Login with Intra
					</button>
				</form>
			</div>
		</div>
	</div>
{/snippet}

{#snippet uploadedPdf(src: string)}
	<!-- a back-issue that was uploaded whole (kind='pdf'): there are no
	     assembled pages to render, so the browser's own PDF viewer reads it.
	     The URL is refused to logged-out requests by /api/cdn. -->
	<iframe
		{src}
		title="{selectedEdition?.title ?? 'Newspaper'} (PDF)"
		class="h-full min-h-[70vh] w-full rounded-md border border-paper-rule bg-paper-surface"
	></iframe>
{/snippet}

{#snippet emptyState()}
	<div
		class="flex h-full items-center justify-center rounded-md border border-dashed border-paper-rule text-sm text-ui-text-muted"
	>
		No newspaper published yet.
	</div>
{/snippet}

{#snippet editionCard(edition: EditionSummary)}
	<!-- a link, not a button: which edition you're reading is URL state now
	     (?edition=<id>), so it survives a reload and can be shared. -->
	<a
		href="{resolve('/')}?edition={edition.id}"
		class="flex flex-col gap-1.5 rounded-md border p-1.5 text-left transition-colors {data.selectedId ===
		edition.id
			? 'border-slytherin bg-slytherin/10'
			: 'border-transparent hover:border-paper-rule'}"
	>
		<div
			class="flex aspect-3/4 items-center justify-center overflow-hidden rounded border border-ui-border bg-ui-bg text-ui-text-muted {edition.coverUrl
				? ''
				: 'border-dashed'}"
		>
			{#if edition.coverUrl}
				<img src={edition.coverUrl} alt="" class="h-full w-full object-cover" />
			{:else}
				<Newspaper class="h-5 w-5" />
			{/if}
		</div>
		<span class="truncate text-xs font-medium text-paper-ink">{edition.title}</span>
	</a>
{/snippet}
