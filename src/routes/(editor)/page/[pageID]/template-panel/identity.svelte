<script lang="ts">
	import { Label, Select } from 'bits-ui';
	import { ChevronDown } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import { categoryOptions, identityState } from './identity-state.svelte';
</script>

{@render labeledField('template-title', 'Title', titleInput)}
{@render labeledField('template-category', 'Type', categoryInput)}
{@render labeledField('template-description', 'Description', descriptionInput)}

<!-- shared shell for every field here - a label above a single input, only
     the input itself (passed in as a snippet) differs per field. -->
{#snippet labeledField(id: string, label: string, input: Snippet)}
	<div class="flex flex-col gap-1.5">
		<Label.Root for={id} class="text-xs font-medium text-ui-text-muted">{label}</Label.Root>
		{@render input()}
	</div>
{/snippet}

{#snippet titleInput()}
	<input
		id="template-title"
		bind:value={identityState.title}
		placeholder="e.g. Front Page — Winter Edition"
		class="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin"
	/>
{/snippet}

{#snippet categoryInput()}
	<Select.Root type="single" bind:value={identityState.category}>
		<Select.Trigger
			id="template-category"
			class="flex items-center justify-between rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main"
		>
			<Select.Value placeholder="Select a type" />
			<ChevronDown class="h-4 w-4 text-ui-text-muted" />
		</Select.Trigger>
		<Select.Portal>
			<Select.Content class="rounded-md border border-ui-border bg-ui-surface p-1 shadow-md">
				<Select.Viewport>
					{#each categoryOptions as option (option.value)}
						<Select.Item
							value={option.value}
							label={option.label}
							class="rounded px-2 py-1.5 text-sm text-ui-text-main data-[highlighted]:bg-ui-bg"
						>
							{option.label}
						</Select.Item>
					{/each}
				</Select.Viewport>
			</Select.Content>
		</Select.Portal>
	</Select.Root>
{/snippet}

{#snippet descriptionInput()}
	<textarea
		id="template-description"
		bind:value={identityState.description}
		rows="3"
		placeholder="Optional notes about this template"
		class="resize-none rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin"
	></textarea>
{/snippet}
