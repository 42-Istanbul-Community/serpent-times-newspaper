<script lang="ts">
	import { editionState } from '../edition-state.svelte';
	import { pickTemplate, removeIndex, removeCitation, removePaper } from '../edition-sync.svelte';
	import TemplatePicker from '../template-picker.svelte';
	import PaperPicker from '../paper-picker.svelte';
	import TitleField from './title-field.svelte';
	import SectionHeader from './section-header.svelte';
	import CoverSection from './cover-section.svelte';
	import ReorderableList from './reorderable-list.svelte';

	let coverPickerOpen = $state(false);
	let indexPickerOpen = $state(false);
	let citationPickerOpen = $state(false);
	let paperPickerOpen = $state(false);
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto p-3">
	<TitleField />

	<SectionHeader label="Cover" onAdd={() => (coverPickerOpen = true)} />
	<CoverSection />

	<SectionHeader label="Index" onAdd={() => (indexPickerOpen = true)} />
	<ReorderableList
		ids={editionState.indexArticleIds}
		drag={editionState.indexDrag}
		onRemove={removeIndex}
	/>

	<SectionHeader label="Papers" onAdd={() => (paperPickerOpen = true)} />
	<ReorderableList
		ids={editionState.articleIds}
		drag={editionState.paperDrag}
		onRemove={removePaper}
	/>

	<SectionHeader label="Citation" onAdd={() => (citationPickerOpen = true)} />
	<ReorderableList
		ids={editionState.citationArticleIds}
		drag={editionState.citationDrag}
		onRemove={removeCitation}
	/>
</div>

<TemplatePicker
	bind:open={coverPickerOpen}
	title="Choose a cover template"
	templates={editionState.pickableCover}
	onpick={(template) => pickTemplate('cover', template)}
/>
<TemplatePicker
	bind:open={indexPickerOpen}
	title="Choose an index template"
	templates={editionState.pickableIndex}
	onpick={(template) => pickTemplate('index', template)}
/>
<TemplatePicker
	bind:open={citationPickerOpen}
	title="Choose a citation template"
	templates={editionState.pickableCitation}
	onpick={(template) => pickTemplate('citation', template)}
/>
<PaperPicker bind:open={paperPickerOpen} />
