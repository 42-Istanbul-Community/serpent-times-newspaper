<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Tabs } from 'bits-ui';
	import { FileStack, Plus } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	type PaperSummary = (typeof data.papers)[number];

	let published = $derived(data.papers.filter((p) => p.status === 'published'));
	let drafts = $derived(data.papers.filter((p) => p.status === 'draft'));
</script>

<div class="mx-auto max-w-5xl px-8 py-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-paper-ink">Papers</h1>
		{@render newPaperButton()}
	</div>

	<Tabs.Root value="published">
		<Tabs.List class="mb-8 flex items-center gap-1 border-b border-paper-rule">
			{@render tabTrigger('published', 'Published')}
			{@render tabTrigger('draft', 'Draft')}
		</Tabs.List>

		<Tabs.Content value="published">{@render paperGrid(published)}</Tabs.Content>
		<Tabs.Content value="draft">{@render paperGrid(drafts)}</Tabs.Content>
	</Tabs.Root>
</div>

{#snippet newPaperButton()}
	<form method="POST" action="?/create" use:enhance>
		<button
			type="submit"
			class="flex items-center gap-1 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
		>
			<Plus class="h-4 w-4" />
			New paper
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

{#snippet paperGrid(list: PaperSummary[])}
	{#if list.length === 0}
		<p class="text-sm text-ui-text-muted">No papers here yet.</p>
	{:else}
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each list as p (p.id)}
				{@render paperCard(p)}
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet paperCard(p: PaperSummary)}
	<a
		href={resolve('/staff/(editor)/writer/[paperID]', { paperID: String(p.id) })}
		class="flex flex-col gap-2 rounded-md border border-paper-rule bg-paper-surface p-2 transition-colors hover:border-slytherin"
	>
		<div
			class="flex aspect-3/4 items-center justify-center overflow-hidden rounded border border-ui-border bg-ui-bg text-ui-text-muted {p.cdnUrl
				? ''
				: 'border-dashed'}"
		>
			{#if p.cdnUrl}
				<img src={p.cdnUrl} alt="" class="h-full w-full object-cover" />
			{:else}
				<FileStack class="h-6 w-6" />
			{/if}
		</div>
		<span class="truncate text-sm font-medium text-paper-ink">{p.title}</span>
		<span class="text-xs text-ui-text-muted"
			>{p.pages.length} page{p.pages.length === 1 ? '' : 's'}</span
		>
	</a>
{/snippet}
