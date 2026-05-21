<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { supabase } from "../db/supabase";
  import { onMount } from "svelte";
  import {
    session,
    sessionDisplayName,
    syncSession,
    userProfile,
  } from "./stores/session";
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

  const signedInUser = $derived($session?.user ?? null);
  const continueAsName = $derived(sessionDisplayName($userProfile));

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
      feedback = "Please enter your email.";
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
      feedback = "Check your email for the magic link.";
      feedbackKind = "success";
    }
  }
</script>

<Card.Root class="mx-auto w-full max-w-sm">
  <Card.Header>
    <Card.Title class="text-2xl">Sign in</Card.Title>
    <Card.Description class="text-balance">
      Enter your email and we'll send you a link to sign in.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    {#if signedInUser?.email}
      <Button href="/" class="w-full" variant="secondary">
        Continue as {continueAsName || signedInUser?.email}
        <ArrowRight data-icon="inline-end" />
      </Button>
    {/if}
    <form onsubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel for={emailInputId}>Email</FieldLabel>
          <FieldContent>
            <Input
              id={emailInputId}
              type="email"
              placeholder="you@example.com"
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
          <Button type="submit" class="w-full" variant="surface"
            >Send magic link</Button
          >
        </Field>
      </FieldGroup>
    </form>
  </Card.Content>
</Card.Root>
