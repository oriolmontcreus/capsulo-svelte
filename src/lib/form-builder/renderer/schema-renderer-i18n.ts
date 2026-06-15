import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
import {
  createInitialFieldValue,
  resolveFieldValue,
  setFieldValue,
} from "$lib/form-builder/core/translation-runtime";
import { normalizeSelectValue } from "../fields/SelectField/modules/select-value";
import type {
  FieldDefinition,
  SchemaDefinition,
  SchemaValues,
  SelectFieldDefinition,
} from "../core/types";

interface SchemaRendererI18nInput {
  locales?: string[];
  defaultLocale?: string;
  editingLocale?: string;
}

export interface SchemaRendererI18nContext {
  locales: string[];
  defaultLocale: string;
  editingLocale: string;
}

export type TranslatableLocaleMode = "all" | "active-only";

export interface SchemaRenderItem {
  sourceField: FieldDefinition;
  localizedField: FieldDefinition;
  locale: string;
  value: string | boolean | string[];
}

function normalizeLocales(locales: string[] | undefined): string[] {
  const trimmedLocales =
    locales
      ?.map((locale) => locale.trim())
      .filter((locale) => locale.length > 0) ?? [];
  return trimmedLocales.length ? trimmedLocales : LOCALES;
}

function normalizeOptionalLocale(
  locale: string | undefined,
): string | undefined {
  const trimmedLocale = locale?.trim();
  return trimmedLocale && trimmedLocale.length > 0 ? trimmedLocale : undefined;
}

export function resolveSchemaRendererI18nContext(
  input: SchemaRendererI18nInput,
): SchemaRendererI18nContext {
  const locales = normalizeLocales(input.locales);
  const configuredDefaultLocale =
    normalizeOptionalLocale(input.defaultLocale) ?? DEFAULT_LOCALE;
  const defaultLocale = locales.includes(configuredDefaultLocale)
    ? configuredDefaultLocale
    : (locales[0] ?? DEFAULT_LOCALE);
  const editingLocale =
    normalizeOptionalLocale(input.editingLocale) ?? defaultLocale;

  return {
    locales,
    defaultLocale,
    editingLocale,
  };
}

export function createSchemaInitialValues(
  schema: SchemaDefinition,
  defaultLocale: string,
): SchemaValues {
  const initialValues: SchemaValues = {};

  for (const field of schema.fields) {
    initialValues[field.name] = createInitialFieldValue(field, defaultLocale);
  }

  return initialValues;
}

export function buildSchemaRenderItems(
  schema: SchemaDefinition,
  values: SchemaValues,
  context: SchemaRendererI18nContext,
  translatableLocaleMode: TranslatableLocaleMode = "all",
): SchemaRenderItem[] {
  const renderItems: SchemaRenderItem[] = [];

  for (const field of schema.fields) {
    if (
      field.type !== "text" &&
      field.type !== "textarea" &&
      field.type !== "rich-editor" &&
      field.type !== "toggle" &&
      field.type !== "select" &&
      field.type !== "colorpicker" &&
      field.type !== "file-upload"
    ) {
      continue;
    }

    const fieldLocales = field.translatable && field.type !== "toggle"
      ? translatableLocaleMode === "active-only"
        ? [context.editingLocale]
        : context.locales
      : [context.defaultLocale];

    for (const locale of fieldLocales) {
      const localizedField: FieldDefinition = {
        ...field,
        name: `${field.name}-${locale}`,
        label:
          field.translatable && fieldLocales.length > 1
            ? `${field.label ?? field.name} (${locale})`
            : (field.label ?? field.name),
      };
      const valueByLocale = values[field.name] ?? {};
      const resolvedValue = field.translatable && field.type !== "toggle"
        ? valueByLocale[locale]
        : resolveFieldValue(
            field,
            valueByLocale,
            locale,
            context.defaultLocale,
          );

      const value =
        field.type === "toggle"
          ? typeof resolvedValue === "boolean"
            ? resolvedValue
            : false
          : field.type === "file-upload"
            ? (Array.isArray(resolvedValue) ? (resolvedValue as string[]) : [])
            : field.type === "select" && (field as SelectFieldDefinition).multiple
              ? (normalizeSelectValue(field as SelectFieldDefinition, resolvedValue) as string[])
              : typeof resolvedValue === "string"
                ? resolvedValue
                : "";

      renderItems.push({
        sourceField: field,
        localizedField,
        locale,
        value,
      });
    }
  }

  return renderItems;
}

export function applySchemaFieldUpdate(
  schema: SchemaDefinition,
  values: SchemaValues,
  fieldName: string,
  fieldLocale: string,
  nextValue: string | boolean | string[],
  context: SchemaRendererI18nContext,
): SchemaValues {
  const field = schema.fields.find((item) => item.name === fieldName);
  if (!field) {
    return values;
  }

  const nextValues = {
    ...values,
    [fieldName]: setFieldValue(
      field,
      values[fieldName],
      nextValue,
      field.translatable ? fieldLocale : context.editingLocale,
      context.defaultLocale,
    ),
  };

  return nextValues;
}
