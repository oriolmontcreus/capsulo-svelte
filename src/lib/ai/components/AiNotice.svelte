<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import type { ChatEntry } from "../chat-storage";

	type NoticeCode = Extract<ChatEntry, { kind: "notice" }>["code"];

	let { text, code }: { text: string; code?: NoticeCode } = $props();

	const LOGIN_COMMAND = "npx wrangler login";
	let copied = $state(false);

	/** The free allowance resets at 00:00 UTC; show when that is for the reader. */
	const resetTime = $derived.by(() => {
		const now = new Date();
		const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
		return reset.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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
		<p>The AI agent calls Cloudflare Workers AI, which needs your Cloudflare login in local dev. Run this once in the project folder, then send your message again:</p>
		<div class="bg-background border-border mt-2 flex items-center gap-2 rounded-md border px-2 py-1 font-mono">
			<span class="flex-1">{LOGIN_COMMAND}</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground"
				onclick={copyCommand}
				aria-label="Copy command"
			>
				{#if copied}
					<CheckIcon class="size-3" aria-hidden="true" />
				{:else}
					<CopyIcon class="size-3" aria-hidden="true" />
				{/if}
			</button>
		</div>
	{:else if code === "quota-exceeded"}
		<p>You've used today's free AI allowance. It resets at {resetTime} your time (00:00 UTC). Nothing is charged.</p>
	{:else}
		<p>{text}</p>
	{/if}
</div>
