<script lang="ts">
	import { textBoxStyle, verticalAlignClass } from '../../../page/[pageID]/canvas/element-style';
	import type { CanvasElement } from '$lib/types/canvas';

	let { el }: { el: CanvasElement } = $props();
</script>

<div class="flex h-full w-full px-1 {verticalAlignClass(el.properties)}">
	<span
		class="w-full"
		style="text-align: {el.properties.textAlign ?? 'left'}; {textBoxStyle(el.properties)}"
	>
		{el.properties.content}
	</span>
</div>
