<script lang="ts">
	import { paperState, type TemplateRow } from '../paper-state.svelte';
	import TemplatePicker from '$lib/components/editor/template-picker.svelte';
	import TitleField from '$lib/components/editor/title-field.svelte';
	import DropLine from '$lib/components/editor/drop-line.svelte';
	import SectionHeader from '$lib/components/editor/section-header.svelte';
	import PageRow from './page-row.svelte';

	let pickerOpen = $state(false);

	function handlePick(template: TemplateRow) {
		paperState.addPage(template);
		pickerOpen = false;
	}
</script>

<div class="flex h-full flex-col gap-3 p-3">
	<TitleField id="paper-title" bind:value={paperState.title} />
	<SectionHeader label="Pages" onAdd={() => (pickerOpen = true)} />

	<ul class="flex flex-col gap-1 overflow-y-auto">
		<DropLine dropIndex={paperState.dropIndex} index={0} />
		{#each paperState.pages as page, index (page.id)}
			<PageRow {page} />
			<DropLine dropIndex={paperState.dropIndex} index={index + 1} />
		{/each}
	</ul>
</div>

<TemplatePicker
	bind:open={pickerOpen}
	title="Choose a template"
	templates={paperState.pickableTemplates}
	authors={paperState.authors}
	emptyMessage="No approved “Page” templates yet - approve one in the page editor first."
	onpick={handlePick}
/>
