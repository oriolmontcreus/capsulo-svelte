const englishLanguageNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "language" })
    : null;

const nativeLanguageNamesCache: Record<string, Intl.DisplayNames | null | undefined> = {};

function capitalizeLabel(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function getNativeLanguageNames(localeCode: string): Intl.DisplayNames | null {
  const cached = nativeLanguageNamesCache[localeCode];
  if (cached !== undefined) return cached;

  let formatter: Intl.DisplayNames | null = null;
  if (typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function") {
    try {
      formatter = new Intl.DisplayNames([localeCode], { type: "language" });
    } catch {
      formatter = null;
    }
  }

  nativeLanguageNamesCache[localeCode] = formatter;
  return formatter;
}

export function formatLocaleLabel(localeCode: string): string {
  const normalizedLocaleCode = localeCode?.trim();
  if (!normalizedLocaleCode) return localeCode;

  const languageCode = normalizedLocaleCode.split("-")[0];
  if (!languageCode) return localeCode;

  const englishName = englishLanguageNames?.of(languageCode);
  const nativeName =
    getNativeLanguageNames(normalizedLocaleCode)?.of(languageCode) ??
    getNativeLanguageNames(languageCode)?.of(languageCode);

  const formattedEnglishName = englishName ? capitalizeLabel(englishName) : null;
  const formattedNativeName = nativeName ? capitalizeLabel(nativeName) : null;

  if (!formattedEnglishName && !formattedNativeName) return localeCode;
  if (!formattedNativeName) return formattedEnglishName ?? localeCode;
  if (!formattedEnglishName) return formattedNativeName;
  if (formattedNativeName === formattedEnglishName) return formattedNativeName;

  return `${formattedNativeName} (${formattedEnglishName})`;
}
