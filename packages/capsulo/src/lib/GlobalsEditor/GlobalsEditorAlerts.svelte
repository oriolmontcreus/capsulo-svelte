<script lang="ts">
	import type { ContentIssue } from "$lib/capsules/core/validate-content";
	import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
	import { t } from "$lib/admin-i18n/i18n.svelte";

	type Props = {
		hasCheckedAuth: boolean;
		isAuthenticated: boolean;
		loadError: string | null;
		saveError: string | null;
		isLoading: boolean;
		/** Problems that blocked the last save. */
		validationIssues?: ContentIssue[];
	};

	let {
		hasCheckedAuth,
		isAuthenticated,
		loadError,
		saveError,
		isLoading,
		validationIssues = [],
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

{#if validationIssues.length > 0}
	<div class="border-destructive/30 bg-destructive/5 space-y-1 rounded-md border p-3 text-xs" role="alert">
		<p class="text-destructive font-medium">
			{t("globals.fixBeforeSaving", { count: validationIssues.length })}
		</p>
		<ul class="list-disc space-y-0.5 pl-4">
			{#each validationIssues as issue (`${issue.path.join(".")}@${issue.locale}`)}
				<li>
					{issue.message}
					{#if issue.locale !== DEFAULT_LOCALE}
						<span class="bg-muted rounded px-1 text-[10px] uppercase">{issue.locale}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}

{#if saveError}
	<div class="text-destructive rounded-md border p-3 text-xs">
		{t("globals.saveFailed", { error: saveError })}
	</div>
{/if}

{#if isLoading}
	<div class="text-muted-foreground rounded-md border border-dashed p-4 text-xs">
		{t("globals.loading")}
	</div>
{/if}
