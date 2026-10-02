<script lang="ts">
  import { untrack } from "svelte";
  import type { FieldValue, SchemaDefinition, SchemaValues } from "../core/types";
  import SchemaFieldList from "./SchemaFieldList.svelte";
  import { setSchemaRendererContext } from "./schema-renderer-context";
  import {
    applySchemaFieldUpdate,
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
  const translatableLocaleMode = $derived(props.translatableLocaleMode ?? "all");

  // Repeater items render their own field lists and need the same locale setup.
  setSchemaRendererContext({
    get i18n() {
      return i18nContext;
    },
    get translatableLocaleMode() {
      return translatableLocaleMode;
    },
  });

  queueMicrotask(() => {
    props.onValuesChange?.({ ...values });
  });

  function updateValue(
    fieldName: string,
    fieldLocale: string,
    nextValue: FieldValue,
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

<SchemaFieldList
  fields={props.schema.fields}
  {values}
  context={i18nContext}
  {translatableLocaleMode}
  onFieldChange={updateValue}
/>
