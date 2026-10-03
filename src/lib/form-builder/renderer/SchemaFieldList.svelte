<script lang="ts">
  import { tick } from "svelte";
  import { isFieldHidden, isFieldRequired, resolveConditionValues } from "../core/conditions";
  import type { FieldDefinition, FieldValue, SchemaValues } from "../core/types";
  import { validationIssueKey } from "../core/validation";
  import { getFieldComponent } from "./field-registry";
  import { getSchemaRendererContext } from "./schema-renderer-context";
  import {
    buildSchemaRenderItems,
    type SchemaRendererI18nContext,
    type TranslatableLocaleMode,
  } from "./schema-renderer-i18n";

  interface Props {
    fields: FieldDefinition[];
    values: SchemaValues;
    context: SchemaRendererI18nContext;
    translatableLocaleMode: TranslatableLocaleMode;
    /** Prepended to each field's DOM id, so repeated item fields stay unique on the page. */
    idPrefix?: string;
    /** Where these fields sit in the schema: [] at the root, [repeater, itemId] in an item. */
    path?: string[];
    onFieldChange: (fieldName: string, locale: string, value: FieldValue) => void;
  }

  let {
    fields,
    values,
    context,
    translatableLocaleMode,
    idPrefix,
    path = [],
    onFieldChange,
  }: Props = $props();

  const renderer = getSchemaRendererContext();
  /** Longer than the repeater item's slide transition (150ms). */
  const FOCUS_SETTLE_MS = 220;

  // Conditions see the sibling values in the default locale, exactly as the validator does.
  const conditionValues = $derived(resolveConditionValues(fields, values, context.defaultLocale));
  const visibleFields = $derived(fields.filter((field) => !isFieldHidden(field, conditionValues)));
  const renderItems = $derived(
    buildSchemaRenderItems({ fields: visibleFields }, values, context, translatableLocaleMode),
  );

  /** Required is enforced in the default locale, so other locales don't show the asterisk. */
  function showsRequired(field: FieldDefinition, locale: string): boolean {
    return locale === context.defaultLocale && isFieldRequired(field, conditionValues);
  }

  let listEl = $state<HTMLElement | null>(null);
  let handledFocusRequest: unknown = null;

  // Bring a requested field into view once it renders (repeater items expand themselves first).
  $effect(() => {
    const request = renderer.validation.focusRequest;
    if (!request || request === handledFocusRequest || !listEl) return;
    const focusPath = request.path;
    if (focusPath.length !== path.length + 1 || focusPath.slice(0, -1).join(".") !== path.join(".")) return;
    const target = listEl.querySelector<HTMLElement>(`:scope > [data-field-path="${CSS.escape(focusPath.join("."))}"]`);
    if (!target) return;
    handledFocusRequest = request;
    // Wait out a repeater item's open transition, or the scroll lands short of the field.
    void tick().then(() =>
      setTimeout(() => {
        target.scrollIntoView({ block: "center" });
        target.querySelector<HTMLElement>("input, textarea, [contenteditable='true'], button")?.focus({ preventScroll: true });
        target.dataset.focusFlash = "true";
        setTimeout(() => delete target.dataset.focusFlash, 1600);
      }, FOCUS_SETTLE_MS),
    );
  });
</script>

<div class="space-y-4" bind:this={listEl}>
  {#each renderItems as item (item.localizedField.name)}
    {@const FieldComponent = getFieldComponent(item.sourceField.type)}
    {@const fieldPath = [...path, item.sourceField.name]}
    {#if FieldComponent}
      <div
        class="rounded-md transition-shadow data-[focus-flash=true]:ring-ring/60 data-[focus-flash=true]:ring-4 data-[focus-flash=true]:ring-offset-4 data-[focus-flash=true]:ring-offset-background"
        data-field-path={fieldPath.join(".")}
        data-field-key={validationIssueKey(fieldPath, item.locale)}
      >
        <FieldComponent
          field={{
            ...item.localizedField,
            name: idPrefix ? `${idPrefix}-${item.localizedField.name}` : item.localizedField.name,
            required: showsRequired(item.sourceField, item.locale),
          }}
          value={item.value}
          error={renderer.validation.errorFor(fieldPath, item.locale)}
          path={fieldPath}
          onValueChange={(nextValue: FieldValue) => {
            renderer.validation.markTouched(fieldPath, item.locale);
            onFieldChange(item.sourceField.name, item.locale, nextValue);
          }}
        />
      </div>
    {/if}
  {/each}
</div>
