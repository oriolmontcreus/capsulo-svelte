<script lang="ts">
  import { Upload, X, ImageIcon, Loader2, Pencil } from "@lucide/svelte";
  import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
  } from "$lib/components/ui/field";
  import type { FileUploadFieldDefinition } from "./file-upload-field.types";
  import { fileNameFromPath, mediaUrl, uploadFile } from "./storage";
  import { isSvgPath } from "./svg-utils";
  import ImageZoomModal from "./ImageZoomModal.svelte";
  import SvgEditorModal from "./SvgEditorModal.svelte";

  interface Props {
    field: FileUploadFieldDefinition;
    value: string[];
    onValueChange: (value: string[]) => void;
    error?: string;
  }

  /** A picked file whose upload is still running. */
  interface PendingUpload {
    id: string;
    name: string;
    previewUrl: string;
    isImage: boolean;
    controller: AbortController;
  }

  let { field, value, onValueChange, error }: Props = $props();

  // Files upload as soon as they are picked and their keys go straight into the
  // value, so they land in the local draft and are reviewed and committed like
  // any other field. Removing a file only drops it from the value: the bytes
  // stay because committed revisions may still reference them, and the server
  // cleans up uploads nothing references.
  const paths = $derived(Array.isArray(value) ? value : []);
  const multiple = $derived(field.multiple ?? false);
  const maxFiles = $derived(multiple ? field.maxFiles : 1);

  let pending = $state<PendingUpload[]>([]);
  let isDragging = $state(false);
  let localError = $state<string | null>(null);

  const totalCount = $derived(paths.length + pending.length);

  let inputEl = $state<HTMLInputElement | null>(null);

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function isImagePath(path: string): boolean {
    return /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(path);
  }

  function matchesAccept(file: File, accept: string): boolean {
    const patterns = accept
      .split(",")
      .map((pattern) => pattern.trim().toLowerCase())
      .filter(Boolean);
    if (patterns.length === 0) return true;

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    return patterns.some((pattern) => {
      if (pattern.startsWith(".")) return fileName.endsWith(pattern);
      if (pattern.endsWith("/*")) return fileType.startsWith(pattern.slice(0, -1));
      return fileType === pattern;
    });
  }

  function currentPaths(): string[] {
    return Array.isArray(value) ? value : [];
  }

  function releasePending(id: string): void {
    const target = pending.find((upload) => upload.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    pending = pending.filter((upload) => upload.id !== id);
  }

  // Leaving the editor mid-upload cancels it; nothing was written to the value yet.
  $effect(() => {
    return () => {
      for (const upload of pending) {
        upload.controller.abort();
        URL.revokeObjectURL(upload.previewUrl);
      }
    };
  });

  // Closing or reloading the tab mid-upload would lose the file silently.
  $effect(() => {
    if (pending.length === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  });

  function startUpload(file: File): PendingUpload {
    const upload: PendingUpload = {
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith("image/"),
      controller: new AbortController(),
    };
    pending = [...pending, upload];
    return upload;
  }

  /** Uploads `file`; resolves to its key, or null if it was cancelled or failed. */
  async function runUpload(file: File, upload: PendingUpload): Promise<string | null> {
    try {
      return await uploadFile(file, upload.controller.signal);
    } catch (uploadError) {
      if (!upload.controller.signal.aborted) {
        localError =
          uploadError instanceof Error ? uploadError.message : `Failed to upload "${file.name}".`;
      }
      return null;
    } finally {
      releasePending(upload.id);
    }
  }

  async function addFiles(files: File[]): Promise<void> {
    localError = null;
    if (files.length === 0) return;

    const accepted: File[] = [];
    for (const file of files) {
      if (field.maxSize && file.size > field.maxSize) {
        localError = `"${file.name}" exceeds the ${formatBytes(field.maxSize)} limit.`;
        continue;
      }
      if (field.accept && !matchesAccept(file, field.accept)) {
        localError = `"${file.name}" is not an accepted file type.`;
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length === 0) return;

    if (!multiple) {
      // Single mode: the newest pick replaces the current file and any upload
      // still running for an earlier pick.
      for (const upload of pending) upload.controller.abort();
      const file = accepted[accepted.length - 1];
      const upload = startUpload(file);
      const key = await runUpload(file, upload);
      if (key && !upload.controller.signal.aborted) onValueChange([key]);
      return;
    }

    const queued: { file: File; upload: PendingUpload }[] = [];
    for (const file of accepted) {
      if (maxFiles && totalCount >= maxFiles) {
        localError = `You can upload at most ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`;
        break;
      }
      queued.push({ file, upload: startUpload(file) });
    }

    // One at a time, so the files keep the order they were picked in. Each key
    // is appended to the value as it arrives, so a slow file never holds back
    // the ones before it.
    for (const { file, upload } of queued) {
      if (upload.controller.signal.aborted) continue;
      const key = await runUpload(file, upload);
      if (key && !upload.controller.signal.aborted) onValueChange([...currentPaths(), key]);
    }
  }

  function cancelPending(id: string): void {
    pending.find((upload) => upload.id === id)?.controller.abort();
    releasePending(id);
  }

  function removePath(path: string): void {
    onValueChange(currentPaths().filter((current) => current !== path));
  }

  function onInputChange(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    if (target.files) void addFiles(Array.from(target.files));
    target.value = "";
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files) void addFiles(Array.from(event.dataTransfer.files));
  }

  function onDragOver(event: DragEvent): void {
    event.preventDefault();
    isDragging = true;
  }

  function onDragLeave(): void {
    isDragging = false;
  }

  function openPicker(): void {
    inputEl?.click();
  }

  // In single mode the picker stays available so a new pick can replace the
  // current file; in multiple mode it hides once maxFiles is reached.
  const canAddMore = $derived(
    !multiple || !maxFiles || totalCount < maxFiles,
  );

  // Image zoom + SVG editing.
  let zoomSrc = $state<string | null>(null);
  let svgEditingPath = $state<string | null>(null);
  let svgEditorOpen = $state(false);

  const svgEditorUrl = $derived(svgEditingPath ? mediaUrl(svgEditingPath) : undefined);
  const svgEditorName = $derived(
    svgEditingPath ? fileNameFromPath(svgEditingPath) : "SVG",
  );

  function openZoom(src: string): void {
    zoomSrc = src;
  }

  function closeZoom(): void {
    zoomSrc = null;
  }

  function editSvg(path: string): void {
    svgEditingPath = path;
    svgEditorOpen = true;
  }

  // Clear the editing target once the modal is fully closed.
  $effect(() => {
    if (!svgEditorOpen) svgEditingPath = null;
  });

  // Uploads are immutable, so an edited SVG is uploaded as a new file that takes
  // the original's place in the value. The modal shows errors and stays open if
  // this throws.
  async function handleSaveSvg(content: string): Promise<void> {
    const path = svgEditingPath;
    if (!path) return;
    const file = new File([content], fileNameFromPath(path), {
      type: "image/svg+xml",
    });
    const key = await uploadFile(file);
    const current = currentPaths();
    const index = current.indexOf(path);
    onValueChange(
      index >= 0
        ? current.map((existing, i) => (i === index ? key : existing))
        : [...current, key],
    );
  }
</script>

<Field data-invalid={error ? "true" : undefined}>
  <FieldLabel id="{field.name}-label">
    {field.label ?? field.name}
    {#if field.required}
      <span class="text-destructive">*</span>
    {/if}
  </FieldLabel>

  <input
    bind:this={inputEl}
    type="file"
    class="sr-only"
    accept={field.accept}
    multiple={multiple}
    onchange={onInputChange}
  />

  {#if canAddMore}
    <button
      type="button"
      aria-labelledby="{field.name}-label"
      onclick={openPicker}
      ondrop={onDrop}
      ondragover={onDragOver}
      ondragleave={onDragLeave}
      class="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm transition-colors {isDragging
        ? 'border-primary bg-accent'
        : 'border-input hover:bg-accent'}"
    >
      <Upload class="text-muted-foreground size-5" />
      <span class="text-muted-foreground">
        <span class="text-foreground font-medium">Click to upload</span> or drag and drop
      </span>
      {#if field.maxSize || maxFiles}
        <span class="text-muted-foreground text-xs">
          {#if maxFiles}Up to {maxFiles} file{maxFiles === 1 ? "" : "s"}{/if}
          {#if field.maxSize}{maxFiles ? " · " : ""}Max {formatBytes(field.maxSize)}{/if}
        </span>
      {/if}
    </button>
  {/if}

  {#if paths.length > 0 || pending.length > 0}
    <ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {#each paths as path (path)}
        {@const url = mediaUrl(path)}
        {@const isSvg = isSvgPath(path)}
        <li
          class="group bg-muted relative aspect-square overflow-hidden rounded-md border"
        >
          {#if isImagePath(path)}
            {#if isSvg}
              <img
                src={url}
                alt={fileNameFromPath(path)}
                class="size-full object-cover"
              />
            {:else}
              <button
                type="button"
                onclick={() => openZoom(url)}
                aria-label="Zoom {fileNameFromPath(path)}"
                class="size-full cursor-zoom-in"
              >
                <img
                  src={url}
                  alt={fileNameFromPath(path)}
                  class="size-full object-cover"
                />
              </button>
            {/if}
          {:else}
            <div
              class="flex size-full flex-col items-center justify-center gap-1 p-1 text-center"
            >
              <ImageIcon class="text-muted-foreground size-4" />
              <span class="text-muted-foreground truncate text-[10px]">
                {fileNameFromPath(path)}
              </span>
            </div>
          {/if}
          <div
            class="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {#if isSvg}
              <button
                type="button"
                onclick={() => editSvg(path)}
                aria-label="Edit {fileNameFromPath(path)}"
                class="bg-background/80 hover:bg-background rounded-full p-1"
              >
                <Pencil class="size-3.5" />
              </button>
            {/if}
            <button
              type="button"
              onclick={() => removePath(path)}
              aria-label="Remove {fileNameFromPath(path)}"
              class="bg-background/80 hover:bg-background rounded-full p-1"
            >
              <X class="size-3.5" />
            </button>
          </div>
        </li>
      {/each}

      {#each pending as upload (upload.id)}
        <li
          class="group bg-muted relative aspect-square overflow-hidden rounded-md border"
          aria-busy="true"
        >
          {#if upload.isImage}
            <img
              src={upload.previewUrl}
              alt={upload.name}
              class="size-full object-cover opacity-50"
            />
          {:else}
            <div
              class="flex size-full flex-col items-center justify-center gap-1 p-1 text-center"
            >
              <ImageIcon class="text-muted-foreground size-4" />
              <span class="text-muted-foreground truncate text-[10px]">
                {upload.name}
              </span>
            </div>
          {/if}
          <div class="absolute inset-0 flex items-center justify-center">
            <Loader2 class="text-foreground size-5 animate-spin" />
          </div>
          <div
            class="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <button
              type="button"
              onclick={() => cancelPending(upload.id)}
              aria-label="Cancel upload of {upload.name}"
              class="bg-background/80 hover:bg-background rounded-full p-1"
            >
              <X class="size-3.5" />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if field.description}
    <FieldDescription>{field.description}</FieldDescription>
  {/if}

  {#if localError}
    <FieldError>{localError}</FieldError>
  {/if}

  {#if error}
    <FieldError>{error}</FieldError>
  {/if}
</Field>

{#if zoomSrc}
  <ImageZoomModal src={zoomSrc} onClose={closeZoom} />
{/if}

<SvgEditorModal
  bind:open={svgEditorOpen}
  fileName={svgEditorName}
  url={svgEditorUrl}
  onSave={handleSaveSvg}
/>
