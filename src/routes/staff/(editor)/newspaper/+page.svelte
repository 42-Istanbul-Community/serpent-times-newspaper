<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Tabs } from 'bits-ui';
	import { Newspaper, Plus, Trash2 } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type EditionSummary = (typeof data.editions)[number];

	let published = $derived(data.editions.filter((e) => e.status === 'published'));
	let drafts = $derived(data.editions.filter((e) => e.status === 'draft'));
</script>

<div class="mx-auto max-w-5xl px-8 py-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-paper-ink">Editions</h1>
		{@render newEditionButton()}
	</div>

	<Tabs.Root value="published">
		<Tabs.List class="mb-8 flex items-center gap-1 border-b border-paper-rule">
			{@render tabTrigger('published', 'Published')}
			{@render tabTrigger('draft', 'Draft')}
		</Tabs.List>

		<Tabs.Content value="published">{@render editionGrid(published)}</Tabs.Content>
		<Tabs.Content value="draft">{@render editionGrid(drafts)}</Tabs.Content>
	</Tabs.Root>
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

{#snippet tabTrigger(value: string, label: string)}
	<Tabs.Trigger
		{value}
		class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-paper-ink data-[state=active]:border-slytherin data-[state=active]:text-slytherin"
	>
		{label}
	</Tabs.Trigger>
{/snippet}

{#snippet editionGrid(list: EditionSummary[])}
	{#if list.length === 0}
		<p class="text-sm text-ui-text-muted">No editions here yet.</p>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each list as e (e.id)}
				{@render editionCard(e)}
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet editionCard(e: EditionSummary)}
	<div class="relative">
		{#if e.status === 'draft'}
			{@render deleteButton(e.id, e.title)}
		{/if}
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
			<span class="text-xs text-ui-text-muted"
				>{e.articleIds.length} paper{e.articleIds.length === 1 ? '' : 's'}</span
			>
		</a>
	</div>
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
