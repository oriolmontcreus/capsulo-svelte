<script lang="ts">
  import { Upload, X, ImageIcon, Loader2, Pencil } from "@lucide/svelte";
  import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
  } from "$lib/components/ui/field";
  import type { FileUploadFieldDefinition } from "./file-upload-field.types";
  import { fileNameFromPath, removeFiles, runSignedUrlResolver, uploadFile } from "./storage";
  import { registerUploadFlusher } from "./upload-staging";
  import { isSvgFile, isSvgPath } from "./svg-utils";
  import ImageZoomModal from "./ImageZoomModal.svelte";
  import SvgEditorModal from "./SvgEditorModal.svelte";

  interface Props {
    field: FileUploadFieldDefinition;
    value: string[];
    onValueChange: (value: string[]) => void;
    error?: string;
  }

  interface StagedFile {
    id: string;
    file: File;
    previewUrl: string;
    isImage: boolean;
  }

  let { field, value, onValueChange, error }: Props = $props();

  const committedPaths = $derived(Array.isArray(value) ? value : []);
  const multiple = $derived(field.multiple ?? false);
  const maxFiles = $derived(multiple ? field.maxFiles : 1);

  let stagedFiles = $state<StagedFile[]>([]);
  let removedPaths = $state<string[]>([]);
  let signedUrls = $state<Record<string, string>>({});
  let isDragging = $state(false);
  let localError = $state<string | null>(null);
  let isFlushing = $state(false);

  const visibleCommitted = $derived(
    committedPaths.filter((path) => !removedPaths.includes(path)),
  );
  const totalCount = $derived(visibleCommitted.length + stagedFiles.length);
  const hasPendingChanges = $derived(
    stagedFiles.length > 0 || removedPaths.length > 0,
  );

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

  $effect(() =>
    runSignedUrlResolver(
      () => visibleCommitted,
      () => signedUrls,
      (next) => {
        signedUrls = next;
      },
    ),
  );

  $effect(() => {
    const unregister = registerUploadFlusher(flush);
    return unregister;
  });

  $effect(() => {
    return () => {
      for (const staged of stagedFiles) URL.revokeObjectURL(staged.previewUrl);
    };
  });

  function addFiles(files: File[]): void {
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
      // Single mode: the newest pick replaces everything else.
      for (const staged of stagedFiles) URL.revokeObjectURL(staged.previewUrl);
      removedPaths = [...committedPaths];
      stagedFiles = [createStagedFile(accepted[accepted.length - 1])];
      return;
    }

    let next = [...stagedFiles];
    for (const file of accepted) {
      if (maxFiles && visibleCommitted.length + next.length >= maxFiles) {
        localError = `You can upload at most ${maxFiles} file${maxFiles === 1 ? "" : "s"}.`;
        break;
      }
      next = [...next, createStagedFile(file)];
    }
    stagedFiles = next;
  }

  function createStagedFile(file: File): StagedFile {
    return {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      isImage: file.type.startsWith("image/"),
    };
  }

  function removeStaged(id: string): void {
    const target = stagedFiles.find((staged) => staged.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    stagedFiles = stagedFiles.filter((staged) => staged.id !== id);
  }

  function removeCommitted(path: string): void {
    if (!removedPaths.includes(path)) removedPaths = [...removedPaths, path];
  }

  function restoreCommitted(path: string): void {
    removedPaths = removedPaths.filter((removed) => removed !== path);
  }

  function onInputChange(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    if (target.files) addFiles(Array.from(target.files));
    target.value = "";
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    isDragging = false;
    if (event.dataTransfer?.files) addFiles(Array.from(event.dataTransfer.files));
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

  async function flush(): Promise<void> {
    if (!hasPendingChanges) return;

    isFlushing = true;
    try {
      const uploadedPaths: string[] = [];
      for (const staged of stagedFiles) {
        uploadedPaths.push(await uploadFile(staged.file));
      }

      if (removedPaths.length > 0) {
        await removeFiles(removedPaths);
      }

      const finalPaths = [
        ...committedPaths.filter((path) => !removedPaths.includes(path)),
        ...uploadedPaths,
      ];

      onValueChange(finalPaths);

      for (const staged of stagedFiles) URL.revokeObjectURL(staged.previewUrl);
      stagedFiles = [];
      removedPaths = [];
    } finally {
      isFlushing = false;
    }
  }

  // In single mode the picker stays available so a new pick can replace the
  // current file; in multiple mode it hides once maxFiles is reached.
  const canAddMore = $derived(
    !multiple || !maxFiles || totalCount < maxFiles,
  );

  // Image zoom + SVG editing.
  type SvgEditing =
    | { kind: "committed"; path: string }
    | { kind: "staged"; id: string }
    | null;

  let zoomSrc = $state<string | null>(null);
  let svgEditing = $state<SvgEditing>(null);
  let svgEditorOpen = $state(false);

  const editingStagedFile = $derived(
    svgEditing?.kind === "staged"
      ? stagedFiles.find((staged) => staged.id === svgEditing.id)
      : undefined,
  );
  const svgEditorFile = $derived(editingStagedFile?.file);
  const svgEditorUrl = $derived(
    svgEditing?.kind === "committed" ? signedUrls[svgEditing.path] : undefined,
  );
  const svgEditorName = $derived(
    svgEditing?.kind === "committed"
      ? fileNameFromPath(svgEditing.path)
      : (editingStagedFile?.file.name ?? "SVG"),
  );

  function openZoom(src: string): void {
    zoomSrc = src;
  }

  function closeZoom(): void {
    zoomSrc = null;
  }

  function editCommittedSvg(path: string): void {
    svgEditing = { kind: "committed", path };
    svgEditorOpen = true;
  }

  function editStagedSvg(id: string): void {
    svgEditing = { kind: "staged", id };
    svgEditorOpen = true;
  }

  // Clear the editing target once the modal is fully closed.
  $effect(() => {
    if (!svgEditorOpen) svgEditing = null;
  });

  // SVG edits follow the deferred-save model: edited committed files are staged
  // anew and the original path is marked for removal; edited staged files are
  // replaced in place.
  async function handleSaveSvg(content: string): Promise<void> {
    const blob = new Blob([content], { type: "image/svg+xml" });

    if (svgEditing?.kind === "committed") {
      const path = svgEditing.path;
      const file = new File([blob], fileNameFromPath(path), {
        type: "image/svg+xml",
      });
      stagedFiles = [...stagedFiles, createStagedFile(file)];
      if (!removedPaths.includes(path)) removedPaths = [...removedPaths, path];
    } else if (svgEditing?.kind === "staged") {
      const id = svgEditing.id;
      const target = stagedFiles.find((staged) => staged.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        const file = new File([blob], target.file.name, {
          type: "image/svg+xml",
        });
        stagedFiles = stagedFiles.map((staged) =>
          staged.id === id
            ? {
                ...staged,
                file,
                previewUrl: URL.createObjectURL(file),
                isImage: true,
              }
            : staged,
        );
      }
    }
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

  {#if visibleCommitted.length > 0 || stagedFiles.length > 0}
    <ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {#each visibleCommitted as path (path)}
        {@const committedSvg = isSvgPath(path)}
        <li
          class="group bg-muted relative aspect-square overflow-hidden rounded-md border"
        >
          {#if isImagePath(path) && signedUrls[path]}
            {#if committedSvg}
              <img
                src={signedUrls[path]}
                alt={fileNameFromPath(path)}
                class="size-full object-cover"
              />
            {:else}
              <button
                type="button"
                onclick={() => openZoom(signedUrls[path])}
                aria-label="Zoom {fileNameFromPath(path)}"
                class="size-full cursor-zoom-in"
              >
                <img
                  src={signedUrls[path]}
                  alt={fileNameFromPath(path)}
                  class="size-full object-cover"
                />
              </button>
            {/if}
          {:else if isImagePath(path)}
            <div class="flex size-full items-center justify-center">
              <Loader2 class="text-muted-foreground size-4 animate-spin" />
            </div>
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
            {#if committedSvg && signedUrls[path]}
              <button
                type="button"
                onclick={() => editCommittedSvg(path)}
                aria-label="Edit {fileNameFromPath(path)}"
                class="bg-background/80 hover:bg-background rounded-full p-1"
              >
                <Pencil class="size-3.5" />
              </button>
            {/if}
            <button
              type="button"
              onclick={() => removeCommitted(path)}
              aria-label="Remove {fileNameFromPath(path)}"
              class="bg-background/80 hover:bg-background rounded-full p-1"
            >
              <X class="size-3.5" />
            </button>
          </div>
        </li>
      {/each}

      {#each stagedFiles as staged (staged.id)}
        {@const stagedSvg = isSvgFile(staged.file)}
        <li
          class="group border-primary relative aspect-square overflow-hidden rounded-md border-2"
        >
          {#if staged.isImage}
            {#if stagedSvg}
              <img
                src={staged.previewUrl}
                alt={staged.file.name}
                class="size-full object-cover"
              />
            {:else}
              <button
                type="button"
                onclick={() => openZoom(staged.previewUrl)}
                aria-label="Zoom {staged.file.name}"
                class="size-full cursor-zoom-in"
              >
                <img
                  src={staged.previewUrl}
                  alt={staged.file.name}
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
                {staged.file.name}
              </span>
            </div>
          {/if}
          <span
            class="bg-primary text-primary-foreground absolute bottom-1 left-1 rounded px-1 text-[10px]"
          >
            new
          </span>
          <div
            class="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {#if stagedSvg}
              <button
                type="button"
                onclick={() => editStagedSvg(staged.id)}
                aria-label="Edit {staged.file.name}"
                class="bg-background/80 hover:bg-background rounded-full p-1"
              >
                <Pencil class="size-3.5" />
              </button>
            {/if}
            <button
              type="button"
              onclick={() => removeStaged(staged.id)}
              aria-label="Remove {staged.file.name}"
              class="bg-background/80 hover:bg-background rounded-full p-1"
            >
              <X class="size-3.5" />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if removedPaths.length > 0}
    <div class="text-muted-foreground space-y-1 text-xs">
      {#each removedPaths as path (path)}
        <div class="flex items-center gap-2">
          <span class="text-destructive line-through">{fileNameFromPath(path)}</span>
          <button
            type="button"
            class="text-foreground underline"
            onclick={() => restoreCommitted(path)}
          >
            undo
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if hasPendingChanges}
    <p class="text-muted-foreground flex items-center gap-1.5 text-xs">
      {#if isFlushing}
        <Loader2 class="size-3 animate-spin" />
        Applying changes…
      {:else}
        Pending changes — apply by clicking Save.
      {/if}
    </p>
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
  file={svgEditorFile}
  url={svgEditorUrl}
  onSave={handleSaveSvg}
/>
