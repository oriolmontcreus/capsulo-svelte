# Configuración global (`capsulo.config.ts`) y sistema de traducciones

Resumen orientado a desarrollo y migración: **qué es `capsulo.config.ts`**, dónde se usa y **cómo encajan las traducciones** (CMS + sitio público).

---

## `capsulo.config.ts`: qué es y por qué importa

Es el **fichero central de configuración** del proyecto Capsulo en este repo: valores por defecto del CMS, multi‑idioma, identidad de la app y a menudo **lectura de variables de entorno públicas** (`import.meta.env.PUBLIC_*`).

### Bloques principales

| Sección | Propósito |
|---------|-----------|
| **`github`** | `owner` y `repo` para OAuth/datos (suelen venir de `PUBLIC_GITHUB_REPO_*`). |
| **`app`** | Nombre visible del CMS, versión, `authWorkerUrl` (worker de login). |
| **`ui`** | Regex para filtrar páginas en el árbol del admin, ancho del editor, **debounce de autosave** (`autoSaveDebounceMs`), período para no mostrar “Saving…” al cargar (`autoSaveBlockDurationMs`). |
| **`i18n`** | `defaultLocale`, lista **`locales`**, `fallbackLocale` opcional. Alimenta traducciones y rutas Astro. |
| **`storage`** | Opcional (p. ej. worker de subidas `uploadWorkerUrl`). |
| **`cache`** | Nombre y versión de **IndexedDB** (`dbName`, `dbVersion`), caducidad de caché. |

Si cambias **`cache.dbVersion`**, los clientes pueden disparar upgrade del esquema de IndexedDB. Si cambias **`ui.autoSaveDebounceMs`**, afectas directamente a `CMSManager` y afines.

### Dónde se consume

- **`astro.config.mjs`** importa este fichero para **`i18n.defaultLocale`** y **`i18n.locales`** (rutas prefijadas por idioma, integración con `autoI18nRoutes`).
- **`src/lib/i18n-utils.ts`** expone **`LOCALES`**, **`DEFAULT_LOCALE`** e **`isValidLocale`** leyendo `capsuloConfig.i18n`.
- **Admin React:** `CMSManager`, sidebar, variables globales, validación de borradores, preferencias, GitHub API, almacenamiento IDB, etc. importan **`@/capsulo.config`**.
- **Traducciones en el form builder:** `TranslationProvider` usa **`getI18nConfig`** / **`isTranslationEnabled`** con la misma config tipada vía `CapsuloConfig` en `src/lib/define-config.ts` (tipos de referencia; el objeto real sigue siendo `capsulo.config.ts`).

En la práctica: **tocar `capsulo.config.ts` puede cambiar rutas del sitio, idiomas disponibles, comportamiento del guardado y el árbol de páginas del admin**. Conviene versionarlo y documentar cambios en equipo.

---

## Sistema de traducciones (visión general)

Hay **dos capas** que conviene no mezclar:

1. **Rutas y locale activo en el sitio público** (Astro + pathname): qué URL sirve (`/es/...`) y qué locale usa `getPageCMS` / `cms-loader`.
2. **Modo traducción en el CMS** (React): editar strings por idioma para campos marcados como traducibles en el schema (`.translatable()`).

### Habilitación de “modo traducción” en el admin

En **`src/lib/form-builder/core/translation-config.ts`**:

- Se valida **`capsulo.config.ts` → `i18n`** (códigos tipo ISO 639‑1, `defaultLocale` dentro de `locales`, sin duplicados, etc.).
- **`isTranslationEnabled`**: traducciones activas solo si hay **`locales.length > 1`**. Con un solo idioma, el contexto de traducción expone API vacía (sin sidebar real).

### Schema y datos persistidos

- Los builders pueden marcar campos con **`.translatable()`** (`TranslatableField` en `translation.types.ts`).
- En **`PageData`**, un campo traducible suele guardarse con **`translatable: true`** y **`value`** como **objeto por locale**: `{ en: "...", es: "...", ... }` (además de variantes legacy que el loader intenta reconocer).

