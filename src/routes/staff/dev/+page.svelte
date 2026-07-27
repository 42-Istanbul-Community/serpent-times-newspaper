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

	// Brightness stands in for rank: dev (brightest) down to user (dimmest).
	const roleDotClasses: Record<string, string> = {
		dev: 'bg-white',
		admin: 'bg-neutral-300',
		editor: 'bg-neutral-400',
		writer: 'bg-neutral-500',
		designer: 'bg-neutral-600',
		user: 'bg-neutral-700'
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

<div class="min-h-screen bg-black px-6 py-10 text-neutral-100 sm:px-10">
	<div class="mx-auto max-w-4xl">
		<header class="mb-6">
			<p class="text-xs font-medium tracking-wide text-neutral-500 uppercase">Staff</p>
			<h1 class="mt-1 text-2xl font-semibold text-white">User roles</h1>
			<p class="mt-1 text-xs text-neutral-500">
				Dev accounts come from INTRA_DEV_IDS and can't be changed here.
			</p>
		</header>

		<div class="overflow-hidden rounded-lg border border-neutral-800">
			<table class="w-full text-left text-sm">
				<thead class="bg-neutral-900">
					<tr class="text-xs text-neutral-500 uppercase">
						<th class="px-4 py-3 font-medium"></th>
						<th class="px-4 py-3 font-medium">
							<button
								type="button"
								class="flex items-center gap-1 hover:text-neutral-200"
								onclick={() => toggleSort('name')}
							>
								Name
								{#if sortKey === 'name'}<span>{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</button>
						</th>
						<th class="px-4 py-3 font-medium">
							<button
								type="button"
								class="flex items-center gap-1 hover:text-neutral-200"
								onclick={() => toggleSort('role')}
							>
								Role
								{#if sortKey === 'role'}<span>{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</button>
						</th>
						<th class="px-4 py-3 font-medium">
							<button
								type="button"
								class="flex items-center gap-1 hover:text-neutral-200"
								onclick={() => toggleSort('joined')}
							>
								Joined
								{#if sortKey === 'joined'}<span>{sortDir === 'asc' ? '↑' : '↓'}</span>{/if}
							</button>
						</th>
						<th class="px-4 py-3 font-medium">Change role</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-neutral-800">
					{#each sortedUsers as u (u.id)}
						<tr class="hover:bg-neutral-900/60">
							<td class="px-4 py-3">
								{#if u.image}
									<img
										src={u.image}
										alt={u.name}
										class="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-700"
									/>
								{:else}
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-neutral-400 ring-1 ring-neutral-700"
									>
										{initials(u.name)}
									</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<div class="font-medium text-neutral-100">{u.name}</div>
								{#if u.login}
									<div class="text-xs text-neutral-500">@{u.login}</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<span
									class="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-neutral-300 ring-1 ring-white/10"
								>
									<span
										class="h-1.5 w-1.5 rounded-full {roleDotClasses[u.role] ?? roleDotClasses.user}"
									></span>
									{roleLabels[u.role] ?? u.role}
								</span>
							</td>
							<td class="px-4 py-3 text-neutral-400">{dateFormatter.format(u.createdAt)}</td>
							<td class="px-4 py-3">
								{#if u.role === 'dev'}
									<span class="text-xs text-neutral-600">—</span>
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
											class="rounded-md border-neutral-700 bg-neutral-900 py-1 text-xs text-neutral-200 focus:border-neutral-400 focus:ring-neutral-400"
										>
											{#each data.assignableRoles as role (role)}
												<option value={role}>{roleLabels[role] ?? role}</option>
											{/each}
										</select>
										<button
											type="submit"
											class="rounded-md bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-700"
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
</div>
