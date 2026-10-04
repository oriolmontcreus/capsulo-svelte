<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import type { ChatEntry } from "../chat-storage";
	import { formatDate, t } from "$lib/admin-i18n/i18n.svelte";

	type NoticeCode = Extract<ChatEntry, { kind: "notice" }>["code"];

	let { text, code }: { text: string; code?: NoticeCode } = $props();

	const LOGIN_COMMAND = "npx wrangler login";
	let copied = $state(false);

	/** The free allowance resets at 00:00 UTC; show when that is for the reader. */
	const resetTime = $derived.by(() => {
		const now = new Date();
		const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
		return formatDate(reset, { hour: "numeric", minute: "2-digit" });
	});

	async function copyCommand() {
		await navigator.clipboard.writeText(LOGIN_COMMAND).catch(() => {});
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<div
	class={[
		"rounded-lg px-3 py-2 text-xs",
		code ? "border-border bg-muted/50 border" : "text-muted-foreground px-0 py-0",
	]}
	role={code ? "alert" : undefined}
>
	{#if code === "dev-login-required"}
		<p>{t("ai.devLoginRequired")}</p>
		<div class="bg-background border-border mt-2 flex items-center gap-2 rounded-md border px-2 py-1 font-mono">
			<span class="flex-1">{LOGIN_COMMAND}</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground"
				onclick={copyCommand}
				aria-label={t("ai.copyCommand")}
			>
				{#if copied}
					<CheckIcon class="size-3" aria-hidden="true" />
				{:else}
					<CopyIcon class="size-3" aria-hidden="true" />
				{/if}
			</button>
		</div>
	{:else if code === "quota-exceeded"}
		<p>{t("ai.quotaExceeded", { time: resetTime })}</p>
	{:else}
		<p>{text}</p>
	{/if}
</div>
