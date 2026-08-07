<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { FileText, X } from '@lucide/svelte';
	import { editionState, type TemplateRow } from './edition-state.svelte';
	import AuthorBadge from '$lib/author-badge.svelte';

	let {
		open = $bindable(false),
		title,
		templates,
		onpick
	}: {
		open?: boolean;
		title: string;
		templates: TemplateRow[];
		onpick: (template: TemplateRow) => void;
	} = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
		<Dialog.Content
			class="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border border-ui-border bg-ui-surface p-4 shadow-md"
		>
			<div class="mb-3 flex items-center justify-between">
				<Dialog.Title class="text-sm font-semibold text-paper-ink">{title}</Dialog.Title>
				<Dialog.Close class="text-ui-text-muted hover:text-ui-text-main" aria-label="Close">
					<X class="h-4 w-4" />
				</Dialog.Close>
			</div>

			{#if templates.length === 0}
				<p class="text-sm text-ui-text-muted">
					No approved templates yet - approve one in the page editor first.
				</p>
			{:else}
				<div class="grid grid-cols-3 gap-3">
					{#each templates as template (template.id)}
						<button
							type="button"
							onclick={() => {
								onpick(template);
								open = false;
							}}
							class="flex flex-col gap-2 rounded-md border border-ui-border bg-ui-bg p-2 text-left hover:border-slytherin"
						>
							<div
								class="flex aspect-3/4 items-center justify-center overflow-hidden rounded border border-dashed border-ui-border bg-paper-surface text-ui-text-muted"
							>
								{#if template.cdnUrl}
									<img src={template.cdnUrl} alt="" class="h-full w-full object-cover" />
								{:else}
									<FileText class="h-5 w-5" />
								{/if}
							</div>
							<span class="truncate text-xs font-medium text-ui-text-main">{template.title}</span>
							<AuthorBadge author={editionState.authors[template.userId]} />
						</button>
					{/each}
				</div>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
