<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { Select, Tabs } from 'bits-ui';
	import { BookOpen, ChevronDown, FileText, Image, ListOrdered, Plus, Quote } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type TemplateSummary = (typeof data.templates)[number];
	type TemplateCategory = TemplateSummary['category'];

	const categories: { value: TemplateCategory; label: string; icon: typeof BookOpen }[] = [
		{ value: 'cover', label: 'Cover', icon: BookOpen },
		{ value: 'page', label: 'Page', icon: FileText },
		{ value: 'index', label: 'Index', icon: ListOrdered },
		{ value: 'citation', label: 'Citation', icon: Quote }
	];

	let newCategory = $state<TemplateCategory>('page');

	let published = $derived(data.templates.filter((t) => t.availability !== 'draft'));
	let drafts = $derived(data.templates.filter((t) => t.availability === 'draft'));
</script>

<div class="mx-auto max-w-5xl px-8 py-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-paper-ink">Templates</h1>

		<form method="POST" action="?/create" use:enhance class="flex items-center gap-2">
			<Select.Root type="single" name="category" bind:value={newCategory}>
				<Select.Trigger
					class="flex items-center gap-1.5 rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main"
				>
					<Select.Value placeholder="Category" />
					<ChevronDown class="h-4 w-4 text-ui-text-muted" />
				</Select.Trigger>
				<Select.Portal>
					<Select.Content class="rounded-md border border-ui-border bg-ui-surface p-1 shadow-md">
						<Select.Viewport>
							{#each categories as cat (cat.value)}
								<Select.Item
									value={cat.value}
									label={cat.label}
									class="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-ui-text-main data-[highlighted]:bg-ui-bg"
								>
									<cat.icon class="h-3.5 w-3.5" />
									{cat.label}
								</Select.Item>
							{/each}
						</Select.Viewport>
					</Select.Content>
				</Select.Portal>
			</Select.Root>
			<button
				type="submit"
				class="flex items-center gap-1 rounded-md bg-slytherin px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
			>
				<Plus class="h-4 w-4" />
				New
			</button>
		</form>
	</div>

	<Tabs.Root value="published">
		<Tabs.List class="mb-8 flex items-center gap-1 border-b border-paper-rule">
			<Tabs.Trigger
				value="published"
				class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-paper-ink data-[state=active]:border-slytherin data-[state=active]:text-slytherin"
			>
				Published
			</Tabs.Trigger>
			<Tabs.Trigger
				value="draft"
				class="border-b-2 border-transparent px-3 py-2 text-sm font-medium text-paper-ink data-[state=active]:border-slytherin data-[state=active]:text-slytherin"
			>
				Draft
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="published">
			{@render categoryGroups(published)}
		</Tabs.Content>
		<Tabs.Content value="draft">
			{@render categoryGroups(drafts)}
		</Tabs.Content>
	</Tabs.Root>
</div>

{#snippet categoryGroups(list: TemplateSummary[])}
	<div class="flex flex-col gap-8">
		{#each categories as cat (cat.value)}
			{@const items = list.filter((t) => t.category === cat.value)}
			{@render categorySection(cat, items)}
		{/each}
	</div>
{/snippet}

{#snippet categorySection(
	cat: { value: TemplateCategory; label: string; icon: typeof BookOpen },
	items: TemplateSummary[]
)}
	<section>
		<h2
			class="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-ui-text-muted uppercase"
		>
			<cat.icon class="h-4 w-4" />
			{cat.label}
		</h2>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
			{#each items as template (template.id)}
				{@render templateCard(template)}
			{/each}
		</div>
	</section>
{/snippet}

{#snippet templateCard(template: TemplateSummary)}
	<a
		href={resolve('/(editor)/page/[pageID]', { pageID: String(template.id) })}
		class="flex flex-col gap-2 rounded-md border border-paper-rule bg-paper-surface p-2 transition-colors hover:border-slytherin"
	>
		<div
			class="flex aspect-3/4 items-center justify-center overflow-hidden rounded border border-ui-border bg-ui-bg text-ui-text-muted {template.cdnUrl
				? ''
				: 'border-dashed'}"
		>
			{#if template.cdnUrl}
				<img src={template.cdnUrl} alt="" class="h-full w-full object-cover" />
			{:else}
				<Image class="h-6 w-6" />
			{/if}
		</div>
		<span class="truncate text-sm font-medium text-paper-ink">{template.title}</span>
	</a>
{/snippet}
