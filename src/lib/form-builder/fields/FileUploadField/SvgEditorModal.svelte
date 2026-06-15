<script lang="ts">
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from "$lib/components/ui/dialog";
  import { Button } from "$lib/components/ui/button";
  import { Select as SelectPrimitive } from "bits-ui";
  import {
    Root as SelectRoot,
    Trigger as SelectTrigger,
    Content as SelectContent,
    Item as SelectItem,
    Portal as SelectPortal,
  } from "$lib/components/ui/select";
  import CodeIcon from "@lucide/svelte/icons/code";
  import Loader2Icon from "@lucide/svelte/icons/loader-2";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import { cn } from "$lib/utils";
  import CodeEditor from "./CodeEditor.svelte";
  import { formatSvg, validateSvg } from "./svg-utils";
  import { detectSvgBrightness } from "./image-brightness";

  interface Props {
    open: boolean;
    fileName: string;
    file?: File;
    url?: string;
    onSave: (content: string) => Promise<void>;
  }

  let {
    open = $bindable(false),
    fileName,
    file,
    url,
    onSave,
  }: Props = $props();

  const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5];

  let svgContent = $state("");
  let originalContent = $state("");
  let isLoading = $state(true);
  let isSaving = $state(false);
  let error = $state<string | null>(null);
  let validationError = $state<string | null>(null);
  let bgColor = $state<"black" | "white">("white");

  let zoom = $state(1);
  let pan = $state({ x: 0, y: 0 });
  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0 });

  let previewContainerEl = $state<HTMLDivElement | null>(null);

  const hasChanges = $derived(svgContent !== originalContent);
  const previewTransform = $derived(
    `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  );

  // Load the SVG source whenever the modal opens for a new file/url.
  $effect(() => {
    if (!open) return;
    const currentFile = file;
    const currentUrl = url;

    let cancelled = false;
    isLoading = true;
    error = null;

    void (async () => {
      try {
        let content: string;
        if (currentFile) {
          content = await currentFile.text();
        } else if (currentUrl) {
          const response = await fetch(currentUrl);
          if (!response.ok) throw new Error("Failed to load SVG");
          content = await response.text();
        } else {
          throw new Error("No SVG source provided");
        }

        if (cancelled) return;

        const formatted = formatSvg(content);
        bgColor = detectSvgBrightness(formatted);
        svgContent = formatted;
        originalContent = formatted;
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load SVG";
        const isCorsError =
          message.includes("CORS") ||
          message.includes("NetworkError") ||
          message.includes("fetch");
        error =
          isCorsError && currentUrl
            ? "Could not load the SVG (possible CORS/network issue). Try again."
            : message;
      } finally {
        if (!cancelled) isLoading = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  // After the SVG markup is injected, normalize its sizing so it fits the box.
  $effect(() => {
    void svgContent;
    const container = previewContainerEl;
    if (!container) return;
    const svgEl = container.querySelector("svg");
    if (!svgEl) return;
    svgEl.setAttribute("width", "100%");
    svgEl.removeAttribute("height");
    svgEl.style.width = "100%";
    svgEl.style.height = "auto";
    svgEl.style.maxHeight = "300px";
    svgEl.style.display = "block";
  });

  $effect(() => {
    const container = previewContainerEl;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.5, Math.min(5, zoom + delta));
      const rect = container.getBoundingClientRect();
      const mouseX = event.clientX - rect.left - rect.width / 2;
      const mouseY = event.clientY - rect.top - rect.height / 2;
      const zoomRatio = newZoom / zoom;
      pan = {
        x: mouseX - (mouseX - pan.x) * zoomRatio,
        y: mouseY - (mouseY - pan.y) * zoomRatio,
      };
      zoom = newZoom;
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      dragStart = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    };
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      pan = { x: event.clientX - dragStart.x, y: event.clientY - dragStart.y };
    };
    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  function handleCodeChange(next: string): void {
    svgContent = next;
    if (validationError) validationError = null;
  }

  function handleZoomSelect(value: string): void {
    zoom = parseFloat(value);
    pan = { x: 0, y: 0 };
  }

  async function handleSave(): Promise<void> {
    const result = validateSvg(svgContent);
    if (!result.valid) {
      validationError = result.error;
      return;
    }

    isSaving = true;
    error = null;
    try {
      await onSave(svgContent);
      open = false;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to save SVG";
    } finally {
      isSaving = false;
    }
  }

  function handleOpenChange(next: boolean): void {
    open = next;
    if (!next) {
      validationError = null;
      error = null;
      zoom = 1;
      pan = { x: 0, y: 0 };
    }
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent
    class="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 p-0 sm:max-w-[95vw]"
    showCloseButton={false}
  >
    <DialogHeader class="shrink-0 border-b px-6 pt-6 pb-4">
      <DialogTitle class="flex items-center gap-2">
        <CodeIcon class="size-5" />
        Edit SVG: {fileName}
      </DialogTitle>
      <DialogDescription>
        Modify the SVG code on the left. The preview updates in real time on the right.
      </DialogDescription>
    </DialogHeader>

    {#if isLoading}
      <div class="flex flex-1 items-center justify-center">
        <Loader2Icon class="text-muted-foreground size-8 animate-spin" />
      </div>
    {:else if error}
      <div class="flex flex-1 items-center justify-center p-6">
        <div
          class="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-4"
        >
          <AlertCircleIcon class="size-5" />
          <span>{error}</span>
        </div>
      </div>
    {:else}
      <div class="flex flex-1 gap-4 overflow-hidden p-6">
        <div class="flex flex-1 flex-col gap-2 overflow-hidden">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Code</p>
            {#if validationError}
              <div class="text-destructive flex items-center gap-2 text-sm">
                <AlertCircleIcon class="size-4" />
                <span>{validationError}</span>
              </div>
            {/if}
          </div>
          <CodeEditor
            value={svgContent}
            onChange={handleCodeChange}
            hasError={!!validationError}
          />
        </div>

        <div class="flex flex-1 flex-col gap-2 overflow-hidden">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Preview</p>
            <div
              class="bg-muted/50 flex items-center gap-2.5 rounded-full px-2.5 py-1.5"
            >
              <SelectRoot
                type="single"
                value={zoom.toString()}
                onValueChange={handleZoomSelect}
              >
                <SelectTrigger size="sm" class="h-6 w-[74px] px-2 text-xs">
                  <SelectPrimitive.Value>
                    {Math.round(zoom * 100)}%
                  </SelectPrimitive.Value>
                </SelectTrigger>
                <SelectPortal>
                  <SelectContent class="min-w-[80px]">
                    {#each ZOOM_LEVELS as level (level)}
                      <SelectItem
                        value={level.toString()}
                        label={`${Math.round(level * 100)}%`}
                      >
                        {Math.round(level * 100)}%
                      </SelectItem>
                    {/each}
                  </SelectContent>
                </SelectPortal>
              </SelectRoot>

              <div class="bg-border h-6 w-px"></div>

              <button
                type="button"
                onclick={() => (bgColor = "black")}
                class="group flex cursor-pointer items-center gap-1.5"
                aria-label="Dark background"
              >
                <div
                  class={cn(
                    "size-5 cursor-pointer rounded-full bg-black transition-all",
                    bgColor === "black"
                      ? "ring-primary ring-offset-muted/50 ring-1 ring-offset-1"
                      : "ring-border group-hover:ring-primary/50 ring-1",
                  )}
                ></div>
                <span class="text-muted-foreground text-[10px] font-medium">Dark</span>
              </button>

              <button
                type="button"
                onclick={() => (bgColor = "white")}
                class="group flex cursor-pointer items-center gap-1.5"
                aria-label="Light background"
              >
                <div
                  class={cn(
                    "size-5 cursor-pointer rounded-full bg-white transition-all",
                    bgColor === "white"
                      ? "ring-primary ring-offset-muted/50 ring-1 ring-offset-1"
                      : "ring-border group-hover:ring-primary/50 ring-1",
                  )}
                ></div>
                <span class="text-muted-foreground text-[10px] font-medium">Light</span>
              </button>
            </div>
          </div>

          <div
            class="flex flex-1 items-center justify-center overflow-hidden rounded-md border p-8 transition-colors"
            style:background-color={bgColor === "black" ? "#000" : "#fff"}
          >
            {#if validationError}
              <p class="text-muted-foreground text-sm">Fix errors to see preview</p>
            {:else if svgContent.trim()}
              <div
                bind:this={previewContainerEl}
                class="relative flex h-full w-full items-center justify-center"
                style:cursor={isDragging ? "grabbing" : "grab"}
              >
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <div
                  class="w-full select-none"
                  style:transform-origin="center"
                  style:transform={previewTransform}
                  style:transition={isDragging ? "none" : "transform 0.1s ease-out"}
                >
                  <!-- The content is authored by the user inside this same editor. -->
                  {@html svgContent}
                </div>
              </div>
            {:else}
              <p class="text-muted-foreground text-sm">Unable to generate preview</p>
            {/if}
          </div>
        </div>
      </div>

      <DialogFooter class="shrink-0 border-t px-6 pt-4 pb-6">
        <Button variant="outline" onclick={() => handleOpenChange(false)} disabled={isSaving}>
          Cancel
        </Button>
        <Button onclick={handleSave} disabled={!hasChanges || isSaving || !!validationError}>
          {#if isSaving}
            <Loader2Icon class="mr-2 size-4 animate-spin" />
            Saving...
          {:else}
            Save
          {/if}
        </Button>
      </DialogFooter>
    {/if}
  </DialogContent>
</Dialog>
