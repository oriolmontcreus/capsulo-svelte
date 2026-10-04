<script lang="ts">
	import { onDestroy, onMount, type Snippet } from "svelte";
	import { Editor } from "@tiptap/core";

	import { cn } from "$lib/utils";
	import {
		variableInputSurfaceClass,
		variableTextareaSurfaceClass
	} from "../field-surface-styles";
	import { createMinimalExtensions } from "./create-minimal-extensions";
	import {
		normalizePastedText,
		serializeEditorValue
	} from "./serialize-editor-value";
	import {
		getMultilineMinHeight,
		multilineEditorClass,
		singlelineEditorClass
	} from "./variable-tiptap-styles";
	import VariableAutocompleteLayer, {
		type AutocompleteHandlers
	} from "../VariableAutocompleteLayer.svelte";
	import VariableTooltipLayer from "../VariableTooltipLayer.svelte";

	type Props = {
		mode: "singleline" | "multiline";
		value: string;
		onValueChange: (value: string) => void;
		placeholder?: string;
		id?: string;
		invalid?: boolean;
		rows?: number;
		autoresize?: boolean;
		/** Multiline: stop growing at this many rows and scroll instead. */
		maxRows?: number;
		/** Multiline: let the user drag the box's size (CSS `resize`). */
		resize?: "none" | "vertical" | "horizontal" | "both";
		maxLength?: number;
		/** Shown inside the box, before / after the text (e.g. a unit or an icon). */
		prefix?: Snippet;
		suffix?: Snippet;
		class?: string;
	};

	let {
		mode,
		value,
		onValueChange,
		placeholder = "",
		id,
		invalid = false,
		rows = 3,
		autoresize = true,
		maxRows,
		resize = "none",
		maxLength,
		prefix,
		suffix,
		class: className = ""
	}: Props = $props();

	let surfaceEl = $state<HTMLDivElement | undefined>();
	let element = $state<HTMLDivElement | undefined>();
	let editor = $state<Editor | undefined>();

	let isApplyingExternalValue = false;
	let lastEmittedValue: string | undefined = undefined;

	const autocompleteBridge: AutocompleteHandlers = {
		handleKeyDown: () => false
	};

	function setAutocompleteHandlers(handlers: AutocompleteHandlers | null): void {
		autocompleteBridge.handleKeyDown = handlers?.handleKeyDown ?? (() => false);
	}

	const singleLine = $derived(mode === "singleline");

	const surfaceClass = $derived(
		cn(
			singleLine ? variableInputSurfaceClass : variableTextareaSurfaceClass,
			className
		)
	);

	const adornmentClass =
		"text-muted-foreground flex shrink-0 items-center text-sm select-none [&_svg:not([class*='size-'])]:size-4";

	const editorClass = $derived(
		singleLine ? singlelineEditorClass : multilineEditorClass
	);

	const multilineMinHeight = $derived(getMultilineMinHeight(rows));

	const multilineMaxHeight = $derived(maxRows ? getMultilineMinHeight(maxRows) : undefined);

	const surfaceStyle = $derived(
		singleLine
			? undefined
			: [
					autoresize ? `min-height:${multilineMinHeight};` : `height:${multilineMinHeight};overflow-y:auto;`,
					multilineMaxHeight ? `max-height:${multilineMaxHeight};overflow-y:auto;` : "",
					resize !== "none" ? `resize:${resize};` : ""
				].join("")
	);

	function emitValue(updatedEditor: Editor): void {
		if (isApplyingExternalValue) return;

		let nextValue = serializeEditorValue(updatedEditor, singleLine);
		if (maxLength !== undefined && nextValue.length > maxLength) {
			nextValue = nextValue.slice(0, maxLength);
			isApplyingExternalValue = true;
			try {
				updatedEditor.commands.setContent(nextValue, { emitUpdate: false });
			} finally {
				isApplyingExternalValue = false;
			}
		}

		if (nextValue === lastEmittedValue) return;
		lastEmittedValue = nextValue;
		onValueChange(nextValue);
	}

	function resizeMultilineSurface(): void {
		if (!surfaceEl || singleLine || !autoresize) return;
		const proseMirror = surfaceEl.querySelector<HTMLElement>(".ProseMirror");
		if (!proseMirror) return;

		surfaceEl.style.height = "auto";
		const contentHeight = Math.max(proseMirror.scrollHeight, parseInt(multilineMinHeight, 10));
		const nextHeight = multilineMaxHeight ? Math.min(contentHeight, parseInt(multilineMaxHeight, 10)) : contentHeight;
		surfaceEl.style.height = `${nextHeight}px`;
	}

	onMount(() => {
		if (!element) return;

		editor = new Editor({
			element,
			extensions: createMinimalExtensions(mode, placeholder),
			content: value ?? "",
			editorProps: {
				attributes: {
					class: "outline-none",
					spellcheck: "false"
				},
				handleKeyDown(view, event) {
					return autocompleteBridge.handleKeyDown(view, event);
				},
				handlePaste(view, event) {
					if (singleLine && event.clipboardData) {
						const pasted = event.clipboardData.getData("text/plain");
						const normalized = normalizePastedText(pasted, true);
						if (normalized !== pasted) {
							event.preventDefault();
							view.dispatch(view.state.tr.insertText(normalized));
							return true;
						}
					}
					return false;
				}
			},
			onUpdate: ({ editor: updatedEditor }) => {
				emitValue(updatedEditor);
				resizeMultilineSurface();
			}
		});

		resizeMultilineSurface();

		return () => {
			editor?.destroy();
			editor = undefined;
		};
	});

	onDestroy(() => {
		editor?.destroy();
		editor = undefined;
	});

	$effect(() => {
		if (!editor) return;

		const next = value ?? "";
		const current = serializeEditorValue(editor, singleLine);
		if (next === current) return;

		isApplyingExternalValue = true;
		try {
			editor.commands.setContent(next, { emitUpdate: false });
			lastEmittedValue = next;
		} finally {
			isApplyingExternalValue = false;
		}

		resizeMultilineSurface();
	});

	$effect(() => {
		value;
		if (!surfaceEl || singleLine || !autoresize) return;
		resizeMultilineSurface();
	});
