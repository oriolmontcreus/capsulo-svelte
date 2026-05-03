<script lang="ts">
	import { supabase } from "../db/supabase";
	import { onMount } from "svelte";
	import { session, syncSession } from "./stores/session";
	import {
		Field,
		FieldLabel,
		FieldContent,
		FieldError,
		FieldDescription,
	} from "$lib/components/ui/field/index.js";
	import { Input } from "$lib/components/ui/input/index.js";

	let email = $state("");
	let feedback = $state("");
	let feedbackKind = $state<"none" | "error" | "success">("none");

	const emailInputId = "login-magic-email";
	const showInputError = $derived(feedbackKind === "error" && feedback !== "");

	onMount(() => syncSession());

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		feedbackKind = "none";
		feedback = "";
		const trimmed = email.trim();
		if (!trimmed) {
			feedback = "Introduce un correo.";
			feedbackKind = "error";
			return;
		}

		const { error } = await supabase.auth.signInWithOtp({
			email: trimmed,
			options: {
				emailRedirectTo: `${window.location.origin}/login`,
			},
		});

		if (error) {
			feedback = error.message;
			feedbackKind = "error";
		} else {
			feedback = "Revisa tu correo para el enlace mágico.";
			feedbackKind = "success";
		}
	}
</script>

{#if $session?.user?.email}
	<p>Sesión iniciada como {$session.user.email}</p>
{/if}

<form class="flex max-w-sm flex-col gap-4" onsubmit={handleSubmit}>
	<Field>
		<FieldLabel for={emailInputId}>Correo</FieldLabel>
		<FieldContent>
			<Input
				id={emailInputId}
				type="email"
				bind:value={email}
				required
				autocomplete="email"
				aria-invalid={showInputError}
			/>
			{#if feedbackKind === "error" && feedback}
				<FieldError>{feedback}</FieldError>
			{:else if feedbackKind === "success" && feedback}
				<FieldDescription>{feedback}</FieldDescription>
			{/if}
		</FieldContent>
	</Field>
	<button type="submit">Enviar enlace mágico</button>
</form>
