<script lang="ts">
	import { onMount } from "svelte";
	import { get } from "svelte/store";
	import { supabase } from "$/db/supabase";
	import { syncSession, session, type UserProfile } from "./stores/session";

	//TODO: THIS PAGE ITS JUST FOR TESTING. WE WILL REMOVE IT LATER.
	let rows = $state<UserProfile[]>([]);
	let phase = $state<"loading" | "need_login" | "ready">("loading");
	let loadError = $state<string | null>(null);

	onMount(async () => {
		await syncSession();
		if (!get(session)?.user) {
			phase = "need_login";
			return;
		}
		const { data, error } = await supabase.from("user_profiles").select("*").order("created_at");
		if (error) {
			loadError = error.message;
			phase = "ready";
			return;
		}
		rows = data ?? [];
		phase = "ready";
	});
</script>

{#if phase === "loading"}
	<p class="text-muted-foreground">Loading profiles…</p>
{:else if phase === "need_login"}
	<p class="text-muted-foreground">
		<a class="text-primary underline underline-offset-4" href="/admin/login">Sign in</a> to load profiles.
	</p>
{:else if loadError}
	<p class="text-destructive" role="alert">{loadError}</p>
{:else}
	<ul class="list-inside list-disc space-y-1">
		{#each rows as entry (entry.id)}
			<li>{entry.name ?? entry.id}</li>
		{/each}
	</ul>
{/if}
