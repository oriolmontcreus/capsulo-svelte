<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Placeholder from "@tiptap/extension-placeholder";
  import Underline from "@tiptap/extension-underline";
  import { createGlobalVariableHighlightExtension } from "$lib/globals/variable-autocomplete/global-variable-highlight-extension";
  import VariableAutocompleteLayer, {
    type AutocompleteHandlers,
  } from "$lib/globals/variable-autocomplete/VariableAutocompleteLayer.svelte";
  import VariableTooltipLayer from "$lib/globals/variable-autocomplete/VariableTooltipLayer.svelte";
  import { createReactiveEditor } from "$lib/globals/variable-autocomplete/variable-tiptap/create-reactive-editor";

  import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
  } from "$lib/components/ui/field";
  import { cn } from "$lib/utils.js";
  import type { RichEditorFieldDefinition } from "./rich-editor-field.types";

  interface Props {
    field: RichEditorFieldDefinition;
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
  }

  let { field, value, onValueChange, error }: Props = $props();

  let element: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();

  const toolbarButtonBaseClass =
    "text-foreground/80 hover:bg-muted inline-flex h-7 w-9 items-center justify-center rounded-none font-medium text-sm transition cursor-pointer";

  // Prevent editor->value->editor feedback loops.
  let isApplyingExternalValue = false;
  let lastEmittedHtml: string | undefined = undefined;

  const autocompleteBridge: AutocompleteHandlers = {
    handleKeyDown: () => false,
  };

  function setAutocompleteHandlers(handlers: AutocompleteHandlers | null): void {
    autocompleteBridge.handleKeyDown = handlers?.handleKeyDown ?? (() => false);
  }

  const reactiveEditor = $derived(
    editor ? createReactiveEditor(editor) : undefined,
  );

  onMount(() => {
    if (!element) return;

    editor = new Editor({
      element,
      extensions: [
        StarterKit,
        Underline,
        Placeholder.configure({
          placeholder: field.placeholder ?? "",
        }),
        createGlobalVariableHighlightExtension(),
      ],
      content: value ?? "",
      editorProps: {
        attributes: {
          spellcheck: "false",
        },
        handleKeyDown(view, event) {
          return autocompleteBridge.handleKeyDown(view, event);
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        if (isApplyingExternalValue) return;
        const html = updatedEditor.getHTML();
        if (html === lastEmittedHtml) return;
        lastEmittedHtml = html;
        onValueChange(html);
      },
    });

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
    // If value changes externally (locale switch, form reset, etc.), update TipTap
    // but guard against loops by checking the current editor HTML.
    if (!editor) return;
    const next = value ?? "";
    const current = editor.getHTML();
    if (next === current) return;

    isApplyingExternalValue = true;
    try {
      editor.commands.setContent(next, { emitUpdate: false });
    } finally {
      isApplyingExternalValue = false;
    }
  });
</script>

<Field data-invalid={error ? "true" : undefined}>
  <FieldLabel for={field.name}>
    {field.label ?? field.name}
    {#if field.required}
      <span class="text-destructive">*</span>
    {/if}
  </FieldLabel>

  <VariableAutocompleteLayer
    getEditor={() => editor}
    singleLine={false}
    onHandlersChange={setAutocompleteHandlers}
  >
    <VariableTooltipLayer>
      <div
        class={cn(
          "border-input focus-within:border-ring focus-within:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:bg-input/30 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex w-full flex-col overflow-hidden rounded-md border bg-white shadow-xs outline-none transition-[color,box-shadow] focus-within:ring-3 aria-invalid:ring-3 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        aria-invalid={error ? "true" : undefined}
      >
        {#if reactiveEditor}
          <div class="border-input/60 flex items-center gap-1 border-b px-2 py-1">
            <button
              type="button"
              class={cn(
                toolbarButtonBaseClass,
                reactiveEditor.isActive("bold") && "bg-muted text-foreground",
              )}
              onclick={() => reactiveEditor.chain().focus().toggleBold().run()}
            >
              B
            </button>

            <button
              type="button"
              class={cn(
                toolbarButtonBaseClass,
                reactiveEditor.isActive("italic") && "bg-muted text-foreground",
              )}
              onclick={() => reactiveEditor.chain().focus().toggleItalic().run()}
            >
              <i>I</i>
            </button>

            <button
              type="button"
              class={cn(
                toolbarButtonBaseClass,
                reactiveEditor.isActive("underline") && "bg-muted text-foreground",
              )}
              onclick={() => reactiveEditor.chain().focus().toggleUnderline().run()}
            >
              <u>U</u>
            </button>
          </div>
        {/if}

        <div
          bind:this={element}
          class="min-h-[60px] px-3 py-2 text-base md:text-sm [&_.ProseMirror]:min-h-[60px] [&_.ProseMirror]:outline-none"
        ></div>
      </div>
    </VariableTooltipLayer>
  </VariableAutocompleteLayer>

  {#if field.description}
    <FieldDescription>{field.description}</FieldDescription>
  {/if}

  {#if error}
    <FieldError>{error}</FieldError>
  {/if}
</Field>
