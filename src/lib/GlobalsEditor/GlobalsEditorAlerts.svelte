<script lang="ts">
	type Props = {
		hasCheckedAuth: boolean;
		isAuthenticated: boolean;
		loadError: string | null;
		saveError: string | null;
		isLoading: boolean;
	};

	let {
		hasCheckedAuth,
		isAuthenticated,
		loadError,
		saveError,
		isLoading,
	}: Props = $props();
</script>

{#if hasCheckedAuth && !isAuthenticated}
	<div class="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
		Sign in to load and save global variables.
		<a href="/admin/login" class="underline">Go to login</a>.
	</div>
{/if}

{#if loadError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		Failed to load global variables: {loadError}
	</div>
{/if}

{#if saveError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		Failed to save global variables: {saveError}
	</div>
{/if}

{#if isLoading}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		Loading global variables...
	</div>
{/if}
