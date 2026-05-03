<script lang="ts">
	import { supabase } from "../db/supabase";
	import { onMount } from "svelte";
	import { session, syncSession } from "./stores/session";

	let email = $state("");
	let message = $state("");

	onMount(() => syncSession());

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		message = "";
		const trimmed = email.trim();
		if (!trimmed) {
			message = "Introduce un correo.";
			return;
		}

		const { error } = await supabase.auth.signInWithOtp({
			email: trimmed,
			options: {
				emailRedirectTo: `${window.location.origin}/login`,
			},
		});

		message = error?.message ?? "Revisa tu correo para el enlace mágico.";
	}
</script>

{#if $session?.user?.email}
	<p>Sesión iniciada como {$session.user.email}</p>
{/if}

<form onsubmit={handleSubmit}>
	<label>
		Correo:
		<input type="email" bind:value={email} required autocomplete="email" />
	</label>
	<button type="submit">Enviar enlace mágico</button>
</form>
<p>{message}</p>
