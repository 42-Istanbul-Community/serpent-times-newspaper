<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createEditor,
		$getRoot as getRoot,
		$getSelection as getSelection,
		$isRangeSelection as isRangeSelection,
		$createParagraphNode as createParagraphNode,
		$insertNodes as insertNodes,
		FORMAT_TEXT_COMMAND,
		FORMAT_ELEMENT_COMMAND,
		INDENT_CONTENT_COMMAND,
		OUTDENT_CONTENT_COMMAND,
		UNDO_COMMAND,
		REDO_COMMAND,
		CAN_UNDO_COMMAND,
		CAN_REDO_COMMAND,
		FOCUS_COMMAND,
		BLUR_COMMAND,
		COMMAND_PRIORITY_LOW,
		type LexicalEditor,
		type ElementFormatType
	} from 'lexical';
	import {
		registerRichText,
		HeadingNode,
		QuoteNode,
		$createHeadingNode as createHeadingNode,
		$createQuoteNode as createQuoteNode,
		type HeadingTagType
	} from '@lexical/rich-text';
	import { registerHistory, createEmptyHistoryState } from '@lexical/history';
	import {
		$patchStyleText as patchStyleText,
		$setBlocksType as setBlocksType
	} from '@lexical/selection';
	import {
		ListNode,
		ListItemNode,
		registerList,
		INSERT_UNORDERED_LIST_COMMAND,
		INSERT_ORDERED_LIST_COMMAND
	} from '@lexical/list';
	import {
		$generateHtmlFromNodes as generateHtmlFromNodes,
		$generateNodesFromDOM as generateNodesFromDOM
	} from '@lexical/html';
	import {
		Bold,
		Italic,
		Underline,
		Strikethrough,
		Subscript,
		Superscript,
		Undo2,
		Redo2,
		TextAlignStart,
		TextAlignCenter,
		TextAlignEnd,
		TextAlignJustify,
		ListIndentIncrease,
		ListIndentDecrease,
		List,
		ListOrdered
	} from '@lucide/svelte';
	import { FONT_SIZE_OPTIONS } from '$lib/data/components/base-fields';
	import { fontStore } from '$lib/data/fonts.svelte';

	let {
		value,
		onchange,
		textStyle = '',
		placeholder = ''
	}: {
		value: string;
		onchange: (html: string) => void;
		textStyle?: string;
		placeholder?: string;
	} = $props();

	let rootEl: HTMLDivElement = $state()!;
	let editor: LexicalEditor;
	// seeded once from the initial `value` prop, then driven entirely by the
	// editor's own update listener below - not meant to track later prop changes.
	let isEmpty = $state(!value);
	let canUndo = $state(false);
	let canRedo = $state(false);

	// floating toolbar - `position: fixed` alone isn't enough to escape the
	// canvas element's `overflow: hidden` wrapper (see page-renderer.svelte):
	// that wrapper also sets a CSS `transform` (rotation), and ANY transformed
	// ancestor establishes a new containing block for fixed descendants,
	// silently turning `fixed` back into something clipped like `absolute`.
	// `portal` below physically moves the toolbar's DOM node to <body>,
	// outside that ancestor chain entirely, so `fixed` means the viewport again.
	// null while unfocused; only ever shown while the editor has focus.
	let toolbarPos = $state<{ top: number; left: number } | null>(null);
	const TOOLBAR_GAP = 6;
	// first-paint guess, before the toolbar's real size is known (see
	// positionToolbar below, which corrects this once it's measurable).
	const TOOLBAR_HEIGHT_GUESS = 40;
	const TOOLBAR_WIDTH_GUESS = 380;

	let toolbarEl: HTMLElement | null = null;

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		toolbarEl = node;
		positionToolbar();
		return {
			destroy() {
				node.remove();
				if (toolbarEl === node) toolbarEl = null;
			}
		};
	}

	function positionToolbar() {
		if (!rootEl) return;
		const rect = rootEl.getBoundingClientRect();
		const toolbarRect = toolbarEl?.getBoundingClientRect();
		const height = toolbarRect?.height ?? TOOLBAR_HEIGHT_GUESS;
		const width = toolbarRect?.width ?? TOOLBAR_WIDTH_GUESS;
		const above = rect.top - height - TOOLBAR_GAP;
		const top = above >= 8 ? above : rect.bottom + TOOLBAR_GAP;
		const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
		toolbarPos = { top, left };
	}

	function format(
		kind: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'subscript' | 'superscript'
	) {
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind);
	}

	function align(dir: ElementFormatType) {
		editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, dir);
	}

	function toggleList(kind: 'bullet' | 'number') {
		editor.dispatchCommand(
			kind === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
			undefined
		);
	}

	// applies a CSS style patch to the current selection's text - same
	// mechanism the designer's own font/color property fields drive on the
	// canvas side (see $lib/data/components/base-fields.ts), just scoped to
	// a text range here instead of a whole element.
	function applyStyle(styles: Record<string, string>) {
		editor.update(() => {
			const selection = getSelection();
			if (isRangeSelection(selection)) patchStyleText(selection, styles);
		});
	}

	function setBlockType(type: 'paragraph' | HeadingTagType | 'quote') {
		editor.update(() => {
			const selection = getSelection();
			if (!isRangeSelection(selection)) return;
			if (type === 'paragraph') setBlocksType(selection, () => createParagraphNode());
			else if (type === 'quote') setBlocksType(selection, () => createQuoteNode());
			else setBlocksType(selection, () => createHeadingNode(type));
		});
	}

	// the font/size/color/block-type pickers need real DOM focus to open
	// (unlike the plain toolbar buttons, whose mousedown is preventDefault'd),
	// so using them does blur the editor. Call once the pick is done to
	// return focus/cursor to the editor and let typing continue normally.
	function refocusEditor() {
		rootEl.focus();
	}

	onMount(() => {
		editor = createEditor({
			namespace: 'writer-text-slot',
			nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
			onError: (err) => console.error(err),
			theme: {
				text: {
					bold: 'font-bold',
					italic: 'italic',
					underline: 'underline',
					strikethrough: 'line-through',
					subscript: 'align-sub text-[0.75em]',
					superscript: 'align-super text-[0.75em]'
				},
				list: {
					ul: 'list-disc pl-5',
					ol: 'list-decimal pl-5'
				},
				quote: 'border-l-2 border-ui-border pl-2 italic',
				heading: {
					h1: 'text-2xl font-bold',
					h2: 'text-xl font-bold',
					h3: 'text-lg font-bold'
				}
			}
		});
		editor.setRootElement(rootEl);
		registerRichText(editor);
		registerHistory(editor, createEmptyHistoryState(), 300);
		const unregisterListPlugin = registerList(editor);

		// captured once here, deliberately not re-read after this - the
		// editor becomes the source of truth once mounted; re-syncing from
		// the `value` prop on every keystroke would fight the user's cursor.
		const initialValue = value;
		editor.update(() => {
			const root = getRoot();
			const paragraph = createParagraphNode();
			root.append(paragraph);
			if (initialValue) {
				// legacy plain-text slot values (typed before this editor
				// existed) parse into bare text nodes, not paragraphs - root
				// only accepts element/decorator children, so raw
				// `root.append(...nodes)` throws on that content.
				// $insertNodes wraps/merges loose inline nodes into the
				// selected paragraph instead of appending them directly.
				const dom = new DOMParser().parseFromString(initialValue, 'text/html');
				paragraph.select();
				insertNodes(generateNodesFromDOM(editor, dom));
			}
		});

		const unregisterUpdate = editor.registerUpdateListener(() => {
			editor.getEditorState().read(() => {
				// an "empty" editor still serializes to e.g. `<p><br></p>`
				// (truthy) - normalize to '' so callers' `value || fallback`
				// checks still see an untouched slot as empty.
				const empty = getRoot().getTextContent().trim() === '';
				isEmpty = empty;
				onchange(empty ? '' : generateHtmlFromNodes(editor));
			});
		});

		const onResizeOrScroll = () => {
			if (toolbarPos) positionToolbar();
		};
		window.addEventListener('resize', onResizeOrScroll);
		window.addEventListener('scroll', onResizeOrScroll, true);

		const unregisterFocus = editor.registerCommand(
			FOCUS_COMMAND,
			() => {
				positionToolbar();
				return false;
			},
			COMMAND_PRIORITY_LOW
		);
		// mousedown (not click) on the plain toolbar buttons preventDefault's,
		// so clicking those never blurs the editor at all. The font/size/color
		// pickers and block-type select can't do that (they need real focus
		// to open their native UI), so blur DOES fire when opening them - stay
		// open when focus landed somewhere inside the toolbar itself, only
		// actually close the toolbar when focus left it entirely.
		const unregisterBlur = editor.registerCommand(
			BLUR_COMMAND,
			(event: FocusEvent) => {
				const next = (event.relatedTarget as Node | null) ?? document.activeElement;
				if (toolbarEl && next && toolbarEl.contains(next)) return false;
				toolbarPos = null;
				return false;
			},
			COMMAND_PRIORITY_LOW
		);
		const unregisterCanUndo = editor.registerCommand(
			CAN_UNDO_COMMAND,
			(payload) => {
				canUndo = payload;
				return false;
			},
			COMMAND_PRIORITY_LOW
		);
		const unregisterCanRedo = editor.registerCommand(
			CAN_REDO_COMMAND,
			(payload) => {
				canRedo = payload;
				return false;
			},
			COMMAND_PRIORITY_LOW
		);

		return () => {
			unregisterUpdate();
			unregisterFocus();
			unregisterBlur();
			unregisterCanUndo();
			unregisterCanRedo();
			unregisterListPlugin();
			window.removeEventListener('resize', onResizeOrScroll);
			window.removeEventListener('scroll', onResizeOrScroll, true);
		};
	});
