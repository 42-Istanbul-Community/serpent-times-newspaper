<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import {
		FileText,
		Newspaper,
		PenTool,
		LogOut,
		Sun,
		Moon,
		Menu,
		X,
		CircleUser,
		ShieldUser
	} from '@lucide/svelte';
	import { DropdownMenu, NavigationMenu, Switch } from 'bits-ui';
	import { canAccessSection } from '$lib/access';
	import { ModeWatcher, mode, setMode } from 'mode-watcher';
	import { homepageNav } from './homepage-nav.svelte';
	import type { LayoutServerData } from './$types';
	import './layout.css';

	let { data, children }: { data: LayoutServerData; children: import('svelte').Snippet } = $props();
	let currentPath = $derived(page.url.pathname);
	let mobileMenuOpen = $state(false);

	const baseNavItems = [
		{ path: '/staff/page', label: 'Page Editor', icon: FileText, section: 'page' },
		{ path: '/staff/newspaper', label: 'Newspaper Editor', icon: Newspaper, section: 'newspaper' },
		{ path: '/staff/writer', label: 'Writer', icon: PenTool, section: 'writer' }
	] as const;

	let navItems = $derived([
		...baseNavItems.filter((item) => canAccessSection(data.role, item.section)),
		...(data.role === 'dev'
			? [{ path: '/staff/dev', label: 'User roles', icon: ShieldUser } as const]
			: [])
	]);

	const activeClass = 'text-slytherin underline decoration-2 underline-offset-4';
	const inactiveClass = 'text-paper-ink';

	// email-signup accounts have no Intra login, so fall back to the name.
	let displayName = $derived(data.user?.login ?? data.user?.name ?? '');

	const roleLabels: Record<string, string> = {
		dev: 'Dev',
		admin: 'Admin',
		editor: 'Editor',
		writer: 'Writer',
		designer: 'Designer',
		user: 'User'
	};
</script>

<ModeWatcher />

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SerpentTimes</title>
</svelte:head>

