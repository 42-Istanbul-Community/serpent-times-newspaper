<script lang="ts">
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { TriangleAlert, X } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	// better-auth sends every failed auth flow back to the homepage with an
	// ?error=<code> (see onAPIError.errorURL in $lib/server/auth.ts). The codes
	// describe provider internals, so we only use their presence as a trigger
	// and always show the same neutral message.
	let { devLogins = [] }: { devLogins?: string[] } = $props();

	let show = $state(false);
	let timer: ReturnType<typeof setTimeout>;

	function dismiss() {
		clearTimeout(timer);
		show = false;

		// drop the code from the address bar so a refresh doesn't replay the
		// toast. Deliberately not done when the toast opens: the effect below
		// runs during hydration, and replaceState throws in dev until the
		// router has finished starting.
		if (!page.url.searchParams.has('error')) return;
		const url = new URL(page.url);
		url.searchParams.delete('error');
		url.searchParams.delete('error_description');
		// not a navigation - `url` is this page's own, minus the query, so it
		// already carries any base path. resolve() takes a route id, not a URL.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(url, page.state);
	}

	$effect(() => {
		if (!page.url.searchParams.has('error')) return;
		show = true;
		clearTimeout(timer);
		timer = setTimeout(dismiss, 12000);
		return () => clearTimeout(timer);
	});
</script>

{#if show}
	<div
		transition:fly={{ y: -8, duration: 150 }}
		role="alert"
		class="fixed top-4 right-4 z-50 flex max-w-sm gap-3 rounded-md border border-danger bg-ui-surface px-4 py-3 shadow-lg print:hidden"
	>
		<TriangleAlert class="mt-0.5 h-4 w-4 shrink-0 text-danger" />
		<div class="flex flex-col gap-1 text-sm">
			<span class="font-semibold text-ui-text-main">Sign-in failed</span>
			<p class="text-ui-text-sub">
				We couldn't sign you in with Intra. This is usually temporary - please try again in a
				moment.
			</p>
			<p class="text-ui-text-muted">
				If it keeps happening, message us on Slack{#if devLogins.length > 0}
					:
					{#each devLogins as login, i (login)}<span class="font-medium text-ui-text-sub"
							>@{login}</span
						>{i < devLogins.length - 1 ? ', ' : ''}{/each}{:else}.{/if}
			</p>
		</div>
		<button
			type="button"
			onclick={dismiss}
			aria-label="Dismiss"
			class="-mt-1 -mr-1 h-fit text-ui-text-muted"
		>
			<X class="h-4 w-4" />
		</button>
	</div>
{/if}
