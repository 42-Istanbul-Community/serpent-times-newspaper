<script lang="ts">
	import { resolve } from '$app/paths';
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { ChevronDown, ChevronUp, FileUp, Newspaper, Plus, Trash2, Upload } from '@lucide/svelte';
	import DraftBadge from '$lib/draft-badge.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type EditionSummary = (typeof data.editions)[number];

	let uploadOpen = $state(false);
	// null while idle; 0..1 as the bytes go up, then null again once the
	// server takes over (it still has to rasterize the cover).
	let sent = $state<number | null>(null);
	let working = $state(false);
	let uploadError = $state('');

	// A newspaper PDF is big enough that "did it hang?" is a real question,
	// and fetch - which is all use:enhance has - can't report upload
	// progress. XHR can, so this submits by hand and feeds the action result
	// back through SvelteKit's own plumbing afterwards.
	function uploadWithProgress(event: SubmitEvent) {
		event.preventDefault();
		const formEl = event.currentTarget as HTMLFormElement;

		working = true;
		sent = 0;
		uploadError = '';

		const request = new XMLHttpRequest();
		request.open('POST', formEl.action);
		request.setRequestHeader('x-sveltekit-action', 'true');

		request.upload.onprogress = (e) => {
			if (e.lengthComputable) sent = e.loaded / e.total;
		};
		// bytes are all sent - whatever is left is the server rasterizing.
		request.upload.onload = () => (sent = null);

		request.onload = async () => {
			const result = deserialize(request.responseText);
			if (result.type === 'success') {
				formEl.reset();
				uploadOpen = false;
				await invalidateAll();
			}
			await applyAction(result);
			working = false;
		};
		request.onerror = () => {
			uploadError = 'Upload failed - the connection dropped.';
			working = false;
			sent = null;
		};

		request.send(new FormData(formEl));
	}
</script>

