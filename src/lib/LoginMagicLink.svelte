<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "../db/supabase";

	let email = $state("");
	let message = $state("");

	onMount(async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (session?.user?.email) {
			message = `Sesión iniciada como ${session.user.email}`;
		}
	});

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

<form onsubmit={handleSubmit}>
	<label>
		Correo:
		<input type="email" bind:value={email} required autocomplete="email" />
	</label>
	<button type="submit">Enviar enlace mágico</button>
</form>
<p>{message}</p>
