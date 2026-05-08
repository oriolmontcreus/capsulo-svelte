<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Badge } from "$lib/components/ui/badge";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

  import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
  import Link from "@lucide/svelte/icons/link";
  import GripVertical from "@lucide/svelte/icons/grip-vertical";
  import FileText from "@lucide/svelte/icons/file-text";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Layers from "@lucide/svelte/icons/layers";

  type BindableField = { value: string };

  type Props = {
    internalName: BindableField;
    pageName: BindableField;
    slug: BindableField;
    width?: number;
  };

  let {
    internalName = $bindable<BindableField>(),
    pageName = $bindable<BindableField>(),
    slug = $bindable<BindableField>(),
    width,
  } = $props<Props>();
</script>

<aside
  class="border-border bg-background flex min-h-0 shrink-0 flex-col overflow-hidden"
  aria-label="Page settings"
  style:width={width ? `${width}px` : undefined}
>
  <header
    class="border-border flex h-14 shrink-0 items-center gap-3 border-b px-3"
  >
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              size="icon-sm"
              aria-label="Page options"
            >
              <MoreHorizontal />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" class="w-44">
          <DropdownMenu.Item>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Item>Rename</DropdownMenu.Item>
          <DropdownMenu.Item>Move to folder</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item class="text-destructive">Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <span class="truncate text-sm font-medium">{internalName.value}</span>

      <Button
        size="sm"
        class="ml-auto h-7 bg-emerald-500 px-3 text-white hover:bg-emerald-600"
      >
        Publish
      </Button>
    </div>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto">
    <div class="space-y-5 p-4">
      <!-- Internal name -->
      <div class="space-y-1.5">
        <Label for="internal-name" class="text-xs font-medium"
          >Internal name</Label
        >
        <Input id="internal-name" bind:value={internalName.value} />
        <div class="text-muted-foreground flex justify-between text-[11px]">
          <span>{internalName.value.length} characters</span>
          <span>Maximum 256 characters</span>
        </div>
      </div>

      <!-- Page name -->
      <div class="space-y-1.5">
        <Label
          for="page-name"
          class="flex items-center gap-1.5 text-xs font-medium"
        >
          <span>Page name</span>
          <span class="text-muted-foreground">|</span>
          <span class="text-muted-foreground font-normal">
            English (United States)
          </span>
        </Label>
        <Input id="page-name" bind:value={pageName.value} />
        <div class="text-muted-foreground flex justify-between text-[11px]">
          <span>{pageName.value.length} characters</span>
          <span>Maximum 256 characters</span>
        </div>
      </div>

      <!-- Slug -->
      <div class="space-y-1.5">
        <Label for="slug" class="text-xs font-medium">
          Slug <span class="text-muted-foreground">(required)</span>
        </Label>
        <div class="relative">
          <Link
            class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          />
          <Input id="slug" bind:value={slug.value} class="pl-8" />
        </div>
      </div>
    </div>
  </div>
</aside>
