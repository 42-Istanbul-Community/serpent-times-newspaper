<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageServerData } from './$types';

	let { data }: { data: PageServerData } = $props();

	const roleLabels: Record<string, string> = {
		dev: 'Dev',
		admin: 'Admin',
		editor: 'Editor',
		writer: 'Writer',
		designer: 'Designer',
		user: 'User'
	};

	const roleOrder: Record<string, number> = {
		dev: 0,
		admin: 1,
		editor: 2,
		writer: 3,
		designer: 4,
		user: 5
	};

	// Opacity stands in for rank: dev (solid) down to user (faintest).
	const roleDotClasses: Record<string, string> = {
		dev: 'bg-slytherin',
		admin: 'bg-slytherin/80',
		editor: 'bg-slytherin/60',
		writer: 'bg-slytherin/45',
		designer: 'bg-slytherin/30',
		user: 'bg-ui-border-dark'
	};

	const dateFormatter = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});

	function initials(name: string) {
		return name.slice(0, 2).toUpperCase();
	}

	type SortKey = 'name' | 'role' | 'joined';

	let sortKey = $state<SortKey>('role');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	const sortedUsers = $derived(
		[...data.users].sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortKey === 'role') cmp = roleOrder[a.role] - roleOrder[b.role];
			else cmp = a.createdAt.getTime() - b.createdAt.getTime();
			return sortDir === 'asc' ? cmp : -cmp;
		})
	);
</script>

<div class="mx-auto max-w-4xl px-6 py-10 sm:px-8">
	<header class="mb-6">
		<p class="text-xs font-medium tracking-wide text-ui-text-muted uppercase">Staff</p>
		<h1 class="mt-1 text-2xl font-bold text-paper-ink">User roles</h1>
		<p class="mt-1 text-xs text-ui-text-muted">
			Dev accounts come from INTRA_DEV_IDS and can't be changed here.
		</p>
	</header>

	<div class="overflow-hidden rounded-lg border border-ui-border">
		<table class="w-full text-left text-sm">
			<thead class="bg-ui-bg">
				<tr class="text-xs text-ui-text-muted uppercase">
					<th class="px-4 py-3 font-medium"></th>
					<th class="px-4 py-3 font-medium">
						<button
							type="button"
							class="flex items-center gap-1 hover:text-paper-ink"
							onclick={() => toggleSort('name')}
						>
							Name
							{#if sortKey === 'name'}<span>{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
						</button>
					</th>
					<th class="px-4 py-3 font-medium">
						<button
							type="button"
							class="flex items-center gap-1 hover:text-paper-ink"
							onclick={() => toggleSort('role')}
						>
							Role
							{#if sortKey === 'role'}<span>{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
						</button>
					</th>
					<th class="px-4 py-3 font-medium">
						<button
							type="button"
							class="flex items-center gap-1 hover:text-paper-ink"
							onclick={() => toggleSort('joined')}
						>
							Joined
							{#if sortKey === 'joined'}<span>{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
						</button>
					</th>
					<th class="px-4 py-3 font-medium">Change role</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-ui-border-light">
				{#each sortedUsers as u (u.id)}
					<tr class="hover:bg-ui-bg/60">
						<td class="px-4 py-3">
							{#if u.image}
								<img
									src={u.image}
									alt={u.name}
									class="h-8 w-8 rounded-full object-cover ring-1 ring-ui-border"
								/>
							{:else}
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-ui-bg text-xs font-medium text-ui-text-muted ring-1 ring-ui-border"
								>
									{initials(u.name)}
								</div>
							{/if}
						</td>
						<td class="px-4 py-3">
							<div class="font-medium text-paper-ink">{u.name}</div>
							{#if u.login}
								<div class="text-xs text-ui-text-muted">@{u.login}</div>
							{/if}
						</td>
						<td class="px-4 py-3">
							<span
								class="inline-flex items-center gap-1.5 rounded-md bg-ui-bg px-2 py-1 text-xs font-medium text-ui-text-sub ring-1 ring-ui-border"
							>
								<span
									class="h-1.5 w-1.5 rounded-full {roleDotClasses[u.role] ?? roleDotClasses.user}"
								></span>
								{roleLabels[u.role] ?? u.role}
							</span>
						</td>
						<td class="px-4 py-3 text-ui-text-sub">{dateFormatter.format(u.createdAt)}</td>
						<td class="px-4 py-3">
							{#if u.role === 'dev'}
								<span class="text-xs text-ui-text-muted">—</span>
							{:else}
								<form
									method="POST"
									action="?/updateRole"
									use:enhance
									class="flex items-center gap-2"
								>
									<input type="hidden" name="userId" value={u.id} />
									<select
										name="role"
										value={u.dbRole ?? 'user'}
										class="rounded-md border-ui-border bg-ui-surface py-1 text-xs text-ui-text-main focus:border-slytherin focus:ring-slytherin"
									>
										{#each data.assignableRoles as role (role)}
											<option value={role}>{roleLabels[role] ?? role}</option>
										{/each}
									</select>
									<button
										type="submit"
										class="rounded-md bg-slytherin px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
									>
										Save
									</button>
								</form>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
