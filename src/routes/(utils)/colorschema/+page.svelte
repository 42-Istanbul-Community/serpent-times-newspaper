<script lang="ts">
	const groups = [
		{
			title: 'Editorial Print',
			swatches: [
				{ name: 'paper-bg', class: 'bg-paper-bg' },
				{ name: 'paper-surface', class: 'bg-paper-surface' },
				{ name: 'paper-ink', class: 'bg-paper-ink' },
				{ name: 'paper-body-dark', class: 'bg-paper-body-dark' },
				{ name: 'paper-body-mid', class: 'bg-paper-body-mid' },
				{ name: 'paper-quote', class: 'bg-paper-quote' },
				{ name: 'paper-rule', class: 'bg-paper-rule' },
				{ name: 'paper-placeholder', class: 'bg-paper-placeholder' }
			]
		},
		{
			title: 'UI / Stone',
			swatches: [
				{ name: 'ui-bg', class: 'bg-ui-bg' },
				{ name: 'ui-surface', class: 'bg-ui-surface' },
				{ name: 'ui-border-light', class: 'bg-ui-border-light' },
				{ name: 'ui-border', class: 'bg-ui-border' },
				{ name: 'ui-border-dark', class: 'bg-ui-border-dark' },
				{ name: 'ui-text-muted', class: 'bg-ui-text-muted' },
				{ name: 'ui-text-sub', class: 'bg-ui-text-sub' },
				{ name: 'ui-text-main', class: 'bg-ui-text-main' }
			]
		},
		{
			title: 'Accents & Status',
			swatches: [
				{ name: 'accent-blue', class: 'bg-accent-blue' },
				{ name: 'danger', class: 'bg-danger' },
				{ name: 'success', class: 'bg-success' },
				{ name: 'brand', class: 'bg-brand' },
				{ name: 'slytherin', class: 'bg-slytherin' }
			]
		}
	];
</script>

<div class="min-h-screen bg-paper-bg px-8 py-12 text-paper-ink">
	<h1 class="mb-10 font-serif text-3xl font-bold">Color Schema</h1>

	{#each groups as group}
		<section class="mb-10">
			<h2 class="mb-4 text-sm font-semibold tracking-wide text-paper-quote uppercase">
				{group.title}
			</h2>
			<div class="flex flex-wrap gap-4">
				{#each group.swatches as swatch}
					<div class="flex flex-col gap-2">
						<div class="{swatch.class} h-20 w-32 rounded-md border border-ui-border"></div>
						<span class="text-xs text-paper-body-mid">{swatch.name}</span>
					</div>
				{/each}
			</div>
		</section>
	{/each}
</div>
