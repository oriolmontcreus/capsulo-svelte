<script lang="ts">
	import { supabase } from "../db/supabase";
	import { onMount } from "svelte";
	import { session, syncSession } from "./stores/session";
	import * as Card from "$lib/components/ui/card";
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldContent,
		FieldError,
		FieldDescription,
	} from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";

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
	<p class="text-muted-foreground mb-4 text-center text-sm">
		Sesión iniciada como {$session.user.email}
	</p>
{/if}

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title class="text-2xl">Iniciar sesión</Card.Title>
		<Card.Description>
			Introduce tu correo y te enviaremos un enlace para entrar.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form onsubmit={handleSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel for={emailInputId}>Correo</FieldLabel>
					<FieldContent>
						<Input
							id={emailInputId}
							type="email"
							placeholder="m@ejemplo.com"
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
				<Field>
					<Button type="submit" class="w-full">Enviar enlace mágico</Button>
				</Field>
			</FieldGroup>
		</form>
	</Card.Content>
</Card.Root>
