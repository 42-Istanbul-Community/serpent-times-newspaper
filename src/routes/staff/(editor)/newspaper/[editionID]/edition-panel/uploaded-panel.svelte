<script lang="ts">
	import { FileUp } from '@lucide/svelte';
	import { editionState } from '../edition-state.svelte';
	import { editionSync } from '../edition-sync.svelte';
	import TitleField from '$lib/components/editor/title-field.svelte';

	// everything an uploaded edition still owns: its name and its status.
	// The pages themselves came in as a finished PDF, so there is no cover /
	// index / papers / citation section to offer.
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto p-3">
	<TitleField id="edition-title" bind:value={editionState.title} />

	<div class="flex flex-col gap-2 rounded-md border border-ui-border bg-ui-surface p-3">
		<span class="flex items-center gap-1.5 text-sm font-medium text-paper-ink">
			<FileUp class="h-4 w-4" />
			Uploaded PDF
		</span>
		<p class="text-xs text-ui-text-sub">
			This edition was uploaded as a finished PDF. Its pages can't be edited here - you can rename
			it, publish it, and download it.
		</p>
	</div>

	<dl class="flex flex-col gap-2 text-xs">
		<div class="flex items-center justify-between">
			<dt class="text-ui-text-muted">Status</dt>
			<dd class="font-medium text-paper-ink">
				{editionSync.status === 'published' ? 'Published' : 'Draft'}
			</dd>
		</div>
		<div class="flex items-center justify-between">
			<dt class="text-ui-text-muted">Edition</dt>
			<dd class="font-medium text-paper-ink">#{editionState.editionId ?? '-'}</dd>
		</div>
	</dl>
</div>
