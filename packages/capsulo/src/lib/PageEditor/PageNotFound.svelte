<script lang="ts">
  import { t } from "../admin-i18n/i18n.svelte";
</script>

<main class="mx-auto max-w-3xl space-y-4 overflow-y-auto p-6">
  <h1 class="text-2xl font-semibold">{t("pageEditor.notFoundTitle")}</h1>
  <p class="text-muted-foreground text-sm">
    {t("pageEditor.notFoundDescription")}
  </p>
  <a
    href="/admin/page-editor"
    class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
  >
    {t("pageEditor.backToPages")}
  </a>
</main>
