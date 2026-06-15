<script lang="ts">
  import XIcon from "@lucide/svelte/icons/x";
  import { Select as SelectPrimitive } from "bits-ui";
  import {
    Root as SelectRoot,
    Trigger as SelectTrigger,
    Content as SelectContent,
    Item as SelectItem,
    Portal as SelectPortal,
  } from "$lib/components/ui/select";
  import { cn } from "$lib/utils";
  import { detectImageBrightness, detectSvgBrightness } from "./image-brightness";

  interface Props {
    src: string;
    onClose: () => void;
  }

  let { src, onClose }: Props = $props();

  const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 5];

  let bgColor = $state<"black" | "white">("black");
  let zoom = $state(1);
  let pan = $state({ x: 0, y: 0 });
  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0 });

  let imgEl = $state<HTMLImageElement | null>(null);
  let containerEl = $state<HTMLDivElement | null>(null);

  const isSvgSrc = $derived(src.endsWith(".svg") || src.includes("image/svg"));

  const transform = $derived(
    `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
  );

  // Auto-detect background for SVGs (raster images are handled on <img> load).
  $effect(() => {
    if (!isSvgSrc) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(src);
        const svgContent = await response.text();
        if (!cancelled) bgColor = detectSvgBrightness(svgContent);
      } catch {
        if (!cancelled) bgColor = "white";
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const container = containerEl;
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

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  });

  $effect(() => {
    const container = containerEl;
    if (!container) return;

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      dragStart = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      pan = {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  $effect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  function handleZoomSelect(value: string): void {
    zoom = parseFloat(value);
    pan = { x: 0, y: 0 };
  }

  async function handleImageLoad(): Promise<void> {
    if (isSvgSrc || !imgEl) return;
    try {
      bgColor = await detectImageBrightness(imgEl);
    } catch {
      /* keep current background on failure */
    }
  }
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200"
  style:background-color={bgColor === "black" ? "#000" : "#fff"}
>
  <div
    bind:this={containerEl}
    class="relative flex h-full w-full items-center justify-center overflow-hidden"
    style:cursor={isDragging ? "grabbing" : "grab"}
  >
    <img
      bind:this={imgEl}
      {src}
      alt="Zoomed"
      draggable="false"
      onload={handleImageLoad}
      class="max-h-full max-w-full select-none object-contain"
      style:transform-origin="center"
      style:transform
      style:transition={isDragging ? "none" : "transform 0.1s ease-out"}
    />

    <div class="absolute top-5 left-5 z-10">
      <div
        class="flex items-center gap-2.5 rounded-full bg-black/70 px-2.5 py-1 shadow-lg backdrop-blur-sm"
      >
        <SelectRoot
          type="single"
          value={zoom.toString()}
          onValueChange={handleZoomSelect}
        >
          <SelectTrigger
            class="h-6 w-[74px] rounded-md border-none bg-white/10 px-2 text-xs font-medium text-white shadow-none ring-0 hover:bg-white/20 focus-visible:ring-0"
          >
            <SelectPrimitive.Value>
              {Math.round(zoom * 100)}%
            </SelectPrimitive.Value>
          </SelectTrigger>
          <SelectPortal>
            <SelectContent class="min-w-[80px]">
              {#each ZOOM_LEVELS as level (level)}
                <SelectItem value={level.toString()} label={`${Math.round(level * 100)}%`}>
                  {Math.round(level * 100)}%
                </SelectItem>
              {/each}
            </SelectContent>
          </SelectPortal>
        </SelectRoot>

        <div class="h-6 w-px bg-white/20"></div>

        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            bgColor = "black";
          }}
          class="group flex items-center gap-1.5"
          aria-label="Dark background"
        >
          <div
            class={cn(
              "size-5 cursor-pointer rounded-full bg-black transition-all",
              bgColor === "black"
                ? "ring-1 ring-white ring-offset-1 ring-offset-black/70"
                : "ring-1 ring-white/30 group-hover:ring-white/50",
            )}
          ></div>
          <span class="text-[10px] font-medium text-white/70">Dark</span>
        </button>

        <button
          type="button"
          onclick={(e) => {
            e.stopPropagation();
            bgColor = "white";
          }}
          class="group flex items-center gap-1.5"
          aria-label="Light background"
        >
          <div
            class={cn(
              "size-5 cursor-pointer rounded-full bg-white transition-all",
              bgColor === "white"
                ? "ring-1 ring-white ring-offset-1 ring-offset-black/70"
                : "ring-1 ring-white/30 group-hover:ring-white/50",
            )}
          ></div>
          <span class="text-[10px] font-medium text-white/70">Light</span>
        </button>
      </div>
    </div>

    <div class="absolute top-5 right-5 z-10">
      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        class="flex size-[44px] cursor-pointer items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all hover:bg-black/80"
        aria-label="Close"
      >
        <XIcon size={18} />
      </button>
    </div>
  </div>
</div>
