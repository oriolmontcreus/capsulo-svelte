<script lang="ts">
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
		Sign in to load and save page editor content.
		<a href="/admin/login" class="underline">Go to login</a>.
	</div>
{/if}

{#if loadError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		Failed to load page content: {loadError}
	</div>
{/if}

{#if remoteChangedWhileDirty}
	<div class="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
		This page was committed somewhere else while you had unsaved edits here. Your edits
		were kept - review them on the
		<a href="/admin/changes" class="underline">Changes page</a>.
	</div>
{/if}

{#if saveError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		Failed to save page content: {saveError}
	</div>
{/if}

{#if isBlockingLoad}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		Loading page editor content...
	</div>
{:else if !hasEntries}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		No capsule entries found for this page yet.
	</div>
{/if}
