<script lang="ts">
  import {
    EditorView,
    lineNumbers,
    highlightActiveLineGutter,
    highlightSpecialChars,
    drawSelection,
    keymap,
  } from "@codemirror/view";
  import { EditorState } from "@codemirror/state";
  import { xml } from "@codemirror/lang-xml";
  import { oneDark } from "@codemirror/theme-one-dark";
  import {
    foldGutter,
    indentOnInput,
    syntaxHighlighting,
    defaultHighlightStyle,
    bracketMatching,
    foldKeymap,
  } from "@codemirror/language";
  import { history, defaultKeymap, historyKeymap } from "@codemirror/commands";
  import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
  import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
  import { untrack } from "svelte";
  import { cn } from "$lib/utils";

  interface Props {
    value: string;
    onChange: (value: string) => void;
    hasError?: boolean;
  }

  let { value, onChange, hasError = false }: Props = $props();

  let editorEl = $state<HTMLDivElement | null>(null);
  let view: EditorView | null = null;

  // Light theme: a few overrides on top of CodeMirror's default (light) look.
  const lightTheme = EditorView.theme(
    {
      "&": { backgroundColor: "#ffffff", color: "#000000" },
      ".cm-content": { caretColor: "#000000" },
      "&.cm-focused .cm-cursor": { borderLeftColor: "#000000" },
      ".cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "#add6ff",
      },
    },
    { dark: false },
  );

  const editorTheme = EditorView.theme({
    "&": { height: "100%", fontSize: "14px" },
    ".cm-scroller": {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      overflowX: "auto",
    },
    ".cm-activeLine": { backgroundColor: "transparent" },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
  });

  // Shift + wheel scrolls horizontally.
  const wheelHandler = EditorView.domEventHandlers({
    wheel(event, editorView) {
      if (event.shiftKey) {
        editorView.scrollDOM.scrollLeft += event.deltaY;
        event.preventDefault();
        return true;
      }
      return false;
    },
  });

  function isDarkMode(): boolean {
    return document.documentElement.classList.contains("dark");
  }

  function createState(doc: string, isDark: boolean): EditorState {
    return EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
        ]),
        xml(),
        isDark ? oneDark : lightTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        editorTheme,
        wheelHandler,
      ],
    });
  }

  $effect(() => {
    const parent = editorEl;
    if (!parent) return;

    let isDark = isDarkMode();
    const initialValue = untrack(() => value);
    view = new EditorView({ state: createState(initialValue, isDark), parent });

    // Recreate the editor when the color theme flips.
    const observer = new MutationObserver(() => {
      const nextDark = isDarkMode();
      if (nextDark === isDark || !view) return;
      isDark = nextDark;
      const currentValue = view.state.doc.toString();
      view.destroy();
      view = new EditorView({ state: createState(currentValue, isDark), parent });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      view?.destroy();
      view = null;
    };
  });

  // Sync external value changes into the editor without resetting on self-edits.
  $effect(() => {
    const nextValue = value;
    if (view && nextValue !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: nextValue },
      });
    }
  });
</script>

<div
  bind:this={editorEl}
  class={cn(
    "h-full overflow-hidden rounded-md border",
    hasError && "ring-destructive ring-2",
  )}
></div>
