<script lang="ts">
  import { untrack } from "svelte";
  import type { FieldValue, SchemaDefinition, SchemaValues } from "../core/types";
  import { validateSchemaValues, validationIssueKey } from "../core/validation";
  import SchemaFieldList from "./SchemaFieldList.svelte";
  import {
    pathStartsWith,
    setSchemaRendererContext,
    type FieldFocusRequest,
  } from "./schema-renderer-context";
  import {
    applySchemaFieldUpdate,
    resolveSchemaRendererI18nContext,
    withSchemaDefaults,
    type TranslatableLocaleMode,
  } from "./schema-renderer-i18n";

  interface Props {
    schema: SchemaDefinition;
    locales?: string[];
    defaultLocale?: string;
    editingLocale?: string;
    translatableLocaleMode?: TranslatableLocaleMode;
    initialValues?: SchemaValues;
    /** Show every validation error, not only those of fields edited here. */
    showAllErrors?: boolean;
    /** Scroll to and focus this field (a new object per request). */
    focusRequest?: FieldFocusRequest | null;
    onValuesChange?: (values: SchemaValues) => void;
  }

  const props: Props = $props();

  function createInitialValues(componentProps: Props): SchemaValues {
    const context = resolveSchemaRendererI18nContext({
      locales: componentProps.locales,
      defaultLocale: componentProps.defaultLocale,
      editingLocale: componentProps.editingLocale,
    });

    return withSchemaDefaults(
      componentProps.schema,
      componentProps.initialValues,
      context.defaultLocale,
    );
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

  // Validated on every change; a field shows its error once it's edited, or when asked to.
  const issues = $derived(
    validateSchemaValues(props.schema, values, {
      defaultLocale: i18nContext.defaultLocale,
      locales: i18nContext.locales,
    }),
  );
  let touched = $state<Record<string, true>>({});
  const shownIssues = $derived(
    props.showAllErrors
      ? issues
      : issues.filter((issue) => touched[validationIssueKey(issue.path, issue.locale)]),
  );
  const shownErrorByKey = $derived(
    new Map(shownIssues.map((issue) => [validationIssueKey(issue.path, issue.locale), issue.message])),
  );

  const validation = {
    errorFor: (path: string[], locale: string) => shownErrorByKey.get(validationIssueKey(path, locale)),
    errorCountWithin: (path: string[]) =>
      shownIssues.filter((issue) => pathStartsWith(issue.path, path)).length,
    markTouched: (path: string[], locale: string) => {
      const key = validationIssueKey(path, locale);
      if (!touched[key]) touched[key] = true;
    },
    get showAll() {
      return props.showAllErrors ?? false;
    },
    get focusRequest() {
      return props.focusRequest ?? null;
    },
  };

  // Repeater items render their own field lists and need the same locale setup.
  setSchemaRendererContext({
    get i18n() {
      return i18nContext;
    },
    get translatableLocaleMode() {
      return translatableLocaleMode;
    },
    validation,
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