<div class="flex h-screen flex-col overflow-hidden print:block print:h-auto print:overflow-visible">
	<nav
		class="border-b border-paper-rule bg-paper-surface transition-colors duration-300 print:hidden"
	>
		<div
			class="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 md:flex md:justify-between md:px-8 md:py-4"
		>
			<div class="flex items-center gap-10">
				<button
					type="button"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					aria-label="Menu"
					class="text-paper-ink md:hidden"
				>
					{#if mobileMenuOpen}
						<X class="h-5 w-5" />
					{:else}
						<Menu class="h-5 w-5" />
					{/if}
				</button>
				<div class="hidden items-center gap-10 md:flex">
					{@render Logo()}
					{#if data.user}
						{@render Navbar()}
					{/if}
				</div>
			</div>
			<div class="text-center md:hidden">
				{@render Logo()}
			</div>
			<div class="flex items-center justify-end gap-4">
				<div class="hidden md:flex">{@render DarkMode()}</div>
				{@render Login()}
			</div>
		</div>
		{#if mobileMenuOpen}
			{@render MobileMenu()}
		{/if}
	</nav>
	<div class="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
		{@render children()}
	</div>
</div>

{#snippet Logo()}
	<a
		href={resolve('/')}
		class="text-xl font-bold transition-colors duration-300 {currentPath === '/'
			? 'text-slytherin'
			: inactiveClass}"
	>
		SerpentTimes
	</a>
{/snippet}

{#snippet Navbar()}
	<NavigationMenu.Root>
		<NavigationMenu.List class="flex items-center gap-8">
			{#each navItems as item (item.path)}
				<NavigationMenu.Item>
					<NavigationMenu.Link
						href={item.path}
						active={currentPath === item.path}
						class="flex items-center gap-1.5 transition-colors duration-300 {currentPath ===
						item.path
							? activeClass
							: inactiveClass}"
					>
						<item.icon class="h-4 w-4" />
						<span>{item.label}</span>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
			{/each}
		</NavigationMenu.List>
	</NavigationMenu.Root>
{/snippet}

{#snippet Login()}
	{#if data.user}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				aria-label="Account menu for {displayName}"
				class="flex items-center gap-3 rounded-md px-1 py-1 text-paper-ink transition-colors duration-300 hover:text-slytherin"
			>
				<span class="hidden flex-col items-start gap-0.5 text-left md:flex">
					{#if data.role && data.role !== 'user'}
						<span class="text-xs leading-none text-ui-text-muted">{roleLabels[data.role]}</span>
					{/if}
					<span class="text-base leading-none font-medium">{displayName}</span>
				</span>
				{#if data.user.image}
					<img src={data.user.image} alt="" class="h-9 w-9 rounded-full object-cover" />
				{:else}
					<CircleUser class="h-9 w-9" />
				{/if}
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					class="z-50 min-w-36 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
				>
					<!-- login/logout actions live on the homepage route (see
					     +page.server.ts), so target them absolutely from any page. -->
					<form method="post" action="/?/signOut">
						<DropdownMenu.Item>
							{#snippet child({ props })}
								<button
									{...props}
									type="submit"
									class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-ui-text-main data-[highlighted]:bg-ui-bg"
								>
									<LogOut class="h-4 w-4" />
									Sign out
								</button>
							{/snippet}
						</DropdownMenu.Item>
					</form>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	{/if}
{/snippet}

{#snippet MobileMenu()}
	<div class="flex flex-col gap-1 border-t border-paper-rule px-4 py-3 md:hidden">
		{#if data.user}
			{#each navItems as item (item.path)}
				<a
					href={resolve(item.path)}
					onclick={() => (mobileMenuOpen = false)}
					class="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors duration-300 {currentPath ===
					item.path
						? activeClass
						: inactiveClass}"
				>
					<item.icon class="h-4 w-4" />
					<span>{item.label}</span>
				</a>
			{/each}
		{/if}
		{#if homepageNav.editions.length > 0}
			{@render EditionSwitcher()}
		{/if}
		<div class="mt-2 flex items-center justify-between border-t border-paper-rule pt-2">
			<span class="text-sm text-paper-ink">Theme</span>
			{@render DarkMode()}
		</div>
	</div>
{/snippet}

{#snippet EditionSwitcher()}
	<!-- only present on the homepage (homepageNav.editions is populated
	     there and nowhere else, see +page.svelte) - lets a mobile reader
	     jump between newspapers straight from the nav menu, without
	     scrolling the page to find a separate switcher. -->
	<div class="mt-2 flex flex-col gap-1 border-t border-paper-rule pt-2">
		<span class="px-2 text-sm text-paper-ink">Newspapers</span>
		<div class="flex gap-3 overflow-x-auto px-2 py-1">
			{#each homepageNav.editions as edition (edition.id)}
				{@const requested = Number(page.url.searchParams.get('edition'))}
				{@const selected = homepageNav.editions.some((e) => e.id === requested)
					? requested === edition.id
					: homepageNav.editions[0]?.id === edition.id}
				<a
					href="{resolve('/')}?edition={edition.id}"
					onclick={() => (mobileMenuOpen = false)}
					class="flex w-28 shrink-0 flex-col gap-1 text-left"
				>
					<div
						class="flex aspect-3/4 items-center justify-center overflow-hidden rounded-md border-2 bg-ui-bg text-ui-text-muted transition-colors {selected
							? 'border-slytherin'
							: 'border-ui-border'}"
					>
						{#if edition.coverUrl}
							<img src={edition.coverUrl} alt="" class="h-full w-full object-cover" />
						{:else}
							<Newspaper class="h-8 w-8" />
						{/if}
					</div>
					<span
						class="truncate text-[0.65rem] font-medium {selected
							? 'text-slytherin'
							: 'text-paper-ink'}"
					>
						{edition.title}
					</span>
				</a>
			{/each}
		</div>
	</div>
{/snippet}

{#snippet DarkMode()}
	<Switch.Root
		checked={mode.current === 'dark'}
		onCheckedChange={(checked) => setMode(checked ? 'dark' : 'light')}
	>
		<Switch.Thumb>
			{#if mode.current === 'dark'}
				<Moon class="h-4 w-4" />
			{:else}
				<Sun class="h-4 w-4" />
			{/if}
		</Switch.Thumb>
	</Switch.Root>
{/snippet}
