<script lang="ts">
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";

  import { Button } from "$lib/components/ui/button";
  import { toggleMode } from "mode-watcher";
  import type { ButtonVariant } from "$lib/components/ui/button";
  import { cn } from "$lib/utils";
  import type { ClassValue } from "clsx";

  let {
    variant = "outline",
    class: className,
  }: { variant: ButtonVariant; class?: ClassValue } = $props();
</script>

<Button onclick={toggleMode} {variant} size="icon" class={cn(className)}>
  <SunIcon
    class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
  />
  <MoonIcon
    class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
  />
  <span class="sr-only">Toggle theme</span>
</Button>
