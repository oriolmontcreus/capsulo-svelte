<script lang="ts">
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import HistoryIcon from "@lucide/svelte/icons/history";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import SquareIcon from "@lucide/svelte/icons/square";
	import XIcon from "@lucide/svelte/icons/x";
	import { onMount, tick } from "svelte";
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { AgentError, closeOpenToolCalls, runAgent } from "../agent";
	import { aiSidebar, isAiSidebarShortcut, setAiSidebarOpen, toggleAiSidebar } from "../ai-sidebar-state.svelte";
	import {
		createChat,
		createId,
		listChats,
		saveChat,
		titleFromMessage,
		type ChatEntry,
		type ChatRecord,
	} from "../chat-storage";
	import { undoEdit, type EditRecord } from "../edits";
	import { renderMarkdown } from "../markdown";
	import { buildSiteContext, currentAgentLocation, type AgentLocation } from "../site-content";
	import AiEditCard from "./AiEditCard.svelte";
	import AiNotice from "./AiNotice.svelte";

	let chat = $state<ChatRecord>(createChat());
	let chats = $state<ChatRecord[]>([]);
	let loaded = $state(false);
	let input = $state("");
	let running = $state(false);
	let progress = $state<string | null>(null);
	let location = $state<AgentLocation>({ kind: "other", path: "" });
	/** The assistant entry the current model step is streaming into, if it has sent text. */
	let streamingId = $state<string | null>(null);
	let abortController: AbortController | null = null;
	let scroller = $state<HTMLDivElement | null>(null);
	let textarea = $state<HTMLTextAreaElement | null>(null);

	const shortcutLabel =
		typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘." : "Ctrl+.";

	const suggestions = $derived(
		location.kind === "page"
			? ["What's on this page?", "Fix any typos on this page", "Are any translations missing on this page?"]
			: location.kind === "globals"
				? ["What are the global variables used for?", "Are any translations missing?"]
				: ["Which pages do we have?", "Are any translations missing on the site?"],
	);

	function syncLocation() {
		location = currentAgentLocation(window.location.pathname);
	}

	async function scrollToBottom() {
		await tick();
		scroller?.scrollTo({ top: scroller.scrollHeight });
	}

	/** Streamed text only pulls the view down if you haven't scrolled up to read. */
	function isNearBottom() {
		return !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 48;
	}

	function appendText(delta: string) {
		const follow = isNearBottom();
		const entry = chat.entries.find((item) => item.id === streamingId);
		if (entry?.kind === "assistant") {
			entry.text += delta;
		} else {
			// Whitespace before a tool call isn't worth a message.
			if (!delta.trim()) return;
			const id = createId();
			chat.entries.push({ id, kind: "assistant", text: delta.trimStart() });
			streamingId = id;
		}
		if (follow) void scrollToBottom();
	}

	/** Ends the streamed message of a step: trims it. */
	function endStreamedText() {
		const entry = chat.entries.find((item) => item.id === streamingId);
		if (entry?.kind === "assistant") entry.text = entry.text.trim();
		streamingId = null;
	}

	function persist() {
		chat.updatedAt = new Date().toISOString();
		void saveChat(chat);
	}

	function pushEntry(entry: ChatEntry) {
		chat.entries.push(entry);
		void scrollToBottom();
	}

	function newChat() {
		if (running) return;
		chat = createChat();
		input = "";
		void tick().then(() => textarea?.focus());
	}

	async function refreshChats() {
		chats = await listChats();
	}

	function openChat(record: ChatRecord) {
		if (running) return;
		chat = record;
		void scrollToBottom();
	}

	async function send(text = input) {
		const message = text.trim();
		if (!message || running) return;
		input = "";

		// The model hears about undos with the next message, so it doesn't redo them.
		const notes = chat.pendingNotes.splice(0);
		const modelText = notes.length ? `${notes.join("\n")}\n\n${message}` : message;

		if (chat.entries.length === 0) chat.title = titleFromMessage(message);
		pushEntry({ id: createId(), kind: "user", text: message });
		chat.transcript.push({ role: "user", content: modelText });
		persist();

		running = true;
		progress = null;
		abortController = new AbortController();
		syncLocation();
		try {
			await runAgent(
				buildSiteContext(location),
				chat.transcript,
				{
					onProgress: (label) => {
						endStreamedText();
						const follow = isNearBottom();
						progress = label;
						if (follow) void scrollToBottom();
					},
					onStepStart: endStreamedText,
					onText: appendText,
					onEdit: (edit) => {
						pushEntry({ id: createId(), kind: "edit", edit });
						persist();
					},
				},
				abortController.signal,
			);
		} catch (error) {
			if (abortController.signal.aborted) {
				pushEntry({ id: createId(), kind: "notice", text: "Stopped." });
			} else if (error instanceof AgentError) {
				pushEntry({ id: createId(), kind: "notice", text: error.message, code: error.code });
			} else {
				pushEntry({
					id: createId(),
					kind: "notice",
					text: error instanceof Error ? error.message : "Something went wrong.",
				});
			}
			closeOpenToolCalls(chat.transcript);
			if (chat.transcript.at(-1)?.role !== "assistant") {
				chat.transcript.push({ role: "assistant", content: "(This request stopped before I could answer.)" });
			}
		} finally {
			endStreamedText();
			running = false;
			progress = null;
			abortController = null;
			persist();
		}
	}

	function stop() {
		abortController?.abort();
	}

	async function handleUndo(edit: EditRecord) {
		const result = await undoEdit(edit);
		if (result.errorMessage) {
			pushEntry({ id: createId(), kind: "notice", text: `Undo failed: ${result.errorMessage}` });
			persist();
			return;
		}
		const entry = chat.entries.find((item) => item.kind === "edit" && item.edit.id === edit.id);
		if (entry?.kind === "edit") entry.edit.undoneAt = new Date().toISOString();

		const fields = edit.fields
			.filter((field) => !result.skipped.includes(field))
			.map((field) => `${field.instanceId === "globals" ? "" : `${field.instanceId}.`}${field.fieldName} (${field.locale})`)
			.join(", ");
		if (result.restored > 0) {
			chat.pendingNotes.push(`[The user undid your edit to ${edit.targetLabel}: ${fields} are back to their previous values.]`);
		}
		if (result.skipped.length > 0) {
			pushEntry({
				id: createId(),
				kind: "notice",
				text: `Kept ${result.skipped.length} ${result.skipped.length === 1 ? "field" : "fields"} that changed again after the edit.`,
			});
		}
		persist();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			void send();
		}
	}

	function autoresize() {
		if (!textarea) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
	}

	$effect(() => {
		input;
		autoresize();
	});

	$effect(() => {
		if (aiSidebar.open && loaded) {
			void tick().then(() => {
				textarea?.focus();
				void scrollToBottom();
			});
		}
	});

	onMount(() => {
		syncLocation();
		void listChats().then((stored) => {
			// Reopen the latest chat so a page reload doesn't lose the conversation.
			if (stored[0]) chat = stored[0];
			loaded = true;
			void scrollToBottom();
		});

		const onKeydown = (event: KeyboardEvent) => {
			if (!isAiSidebarShortcut(event)) return;
			event.preventDefault();
			toggleAiSidebar();
		};
		document.addEventListener("keydown", onKeydown);
		document.addEventListener("astro:page-load", syncLocation);
		return () => {
			document.removeEventListener("keydown", onKeydown);
			document.removeEventListener("astro:page-load", syncLocation);
		};
	});
