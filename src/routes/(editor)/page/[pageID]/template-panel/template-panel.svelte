<script lang="ts">
	import { Accordion } from 'bits-ui';
	import { Blocks, ChevronDown, IdCard, Layers, type Icon as IconType } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import Identity from './identity.svelte';
	import ComponentPalette from './components.svelte';
	import LayersPanel from './layers.svelte';

	let openSections = $state(['identity', 'components', 'layers']);
</script>

<Accordion.Root type="multiple" bind:value={openSections} class="flex h-full min-h-0 flex-col">
	{@render section('identity', 'Identity', IdCard, identityContent)}
	{@render section('components', 'Components', Blocks, componentsContent)}
	{@render section('layers', 'Layers', Layers, layersContent, true)}
</Accordion.Root>

{#snippet identityContent()}
	<Identity />
{/snippet}

{#snippet componentsContent()}
	<ComponentPalette />
{/snippet}

{#snippet layersContent()}
	<LayersPanel />
{/snippet}

{#snippet section(
	value: string,
	label: string,
	Icon: typeof IconType,
	content: Snippet,
	grow = false
)}
	<Accordion.Item
		{value}
		class="flex flex-col border-b border-paper-rule {grow ? 'min-h-0 flex-1' : 'shrink-0'}"
	>
		<Accordion.Header class="shrink-0">
			<Accordion.Trigger
				class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-paper-ink"
			>
				<span class="flex items-center gap-2">
					<Icon class="h-4 w-4" />
					{label}
				</span>
				<ChevronDown
					class="h-4 w-4 transition-transform duration-150 data-[state=open]:rotate-180"
				/>
			</Accordion.Trigger>
		</Accordion.Header>
		<Accordion.Content
			class="flex flex-col gap-3 px-4 pb-4 {grow ? 'min-h-0 flex-1 overflow-y-auto' : ''}"
		>
			{@render content()}
		</Accordion.Content>
	</Accordion.Item>
{/snippet}