</script>

<VariableAutocompleteLayer
	getEditor={() => editor}
	{singleLine}
	onHandlersChange={setAutocompleteHandlers}
>
	<VariableTooltipLayer>
		<div
			bind:this={surfaceEl}
			class={cn(surfaceClass, (prefix || suffix) && "flex", (prefix || suffix) && (singleLine ? "items-center" : "items-start"))}
			style={surfaceStyle}
			aria-invalid={invalid ? "true" : undefined}
			data-slot={singleLine ? "input" : "textarea"}
		>
			{#if prefix}
				<span class={cn(adornmentClass, "pl-2.5", !singleLine && "pt-2")}>{@render prefix()}</span>
			{/if}
			<div
				bind:this={element}
				{id}
				role="textbox"
				aria-multiline={!singleLine}
				aria-invalid={invalid ? "true" : undefined}
				class={cn(
					editorClass,
					(prefix || suffix) && "min-w-0 flex-1",
					singleLine ? "variable-tiptap-singleline" : "variable-tiptap-multiline"
				)}
			></div>
			{#if suffix}
				<span class={cn(adornmentClass, "pr-2.5", !singleLine && "pt-2")}>{@render suffix()}</span>
			{/if}
		</div>
	</VariableTooltipLayer>
</VariableAutocompleteLayer>

<style>
	:global(.variable-tiptap-singleline .ProseMirror),
	:global(.variable-tiptap-multiline .ProseMirror) {
		box-shadow: none;
	}

	:global(.variable-tiptap-singleline .ProseMirror p.is-editor-empty:first-child::before),
	:global(.variable-tiptap-multiline .ProseMirror p.is-editor-empty:first-child::before) {
		color: var(--muted-foreground);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	:global(.variable-tiptap-singleline .ProseMirror p.is-editor-empty:first-child::before) {
		white-space: nowrap;
	}
</style>