</script>

<!-- Before hydration the panel's visibility comes from <html data-ai-sidebar> (set by
     AdminLayout from localStorage), so a reload doesn't flash it in; after that, state. -->
<aside
	class={[
		"border-border bg-background h-full w-[360px] shrink-0 flex-col border-l",
		loaded ? (aiSidebar.open ? "flex" : "hidden") : "hidden in-data-[ai-sidebar=open]:flex",
	]}
	aria-label="AI agent"
>
	<Tooltip.Provider delayDuration={150}>
		<header class="border-border flex h-11 shrink-0 items-center gap-1 border-b pr-2 pl-4">
			<h2 class="min-w-0 flex-1 truncate text-xs font-medium" title={chat.title}>
				{chat.entries.length ? chat.title : "AI agent"}
			</h2>

			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon-xs" onclick={newChat} disabled={running}>
							<PlusIcon aria-hidden="true" />
							<span class="sr-only">New chat</span>
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>New chat</Tooltip.Content>
			</Tooltip.Root>

			<DropdownMenu.Root onOpenChange={(open) => open && void refreshChats()}>
				<DropdownMenu.Trigger disabled={running}>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon-xs">
							<HistoryIcon aria-hidden="true" />
							<span class="sr-only">Previous chats</span>
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-64">
					<DropdownMenu.Label class="text-muted-foreground text-xs font-normal">
						Chats in this browser
					</DropdownMenu.Label>
					{#each chats.filter((item) => item.entries.length > 0).slice(0, 20) as item (item.id)}
						<DropdownMenu.Item onSelect={() => openChat(item)} class="text-xs">
							<span class="min-w-0 flex-1 truncate" class:font-medium={item.id === chat.id}>{item.title}</span>
							<span class="text-muted-foreground shrink-0 text-[10px]">
								{new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
							</span>
						</DropdownMenu.Item>
					{:else}
						<div class="text-muted-foreground px-2 py-1.5 text-xs">No chats yet</div>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<Tooltip.Root>
				<Tooltip.Trigger>
					{#snippet child({ props })}
						<Button {...props} variant="ghost" size="icon-xs" onclick={() => setAiSidebarOpen(false)}>
							<XIcon aria-hidden="true" />
							<span class="sr-only">Close</span>
						</Button>
					{/snippet}
				</Tooltip.Trigger>
				<Tooltip.Content>Close ({shortcutLabel})</Tooltip.Content>
			</Tooltip.Root>
		</header>

		<div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
			{#if loaded && chat.entries.length === 0}
				<div class="space-y-3 pt-6">
					<p class="text-sm">Ask about your content, or ask for a change.</p>
					<p class="text-muted-foreground text-xs">
						Changes are saved as drafts. You review them here and publish them from Changes.
					</p>
					<div class="flex flex-col items-start gap-1.5 pt-2">
						{#each suggestions as suggestion (suggestion)}
							<button
								type="button"
								class="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-full border px-3 py-1 text-left text-xs transition-colors"
								onclick={() => send(suggestion)}
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					{#each chat.entries as entry (entry.id)}
						{#if entry.kind === "user"}
							<div class="flex justify-end">
								<div class="bg-muted max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
									{entry.text}
								</div>
							</div>
						{:else if entry.kind === "assistant"}
							<div class="ai-markdown space-y-2 text-sm leading-relaxed break-words">
								{@html renderMarkdown(entry.text)}
							</div>
						{:else if entry.kind === "edit"}
							<AiEditCard edit={entry.edit} onUndo={handleUndo} />
						{:else}
							<AiNotice text={entry.text} code={entry.code} />
						{/if}
					{/each}
					{#if running && !streamingId}
						<div class="text-muted-foreground flex items-center gap-2 text-xs" aria-live="polite">
							<LoaderCircleIcon class="size-3 animate-spin" aria-hidden="true" />
							{progress ?? "Thinking"}…
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<form
			class="border-border shrink-0 border-t p-3"
			onsubmit={(event) => {
				event.preventDefault();
				void send();
			}}
		>
			<div
				class="border-input focus-within:border-ring focus-within:ring-ring/50 flex items-end gap-2 rounded-lg border px-3 py-2 focus-within:ring-3"
			>
				<textarea
					bind:this={textarea}
					bind:value={input}
					onkeydown={handleKeydown}
					rows="1"
					placeholder={location.kind === "page" ? "Ask about this page or request a change" : "Ask about your site"}
					aria-label="Message the AI agent"
					class="placeholder:text-muted-foreground max-h-[200px] min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 outline-none"
				></textarea>
				{#if running}
					<Button type="button" size="icon-xs" variant="secondary" onclick={stop}>
						<SquareIcon class="fill-current" aria-hidden="true" />
						<span class="sr-only">Stop</span>
					</Button>
				{:else}
					<Button type="submit" size="icon-xs" disabled={!input.trim()}>
						<ArrowUpIcon aria-hidden="true" />
						<span class="sr-only">Send</span>
					</Button>
				{/if}
			</div>
		</form>
	</Tooltip.Provider>
</aside>

<style>
	/* Compact Markdown for a 360px panel. Spacing comes from the wrapper's space-y-2. */
	.ai-markdown :global(:is(p, ul, ol, pre, blockquote, h1, h2, h3, h4, h5, h6)) {
		margin: 0;
	}
	.ai-markdown :global(:is(h1, h2)) {
		font-size: 0.95rem;
		font-weight: 600;
		padding-top: 0.25rem;
	}
	.ai-markdown :global(:is(h3, h4, h5, h6)) {
		font-size: 0.875rem;
		font-weight: 600;
	}
	.ai-markdown :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.ai-markdown :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}
	.ai-markdown :global(li + li) {
		margin-top: 0.125rem;
	}
	.ai-markdown :global(:is(ul, ol) :is(ul, ol)) {
		margin-top: 0.125rem;
	}
	.ai-markdown :global(a) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.ai-markdown :global(del) {
		opacity: 0.7;
	}
	.ai-markdown :global(:not(pre) > code) {
		background: var(--muted);
		border-radius: 0.25rem;
		padding: 0.05rem 0.3rem;
		font-size: 0.85em;
	}
	.ai-markdown :global(pre) {
		background: var(--muted);
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		overflow-x: auto;
		font-size: 0.75rem;
		line-height: 1.5;
	}
	.ai-markdown :global(blockquote) {
		border-left: 2px solid var(--border);
		padding-left: 0.75rem;
		color: var(--muted-foreground);
	}
	.ai-markdown :global(hr) {
		border-color: var(--border);
	}
	.ai-markdown :global(.ai-table) {
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: 0.5rem;
	}
	.ai-markdown :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}
	.ai-markdown :global(:is(th, td)) {
		padding: 0.375rem 0.5rem;
		white-space: nowrap;
	}
	.ai-markdown :global(:is(th, td):not([align])) {
		text-align: start;
	}
	.ai-markdown :global(th) {
		font-weight: 600;
		background: var(--muted);
	}
	.ai-markdown :global(tr + tr td),
	.ai-markdown :global(tbody tr:first-child td) {
		border-top: 1px solid var(--border);
	}
</style>
