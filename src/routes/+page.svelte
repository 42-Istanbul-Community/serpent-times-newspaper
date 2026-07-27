<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();
</script>

{#if data.user}
	{#if data.user.image}
		<img src={data.user.image} alt={data.user.name} class="h-16 w-16 rounded-full object-cover" />
	{/if}
	<h1>Hi, {data.user.name}!</h1>
	<p>Your user ID is {data.user.id}.</p>
	<p>Role: {data.role}</p>
	<form method="post" action="?/signOut" use:enhance>
		<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
			>Sign out</button
		>
	</form>
{:else}
	<h1>Login</h1>
	<form method="post" action="?/signInIntra">
		<button class="underline">Login with Intra</button>
	</form>
{/if}
