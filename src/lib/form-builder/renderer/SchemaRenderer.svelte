<script lang="ts">
  import { untrack } from "svelte";
  import type { SchemaDefinition, SchemaValues } from "../core/types";
  import { getFieldComponent } from "./field-registry";
  import {
    applySchemaFieldUpdate,
    buildSchemaRenderItems,
    createSchemaInitialValues,
    resolveSchemaRendererI18nContext,
    type TranslatableLocaleMode,
  } from "./schema-renderer-i18n";

  interface Props {
    schema: SchemaDefinition;
    locales?: string[];
    defaultLocale?: string;
    editingLocale?: string;
    translatableLocaleMode?: TranslatableLocaleMode;
    initialValues?: SchemaValues;
    onValuesChange?: (values: SchemaValues) => void;
  }

  const props: Props = $props();

  function createInitialValues(componentProps: Props): SchemaValues {
    const context = resolveSchemaRendererI18nContext({
      locales: componentProps.locales,
      defaultLocale: componentProps.defaultLocale,
      editingLocale: componentProps.editingLocale,
    });

    const schemaDefaults = createSchemaInitialValues(
      componentProps.schema,
      context.defaultLocale,
    );
    if (!componentProps.initialValues) {
      return schemaDefaults;
    }

    const mergedValues: SchemaValues = { ...schemaDefaults };
    for (const [fieldName, localizedValues] of Object.entries(
      componentProps.initialValues,
    )) {
      mergedValues[fieldName] = {
        ...(schemaDefaults[fieldName] ?? {}),
        ...(localizedValues ?? {}),
      };
    }

    return mergedValues;
  }

  const initialValues = untrack(() =>
    createInitialValues({
      schema: props.schema,
      locales: props.locales,
      defaultLocale: props.defaultLocale,
      editingLocale: props.editingLocale,
      initialValues: props.initialValues,
    }),
  );
  let values = $state<SchemaValues>(initialValues);
  const i18nContext = $derived(
    resolveSchemaRendererI18nContext({
      locales: props.locales,
      defaultLocale: props.defaultLocale,
      editingLocale: props.editingLocale,
    }),
  );
  const renderItems = $derived(
    buildSchemaRenderItems(
      props.schema,
      values,
      i18nContext,
      props.translatableLocaleMode ?? "all",
    ),
  );

  queueMicrotask(() => {
    props.onValuesChange?.({ ...values });
  });

  function updateValue(
    fieldName: string,
    fieldLocale: string,
    nextValue: string | boolean | string[],
  ) {
    values = applySchemaFieldUpdate(
      props.schema,
      values,
      fieldName,
      fieldLocale,
      nextValue,
      i18nContext,
    );

    props.onValuesChange?.({ ...values });
  }
</script>

<div class="space-y-4">
  {#each renderItems as item (item.localizedField.name)}
    {@const FieldComponent = getFieldComponent(item.sourceField.type)}
    {#if FieldComponent}
      <FieldComponent
        field={item.localizedField}
        value={item.value}
        onValueChange={(nextValue: string | boolean | string[]) =>
          updateValue(item.sourceField.name, item.locale, nextValue)}
      />
    {/if}
  {/each}
</div>
