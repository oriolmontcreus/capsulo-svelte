<script lang="ts">
  import { t } from "../../admin-i18n/i18n.svelte";
	type Props = {
		hasCheckedAuth: boolean;
		isAuthenticated: boolean;
		loadError: string | null;
		saveError: string | null;
		isBlockingLoad: boolean;
		hasEntries: boolean;
		remoteChangedWhileDirty?: boolean;
	};

	let {
		hasCheckedAuth,
		isAuthenticated,
		loadError,
		saveError,
		isBlockingLoad,
		hasEntries,
		remoteChangedWhileDirty = false,
	}: Props = $props();
</script>

{#if hasCheckedAuth && !isAuthenticated}
	<div class="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
		{t("sidebar.signInToEdit")}
		<a href="/admin/login" class="underline">{t("sidebar.goToLogin")}</a>
	</div>
{/if}

{#if loadError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		{t("sidebar.loadFailed", { error: loadError })}
	</div>
{/if}

{#if remoteChangedWhileDirty}
	<div class="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
		{t("sidebar.remoteChangedBefore")}
		<a href="/admin/changes" class="underline">{t("sidebar.remoteChangedLink")}</a>{t("sidebar.remoteChangedAfter")}
	</div>
{/if}

{#if saveError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		{t("sidebar.saveFailed", { error: saveError })}
	</div>
{/if}

{#if isBlockingLoad}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		{t("sidebar.loading")}
	</div>
{:else if !hasEntries}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		{t("sidebar.noEntries")}
	</div>
{/if}
