<script lang="ts">
	import { CircleUser } from '@lucide/svelte';
	import type { Author } from '$lib/authors';

	// who wrote this paper / designed this template, shown under its title in
	// the pickers so two similarly-named pieces can be told apart by their
	// author. Renders nothing for an unknown author (an account deleted
	// since, say) rather than a blank avatar.
	let { author }: { author: Author | undefined } = $props();

	// email-signup accounts have no Intra login, same fallback the nav uses.
	let label = $derived(author?.login ?? author?.name ?? '');
</script>

{#if author}
	<span class="flex min-w-0 items-center gap-1 text-[0.65rem] text-ui-text-muted">
		{#if author.image}
			<img src={author.image} alt="" class="h-4 w-4 shrink-0 rounded-full object-cover" />
		{:else}
			<CircleUser class="h-4 w-4 shrink-0" />
		{/if}
		<span class="truncate">{label}</span>
	</span>
{/if}
