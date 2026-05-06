<script lang="ts">
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";

  import { Button } from "$lib/components/ui/button";

  function toggleTheme() {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");

    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }
</script>

<Button onclick={toggleTheme} variant="outline" size="icon">
  <SunIcon
    class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all! dark:scale-0 dark:-rotate-90"
  />
  <MoonIcon
    class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all! dark:scale-100 dark:rotate-0"
  />
  <span class="sr-only">Toggle theme</span>
</Button>
