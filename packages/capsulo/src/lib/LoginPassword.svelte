<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { session, sessionDisplayName, signIn, syncSession } from "./stores/session";
  import * as Card from "$lib/components/ui/card";
  import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldContent,
    FieldError,
  } from "$lib/components/ui/field";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/admin-i18n/i18n.svelte";

  const signedInUser = $derived($session?.user ?? null);

  let login = $state("");
  let password = $state("");
  let errorMessage = $state("");
  let isSubmitting = $state(false);

  // The login page renders this form twice (mobile and desktop layouts); keep ids unique.
  const uid = $props.id();
  const loginInputId = `${uid}-login`;
  const passwordInputId = `${uid}-password`;

  /** Only same-site admin paths, so `?next=` can't be used as an open redirect. */
  function nextPath(): string {
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  }

  onMount(async () => {
    await syncSession();
    // Arriving from the admin gate while already signed in (or auto-signed in by
    // `astro dev`): go straight back.
    if ($session && new URLSearchParams(window.location.search).has("next")) {
      window.location.replace(nextPath());
    }
  });

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = "";
    const trimmedLogin = login.trim();
    if (!trimmedLogin || !password) {
      errorMessage = t("login.missingCredentials");
      return;
    }

    isSubmitting = true;
    const result = await signIn(trimmedLogin, password);
    isSubmitting = false;

    if (result.error) {
      errorMessage = result.error;
      return;
    }
    password = "";
    window.location.replace(nextPath());
  }
</script>

<Card.Root class="mx-auto w-full max-w-sm">
  <Card.Header>
    <Card.Title class="text-2xl">{t("login.title")}</Card.Title>
    <Card.Description class="text-balance">
      {t("login.description")}
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    {#if signedInUser}
      <Button href={nextPath()} class="w-full" variant="secondary">
        {t("login.continueAs", { name: sessionDisplayName(signedInUser) })}
        <ArrowRight data-icon="inline-end" />
      </Button>
    {/if}
    <form onsubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel for={loginInputId}>{t("login.loginLabel")}</FieldLabel>
          <FieldContent>
            <Input
              id={loginInputId}
              type="text"
              placeholder="you@example.com"
              bind:value={login}
              required
              autocomplete="username"
              autocapitalize="none"
              spellcheck={false}
              aria-invalid={errorMessage !== ""}
            />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel for={passwordInputId}>{t("login.passwordLabel")}</FieldLabel>
          <FieldContent>
            <Input
              id={passwordInputId}
              type="password"
              bind:value={password}
              required
              autocomplete="current-password"
              aria-invalid={errorMessage !== ""}
            />
            {#if errorMessage}
              <FieldError>{errorMessage}</FieldError>
            {/if}
          </FieldContent>
        </Field>
        <Field>
          <Button type="submit" class="w-full" variant="surface" disabled={isSubmitting}>
            {isSubmitting ? t("login.submitting") : t("login.submit")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  </Card.Content>
</Card.Root>