<div class="mx-auto max-w-5xl px-8 py-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-paper-ink">Editions</h1>
		<div class="flex items-center gap-2">
			{@render uploadToggle()}
			{@render newEditionButton()}
		</div>
	</div>

	{#if uploadOpen}
		{@render uploadForm()}
	{/if}

	<!-- one list in reading order, drafts included and labelled on their own
	     card - the up/down arrows move an edition through this same order. -->
	{@render editionGrid(data.editions)}
</div>

{#snippet newEditionButton()}
	<form method="POST" action="?/create" use:enhance>
		<button
			type="submit"
			class="flex items-center gap-1 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
		>
			<Plus class="h-4 w-4" />
			New edition
		</button>
	</form>
{/snippet}

{#snippet uploadToggle()}
	<button
		type="button"
		onclick={() => (uploadOpen = !uploadOpen)}
		class="flex items-center gap-1 rounded-md border border-paper-rule px-3 py-1.5 text-sm font-medium text-paper-ink hover:border-slytherin"
	>
		<FileUp class="h-4 w-4" />
		Upload PDF
	</button>
{/snippet}

{#snippet uploadForm()}
	<!-- a back issue that only ever existed as a PDF: it becomes a real
	     edition row so it lists and publishes alongside the assembled ones,
	     it just never opens the editor. -->
	<form
		method="POST"
		action="?/uploadPdf"
		enctype="multipart/form-data"
		onsubmit={uploadWithProgress}
		class="mb-8 flex flex-col gap-4 rounded-md border border-paper-rule bg-paper-surface p-4"
	>
		<p class="text-sm text-ui-text-sub">
			Uploaded editions are read as the PDF itself - there are no editable pages. The cover is taken
			from the first page.
		</p>

		<label class="flex flex-col gap-1 text-sm text-paper-ink">
			Title
			<input
				name="title"
				required
				disabled={working}
				placeholder="e.g. Issue 3 - March 2024"
				class="rounded-md border border-ui-border bg-ui-bg px-2 py-1.5 text-sm"
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-paper-ink">
			PDF
			<input
				name="file"
				type="file"
				accept="application/pdf"
				required
				disabled={working}
				class="text-sm text-ui-text-sub"
			/>
		</label>

		{#if working}
			{@render progressBar()}
		{/if}

		{#if uploadError || form?.upload}
			<p class="text-sm text-danger">{uploadError || form?.upload}</p>
		{/if}

		<div class="flex items-center gap-2">
			<button
				type="submit"
				disabled={working}
				class="flex items-center gap-1 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
			>
				<Upload class="h-4 w-4" />
				{working ? 'Uploading...' : 'Upload'}
			</button>
			<button
				type="button"
				disabled={working}
				onclick={() => (uploadOpen = false)}
				class="rounded-md px-3 py-1.5 text-sm text-ui-text-sub hover:text-paper-ink disabled:opacity-50"
			>
				Cancel
			</button>
		</div>
	</form>
{/snippet}

{#snippet progressBar()}
	<!-- once the bytes are up, `sent` goes null and the bar switches to an
	     indeterminate sweep: the server is still rasterizing the cover, and a
	     real percentage pinned at 100% would read as a hang. -->
	<div class="flex flex-col gap-1">
		<div class="h-1.5 w-full overflow-hidden rounded-full bg-ui-bg">
			{#if sent === null}
				<div class="sweep h-full w-1/3 rounded-full bg-slytherin"></div>
			{:else}
				<div
					class="h-full rounded-full bg-slytherin transition-[width] duration-150"
					style="width: {Math.round(sent * 100)}%;"
				></div>
			{/if}
		</div>
		<span class="text-xs text-ui-text-muted">
			{sent === null ? 'Processing the cover...' : `Uploading ${Math.round(sent * 100)}%`}
		</span>
	</div>
{/snippet}

{#snippet editionGrid(list: EditionSummary[])}
	{#if list.length === 0}
		<p class="text-sm text-ui-text-muted">No editions here yet.</p>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each list as e, i (e.id)}
				{@render editionCard(e, i === 0, i === list.length - 1)}
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet editionCard(e: EditionSummary, isFirst: boolean, isLast: boolean)}
	<div class="relative">
		{#if e.status === 'draft'}
			<DraftBadge />
			{@render deleteButton(e.id, e.title)}
		{/if}
		<!-- uploaded editions open the same editor, just read-only: rename,
		     publish and download, with the PDF itself where the pages go. -->
		<a
			href={resolve('/staff/(editor)/newspaper/[editionID]', { editionID: String(e.id) })}
			class="flex flex-col gap-2 rounded-md border border-paper-rule bg-paper-surface p-2 transition-colors hover:border-slytherin"
		>
			<div
				class="flex aspect-3/4 items-center justify-center overflow-hidden rounded border border-ui-border bg-ui-bg text-ui-text-muted {e.cdnUrl
					? ''
					: 'border-dashed'}"
			>
				{#if e.cdnUrl}
					<img src={e.cdnUrl} alt="" class="h-full w-full object-cover" />
				{:else}
					<Newspaper class="h-6 w-6" />
				{/if}
			</div>
			<span class="truncate text-sm font-medium text-paper-ink">{e.title}</span>
			{#if e.kind === 'pdf'}
				<span class="flex items-center gap-1 text-xs text-ui-text-muted">
					<FileUp class="h-3 w-3" />
					Uploaded PDF
				</span>
			{:else}
				<span class="text-xs text-ui-text-muted"
					>{e.articleIds.length} paper{e.articleIds.length === 1 ? '' : 's'}</span
				>
			{/if}
		</a>
		{@render reorderControls(e, isFirst, isLast)}
	</div>
{/snippet}

{#snippet reorderControls(e: EditionSummary, isFirst: boolean, isLast: boolean)}
	<!-- the order set here is the order readers get on the homepage, so it
	     moves within this tab: published editions reorder among themselves. -->
	<div class="mt-1.5 flex items-center gap-1">
		{@render moveButton(e, 'up', isFirst)}
		{@render moveButton(e, 'down', isLast)}
	</div>
{/snippet}

{#snippet moveButton(e: EditionSummary, direction: 'up' | 'down', disabled: boolean)}
	<form method="POST" action="?/move" use:enhance class="flex-1">
		<input type="hidden" name="id" value={e.id} />
		<input type="hidden" name="direction" value={direction} />
		<button
			type="submit"
			{disabled}
			aria-label="Move {e.title} {direction}"
			class="flex w-full items-center justify-center rounded-md border border-ui-border py-1 text-ui-text-sub transition-colors hover:border-slytherin hover:text-slytherin disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ui-border disabled:hover:text-ui-text-sub"
		>
			{#if direction === 'up'}
				<ChevronUp class="h-4 w-4" />
			{:else}
				<ChevronDown class="h-4 w-4" />
			{/if}
		</button>
	</form>
{/snippet}

{#snippet deleteButton(id: number, title: string)}
	<form method="POST" action="?/delete" use:enhance class="absolute top-3.5 right-3.5 z-10">
		<input type="hidden" name="id" value={id} />
		<button
			type="submit"
			aria-label="Delete {title}"
			onclick={(e) => {
				if (!confirm(`Delete "${title}"? This can't be undone.`)) e.preventDefault();
			}}
			class="rounded-md bg-ui-surface/90 p-1 text-ui-text-muted shadow-sm transition-colors hover:text-danger"
		>
			<Trash2 class="h-4 w-4" />
		</button>
	</form>
{/snippet}

<style>
	@keyframes sweep {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(300%);
		}
	}
	.sweep {
		animation: sweep 1.1s ease-in-out infinite;
	}
</style>
