<script lang="ts">
	import { Label, Select, Switch } from 'bits-ui';
	import { ChevronDown } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { ComponentField } from '$lib/data/components';
	import type { CanvasElement } from '../canvas-state.svelte';
	import ImageDropzone from '$lib/components/editor/image-dropzone.svelte';

	import { fontStore } from '$lib/data/fonts.svelte';

	let { field, element }: { field: ComponentField; element: CanvasElement } = $props();

	// once a component is marked "Manual" (the Manual-group toggle), its
	// actual content is expected to be filled in later by the writer, not
	// typed here by the template designer - lock the Content-group fields to
	// make that obvious. Appearance/Shadow/Typography stay editable either
	// way, since those remain the designer's call.
	let isContentLocked = $derived(field.group === 'Content' && element.properties.manual === 'true');

	let selectOptions = $derived(
		field.key === 'fontFamily' ? fontStore.options : (field.options ?? [])
	);
</script>

{#if field.type === 'toggle'}
	{@render toggleControl()}
{:else if field.type === 'image'}
	{@render imageControl()}
{:else if field.type === 'textarea'}
	{@render labeledField(textareaInput)}
{:else if field.type === 'color'}
	{@render labeledField(colorInput)}
{:else if field.type === 'select'}
	{@render labeledField(selectInput)}
{:else}
	{@render labeledField(textOrNumberInput)}
{/if}

{#snippet toggleControl()}
	<div class="flex items-center justify-between gap-2">
		<span class="text-xs font-medium text-ui-text-muted">{field.label}</span>
		<Switch.Root
			checked={element.properties[field.key] === 'true'}
			onCheckedChange={(checked) => (element.properties[field.key] = checked ? 'true' : 'false')}
			class="group relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-ui-border bg-ui-bg transition-colors data-[state=checked]:border-slytherin data-[state=checked]:bg-slytherin"
		>
			<Switch.Thumb
				class="pointer-events-none ml-0.5 block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform group-data-[state=checked]:translate-x-4"
			/>
		</Switch.Root>
	</div>
{/snippet}

{#snippet imageControl()}
	<div class="flex flex-col gap-1.5">
		<span class="text-xs font-medium text-ui-text-muted">{field.label}</span>
		{#if isContentLocked}
			<p class="text-xs text-ui-text-muted italic">Filled in by the writer later.</p>
		{:else}
			<ImageDropzone
				value={element.properties[field.key]}
				onchange={(dataUrl) => (element.properties[field.key] = dataUrl)}
			/>
		{/if}
	</div>
{/snippet}

<!-- shared shell for every field type that's just "a label above a single
     input" - textarea/color/select/text/number all render through here,
     only the input itself (passed in as a snippet) differs. -->
{#snippet labeledField(input: Snippet)}
	<div class="flex flex-col gap-1.5">
		<Label.Root for="prop-{field.key}" class="text-xs font-medium text-ui-text-muted"
			>{field.label}</Label.Root
		>
		{@render input()}
		{#if isContentLocked}
			<p class="text-xs text-ui-text-muted italic">Filled in by the writer later.</p>
		{/if}
	</div>
{/snippet}

{#snippet textareaInput()}
	<textarea
		id="prop-{field.key}"
		rows="3"
		disabled={isContentLocked}
		bind:value={element.properties[field.key]}
		class="resize-none rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin disabled:cursor-not-allowed disabled:opacity-50"
	></textarea>
{/snippet}

{#snippet colorInput()}
	<input
		id="prop-{field.key}"
		type="color"
		disabled={isContentLocked}
		bind:value={element.properties[field.key]}
		class="h-8 w-full cursor-pointer rounded-md border border-ui-border bg-ui-surface disabled:cursor-not-allowed disabled:opacity-50"
	/>
{/snippet}

{#snippet selectInput()}
	<Select.Root
		type="single"
		disabled={isContentLocked}
		bind:value={element.properties[field.key]}
		onValueChange={(val) => {
			if (val === '+ Add Font') {
				fontStore.openModal();
				return;
			}
			if (field.key === 'citationType' && val) {
				if (
					element.properties.content === 'Designer: {}' ||
					element.properties.content === 'Writers: {}' ||
					element.properties.content === 'Editor: {}'
				) {
					const capitalized = val.charAt(0).toUpperCase() + val.slice(1);
					element.properties.content = `${capitalized}: {}`;
				}
			}
		}}
	>
		<Select.Trigger
			id="prop-{field.key}"
			class="flex items-center justify-between rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main disabled:cursor-not-allowed disabled:opacity-50"
		>
			<Select.Value placeholder="Select" />
			<ChevronDown class="h-4 w-4 text-ui-text-muted" />
		</Select.Trigger>
		<Select.Portal>
			<Select.Content
				class="z-50 max-h-60 overflow-y-auto rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
			>
				<Select.Viewport>
					{#each selectOptions as option (option)}
						<Select.Item
							value={option}
							label={option}
							class="rounded px-2 py-1.5 text-sm text-ui-text-main data-[highlighted]:bg-ui-bg {option ===
							'+ Add Font'
								? 'mb-1 border-b border-ui-border font-bold text-slytherin'
								: ''}"
						>
							{option}
						</Select.Item>
					{/each}
				</Select.Viewport>
			</Select.Content>
		</Select.Portal>
	</Select.Root>
{/snippet}

{#snippet textOrNumberInput()}
	<input
		id="prop-{field.key}"
		type={field.type === 'number' ? 'number' : 'text'}
		disabled={isContentLocked}
		bind:value={element.properties[field.key]}
		class="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin disabled:cursor-not-allowed disabled:opacity-50"
	/>
{/snippet}