### Sitio público: lectura por locale

**`src/lib/cms-loader.ts`** (`extractFieldValue` + `getAllComponentsData`):

- Si el campo es traducible y `value` es un mapa de locales, se elige el valor para **`targetLocale`** con **fusión / fallback** respecto al locale por defecto (`deepMergeWithFallback` donde aplica).
- **`getPageCMS`** (`cms-auto.ts`) obtiene el locale desde la URL / params de Astro y pasa por **`loadPageData`** + **`getAllComponentsData`**.

**`src/lib/i18n-utils.ts`** alinea **`DEFAULT_LOCALE`** y **`LOCALES`** con **`capsulo.config.ts`** para regex de pathname, comprobaciones y helpers como **`getLocaleFromPathname`**.

### CMS (React): estado de UI y borradores

- **`TranslationProvider`** (`TranslationContext.tsx`): modo traducción activo/inactivo, campo enfocado, lista de locales desde **`getI18nConfig(capsuloConfig)`**, sidebar.
- **`TranslationDataProvider`** + **`translation-store`**: estado de trabajo **`translationData`** (locale → `componentId` → campo → valor) y sincronización con el formulario principal; si editas el **locale por defecto**, también actualiza la “forma base” del campo.
- **`CMSManager`**: tras debounce, **fusiona** `debouncedTranslationData` en la estructura persistida de cada componente (objetos por locale en `value`), junto con el autosave a IndexedDB / flujo de publicación.

### UI dedicada

- Pestaña **Translations** (`TranslationsTab.tsx`): para el campo activo en modo traducción, muestra entradas por **locale distinto del default** (y casos especiales como rich editor en diálogo).
- **`TranslationIcon`**: indicador visual de estado complete/missing por campo.

---

## Coherencia Astro ↔ config

**`astro.config.mjs`** copia `defaultLocale` y `locales` desde **`capsulo.config.ts`**. Las opciones **`routing.prefixDefaultLocale`** y **`redirectToDefaultLocale`** están fijas en el config de Astro de este repo (locale por defecto sin prefijo en URL según esa configuración).

Si **`capsulo.config.ts`** y **`astro.config`** divergieran en locales, tendrías rutas que no coinciden con lo que el CMS y `i18n-utils` consideran válidos. La fuente de verdad pretendida es **`capsulo.config.ts`** leída por Astro al construir la config.

---

## Limitaciones / matices (breve)

- **Un solo locale:** no hay “modo traducción” útil en UI (`isTranslationEnabled` false).
- **`getAllComponentsData`** en el sitio público sigue el modelo **una entrada por `schema.key`** (no por instancia); las traducciones no arreglan ese tema por sí solas (véase `docs/capsule-auto-registration.md`).
- La forma exacta del JSON (objeto por locale vs anidados en repeaters) tiene ramas extra en **`extractFieldValue`**; schemas complejos pueden necesitar revisión al migrar.

---

## Referencias rápidas

| Tema | Archivo |
|------|---------|
| Config central | `capsulo.config.ts` |
| Tipos config | `src/lib/define-config.ts` |
| Validación i18n / enable | `src/lib/form-builder/core/translation-config.ts` |
| Locales para URLs y helpers | `src/lib/i18n-utils.ts` |
| Provider modo traducción | `src/lib/form-builder/context/TranslationContext.tsx` |
| Datos de traducción en edición | `src/lib/form-builder/context/TranslationDataContext.tsx`, `translation-store` |
| Lectura en público | `src/lib/cms-loader.ts`, `src/lib/cms-auto.ts` |
| Astro i18n | `astro.config.mjs`, `src/lib/astro-i18n-auto-routes.ts` |
| UI sidebar traducciones | `src/components/admin/sidebar/TranslationsTab.tsx` |

---

*Para el modelo de datos del form builder y campos traducibles en schemas, complementar con `docs/schema-system.md`.*
