<script lang="ts">
	import { t } from "../admin-i18n/i18n.svelte";

	type Props = {
		hasCheckedAuth: boolean;
		isAuthenticated: boolean;
		loadError: string | null;
		isLoading: boolean;
		/** Globals were committed elsewhere while this browser had edits (which were kept). */
		remoteChangedWhileDirty?: boolean;
	};

	let {
		hasCheckedAuth,
		isAuthenticated,
		loadError,
		isLoading,
		remoteChangedWhileDirty = false,
	}: Props = $props();
</script>

{#if hasCheckedAuth && !isAuthenticated}
	<div class="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
		{t("globals.signInToEdit")}
		<a href="/admin/login" class="underline">{t("sidebar.goToLogin")}</a>
	</div>
{/if}

{#if loadError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		{t("globals.loadFailed", { error: loadError })}
	</div>
{/if}

{#if remoteChangedWhileDirty}
	<div class="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
		{t("globals.remoteChangedBefore")}
		<a href="/admin/changes" class="underline">{t("sidebar.remoteChangedLink")}</a>{t("sidebar.remoteChangedAfter")}
	</div>
{/if}

{#if isLoading}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		{t("globals.loading")}
	</div>
{/if}
