<script lang="ts">
  import type { FieldDefinition, FieldValue, SchemaValues } from "../core/types";
  import { getFieldComponent } from "./field-registry";
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
    onFieldChange: (fieldName: string, locale: string, value: FieldValue) => void;
  }

  let { fields, values, context, translatableLocaleMode, idPrefix, onFieldChange }: Props = $props();

  const renderItems = $derived(
    buildSchemaRenderItems({ fields }, values, context, translatableLocaleMode),
  );
</script>

<div class="space-y-4">
  {#each renderItems as item (item.localizedField.name)}
    {@const FieldComponent = getFieldComponent(item.sourceField.type)}
    {#if FieldComponent}
      <FieldComponent
        field={idPrefix
          ? { ...item.localizedField, name: `${idPrefix}-${item.localizedField.name}` }
          : item.localizedField}
        value={item.value}
        onValueChange={(nextValue: FieldValue) =>
          onFieldChange(item.sourceField.name, item.locale, nextValue)}
      />
    {/if}
  {/each}
</div>