</script>

{#snippet toolButton(
	label: string,
	onClick: () => void,
	disabled: boolean,
	children: import('svelte').Snippet
)}
	<button
		type="button"
		onmousedown={(e) => e.preventDefault()}
		onclick={onClick}
		{disabled}
		aria-label={label}
		class="rounded p-1 hover:bg-slytherin/10 disabled:pointer-events-none disabled:opacity-30"
	>
		{@render children()}
	</button>
{/snippet}

{#if toolbarPos}
	<div
		use:portal
		class="fixed z-50 flex max-w-[380px] flex-wrap items-center gap-1 rounded-md border border-ui-border bg-ui-surface p-1 shadow-md"
		style="top: {toolbarPos.top}px; left: {toolbarPos.left}px;"
	>
		{@render toolButton(
			'Undo',
			() => editor.dispatchCommand(UNDO_COMMAND, undefined),
			!canUndo,
			undo
		)}
		{@render toolButton(
			'Redo',
			() => editor.dispatchCommand(REDO_COMMAND, undefined),
			!canRedo,
			redo
		)}
		<div class="h-5 w-px bg-ui-border"></div>
		{@render toolButton('Bold', () => format('bold'), false, bold)}
		{@render toolButton('Italic', () => format('italic'), false, italic)}
		{@render toolButton('Underline', () => format('underline'), false, underlineIcon)}
		{@render toolButton('Strikethrough', () => format('strikethrough'), false, strike)}
		{@render toolButton('Subscript', () => format('subscript'), false, sub)}
		{@render toolButton('Superscript', () => format('superscript'), false, sup)}
		<div class="h-5 w-px bg-ui-border"></div>
		<select
			onchange={(e) => {
				setBlockType(e.currentTarget.value as 'paragraph' | HeadingTagType | 'quote');
				refocusEditor();
			}}
			aria-label="Block type"
			class="rounded border border-transparent bg-transparent text-xs hover:border-ui-border"
		>
			<option value="" selected disabled>Format</option>
			<option value="paragraph">Normal</option>
			<option value="h1">Heading 1</option>
			<option value="h2">Heading 2</option>
			<option value="h3">Heading 3</option>
			<option value="quote">Quote</option>
		</select>
		{@render toolButton('Bulleted list', () => toggleList('bullet'), false, bulletList)}
		{@render toolButton('Numbered list', () => toggleList('number'), false, numberedList)}
		<div class="h-5 w-px bg-ui-border"></div>
		{@render toolButton('Align left', () => align('left'), false, alignLeft)}
		{@render toolButton('Align center', () => align('center'), false, alignCenter)}
		{@render toolButton('Align right', () => align('right'), false, alignRight)}
		{@render toolButton('Justify', () => align('justify'), false, alignJustify)}
		{@render toolButton(
			'Decrease indent',
			() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined),
			false,
			outdentIcon
		)}
		{@render toolButton(
			'Increase indent',
			() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined),
			false,
			indentIcon
		)}
		<div class="h-5 w-px bg-ui-border"></div>
		<select
			onchange={(e) => {
				const val = e.currentTarget.value;
				if (val === '+ Add Font') {
					fontStore.openModal();
					return;
				}
				applyStyle({ 'font-family': val });
				refocusEditor();
			}}
			aria-label="Font"
			class="rounded border border-transparent bg-transparent text-xs font-medium hover:border-ui-border"
		>
			<option value="" selected disabled>Font</option>
			<option value="+ Add Font" class="font-bold text-slytherin">+ Add Font</option>
			{#each fontStore.fonts as font (font.name)}
				<option value={font.name}>{font.name}</option>
			{/each}
		</select>
		<select
			onchange={(e) => {
				applyStyle({ 'font-size': e.currentTarget.value });
				refocusEditor();
			}}
			aria-label="Font size"
			class="rounded border border-transparent bg-transparent text-xs hover:border-ui-border"
		>
			<option value="" selected disabled>Size</option>
			{#each FONT_SIZE_OPTIONS as size (size)}
				<option value={size}>{size}</option>
			{/each}
		</select>
		<label
			aria-label="Text color"
			class="relative flex cursor-pointer items-center rounded p-1 hover:bg-slytherin/10"
		>
			<span class="text-xs">A</span>
			<input
				type="color"
				oninput={(e) => applyStyle({ color: e.currentTarget.value })}
				onchange={refocusEditor}
				class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
			/>
		</label>
	</div>
{/if}

{#snippet undo()}<Undo2 class="h-3.5 w-3.5" />{/snippet}
{#snippet redo()}<Redo2 class="h-3.5 w-3.5" />{/snippet}
{#snippet bold()}<Bold class="h-3.5 w-3.5" />{/snippet}
{#snippet italic()}<Italic class="h-3.5 w-3.5" />{/snippet}
{#snippet underlineIcon()}<Underline class="h-3.5 w-3.5" />{/snippet}
{#snippet strike()}<Strikethrough class="h-3.5 w-3.5" />{/snippet}
{#snippet sub()}<Subscript class="h-3.5 w-3.5" />{/snippet}
{#snippet sup()}<Superscript class="h-3.5 w-3.5" />{/snippet}
{#snippet bulletList()}<List class="h-3.5 w-3.5" />{/snippet}
{#snippet numberedList()}<ListOrdered class="h-3.5 w-3.5" />{/snippet}
{#snippet alignLeft()}<TextAlignStart class="h-3.5 w-3.5" />{/snippet}
{#snippet alignCenter()}<TextAlignCenter class="h-3.5 w-3.5" />{/snippet}
{#snippet alignRight()}<TextAlignEnd class="h-3.5 w-3.5" />{/snippet}
{#snippet alignJustify()}<TextAlignJustify class="h-3.5 w-3.5" />{/snippet}
{#snippet indentIcon()}<ListIndentIncrease class="h-3.5 w-3.5" />{/snippet}
{#snippet outdentIcon()}<ListIndentDecrease class="h-3.5 w-3.5" />{/snippet}

<div class="relative h-full w-full">
	{#if isEmpty && placeholder}
		<span
			class="pointer-events-none absolute inset-0 overflow-hidden px-1 text-ui-text-muted"
			style={textStyle}
		>
			{placeholder}
		</span>
	{/if}
	<div
		bind:this={rootEl}
		contenteditable="true"
		class="h-full w-full overflow-auto px-1 outline-none"
		style={textStyle}
	></div>
</div>
