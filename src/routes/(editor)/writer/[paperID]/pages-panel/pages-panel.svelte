<script lang="ts">
	import { paperState, type TemplateRow } from '../paper-state.svelte';
	import TemplatePicker from '../template-picker.svelte';
	import TitleField from './title-field.svelte';
	import PagesHeader from './pages-header.svelte';
	import DropLine from './drop-line.svelte';
	import PageRow from './page-row.svelte';

	let pickerOpen = $state(false);

	function handlePick(template: TemplateRow) {
		paperState.addPage(template);
		pickerOpen = false;
	}
</script>

<div class="flex h-full flex-col gap-3 p-3">
	<TitleField />
	<PagesHeader onAdd={() => (pickerOpen = true)} />

	<ul class="flex flex-col gap-1 overflow-y-auto">
		<DropLine index={0} />
		{#each paperState.pages as page, index (page.id)}
			<PageRow {page} />
			<DropLine index={index + 1} />
		{/each}
	</ul>
</div>

<TemplatePicker bind:open={pickerOpen} onpick={handlePick} />
