<script lang="ts">
	import { Label } from 'bits-ui';
	import type { ComponentSchema } from '$lib/data/components';
	import type { CanvasElement } from '../canvas-state.svelte';
	import { groupFields } from './field-groups';
	import FieldControl from './field-control.svelte';

	let { element, schema }: { element: CanvasElement; schema: ComponentSchema } = $props();
</script>

<div class="flex flex-col gap-3">
	<span class="text-xs font-medium tracking-wide text-ui-text-muted uppercase">Position</span>
	<div class="grid grid-cols-2 gap-2">
		{@render numberField('prop-x', 'X', 'x')}
		{@render numberField('prop-y', 'Y', 'y')}
		{@render numberField('prop-width', 'Width', 'width')}
		{@render numberField('prop-height', 'Height', 'height')}
	</div>
	{@render numberField('prop-rotation', 'Rotation', 'rotation')}

	{#each groupFields(schema.fields) as fieldGroup (fieldGroup.name)}
		<span class="text-xs font-medium tracking-wide text-ui-text-muted uppercase"
			>{fieldGroup.name}</span
		>
		{#each fieldGroup.fields as field (field.key)}
			<FieldControl {field} {element} />
		{/each}
	{/each}
</div>

{#snippet numberField(id: string, label: string, key: 'x' | 'y' | 'width' | 'height' | 'rotation')}
	<div class="flex flex-col gap-1.5">
		<Label.Root for={id} class="text-xs font-medium text-ui-text-muted">{label}</Label.Root>
		<input
			{id}
			type="number"
			bind:value={element[key]}
			class="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-sm text-ui-text-main outline-none focus:border-slytherin"
		/>
	</div>
{/snippet}
