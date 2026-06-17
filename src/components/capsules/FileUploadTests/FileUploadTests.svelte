<script lang="ts">
  import { getCmsData } from "$lib/cms/get-cms-data";
  import * as Card from "$lib/components/ui/card";
  import { fileNameFromPath, runSignedUrlResolver } from "$lib/form-builder/fields/FileUploadField/storage";

  import { fileUploadTestsSchema } from "./file-upload-tests.schema";
  import type { FileUploadTestsData } from "./file-upload-tests.schema.d";

  interface Props {
    instanceId: string;
  }

  let { instanceId }: Props = $props();

  const data = $derived(
    getCmsData<FileUploadTestsData & Record<string, unknown>>(
      instanceId,
      fileUploadTestsSchema,
    ),
  );

  const fileFields = $derived(
    fileUploadTestsSchema.fields.filter((field) => field.type === "file-upload"),
  );

  const allPaths = $derived(
    fileFields.flatMap((field) => {
      const value = data[field.name as keyof typeof data];
      return Array.isArray(value) ? (value as string[]) : [];
    }),
  );

  let signedUrls = $state<Record<string, string>>({});

  $effect(() =>
    runSignedUrlResolver(
      () => allPaths,
      () => signedUrls,
      (next) => {
        signedUrls = next;
      },
    ),
  );

  function pathsFor(fieldName: string): string[] {
    const value = data[fieldName as keyof typeof data];
    return Array.isArray(value) ? (value as string[]) : [];
  }
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight">File Upload Field Tests</h1>
    <p class="text-muted-foreground text-sm">
      Live preview of FileUpload configurations. Edit values in the admin page
      editor — uploads and deletions only take effect after clicking Save.
    </p>
    <p class="text-muted-foreground font-mono text-xs">instance: {instanceId}</p>
  </header>

  <Card.Root>
    <Card.Header>
      <Card.Title>Uploaded files</Card.Title>
      <Card.Description>
        {fileFields.length} file fields from the file-upload-tests schema
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <dl class="divide-border divide-y">
        {#each fileFields as field (field.name)}
          {@const paths = pathsFor(field.name)}
          <div class="grid gap-2 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
            <dt class="space-y-0.5">
              <span class="font-medium">{field.label ?? field.name}</span>
              <span class="text-muted-foreground block font-mono text-xs">
                {field.name}
              </span>
            </dt>
            <dd>
              {#if paths.length > 0}
                <ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {#each paths as path (path)}
                    <li
                      class="bg-muted relative aspect-square overflow-hidden rounded-md border"
                    >
                      {#if signedUrls[path]}
                        <img
                          src={signedUrls[path]}
                          alt={fileNameFromPath(path)}
                          class="size-full object-cover"
                        />
                      {:else}
                        <div
                          class="text-muted-foreground flex size-full items-center justify-center text-[10px]"
                        >
                          loading…
                        </div>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {:else}
                <span class="text-muted-foreground text-sm italic">—</span>
              {/if}
            </dd>
          </div>
        {/each}
      </dl>
    </Card.Content>
  </Card.Root>

  {#if data.caption}
    <Card.Root>
      <Card.Header>
        <Card.Title>Caption</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-sm">{data.caption}</p>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
