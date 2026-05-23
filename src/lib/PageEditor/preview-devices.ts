export type PreviewDeviceId =
  | "responsive"
  | "iphone-se"
  | "iphone-xr"
  | "iphone-12-pro"
  | "iphone-14-pro-max"
  | "pixel-7"
  | "galaxy-s8-plus"
  | "galaxy-s20-ultra"
  | "ipad-mini"
  | "ipad-air"
  | "ipad-pro"
  | "surface-pro-7"
  | "surface-duo"
  | "galaxy-z-fold-5"
  | "asus-zenbook-fold"
  | "galaxy-a51-71"
  | "nest-hub"
  | "nest-hub-max";

export type PreviewDeviceCategory = "phone" | "tablet" | "desktop";

export type PreviewDevicePreset = {
  id: PreviewDeviceId;
  label: string;
  widthPx: number;
  heightPx: number;
  category: PreviewDeviceCategory;
};

export const DEFAULT_PREVIEW_DEVICE: PreviewDeviceId = "responsive";

export const PREVIEW_DIMENSION_MIN = 200;
export const PREVIEW_DIMENSION_MAX = 4000;

/** Chrome DevTools device-mode presets (vertical viewport). */
export const PREVIEW_DEVICE_PRESETS: PreviewDevicePreset[] = [
  { id: "responsive", label: "Responsive", widthPx: 0, heightPx: 0, category: "desktop" },
  { id: "iphone-se", label: "iPhone SE", widthPx: 375, heightPx: 667, category: "phone" },
  { id: "iphone-xr", label: "iPhone XR", widthPx: 414, heightPx: 896, category: "phone" },
  { id: "iphone-12-pro", label: "iPhone 12 Pro", widthPx: 390, heightPx: 844, category: "phone" },
  { id: "iphone-14-pro-max", label: "iPhone 14 Pro Max", widthPx: 430, heightPx: 932, category: "phone" },
  { id: "pixel-7", label: "Pixel 7", widthPx: 412, heightPx: 915, category: "phone" },
  { id: "galaxy-s8-plus", label: "Samsung Galaxy S8+", widthPx: 360, heightPx: 740, category: "phone" },
  { id: "galaxy-s20-ultra", label: "Samsung Galaxy S20 Ultra", widthPx: 412, heightPx: 915, category: "phone" },
  { id: "surface-duo", label: "Surface Duo", widthPx: 540, heightPx: 720, category: "phone" },
  { id: "galaxy-z-fold-5", label: "Galaxy Z Fold 5", widthPx: 344, heightPx: 882, category: "phone" },
  { id: "galaxy-a51-71", label: "Samsung Galaxy A51/71", widthPx: 412, heightPx: 914, category: "phone" },
  { id: "ipad-mini", label: "iPad Mini", widthPx: 768, heightPx: 1024, category: "tablet" },
  { id: "ipad-air", label: "iPad Air", widthPx: 820, heightPx: 1180, category: "tablet" },
  { id: "ipad-pro", label: "iPad Pro", widthPx: 1024, heightPx: 1366, category: "tablet" },
  { id: "surface-pro-7", label: "Surface Pro 7", widthPx: 912, heightPx: 1368, category: "tablet" },
  { id: "asus-zenbook-fold", label: "Asus Zenbook Fold", widthPx: 853, heightPx: 1280, category: "tablet" },
  { id: "nest-hub", label: "Nest Hub", widthPx: 1024, heightPx: 600, category: "desktop" },
  { id: "nest-hub-max", label: "Nest Hub Max", widthPx: 1280, heightPx: 800, category: "desktop" },
];

const PREVIEW_DEVICE_BY_ID = new Map(
  PREVIEW_DEVICE_PRESETS.map((preset) => [preset.id, preset]),
);

export const PREVIEW_DEVICE_GROUPS: {
  category: PreviewDeviceCategory;
  label: string;
}[] = [
  { category: "phone", label: "Phone" },
  { category: "tablet", label: "Tablet" },
  { category: "desktop", label: "Desktop" },
];

export function getPreviewDevicesByCategory(
  category: PreviewDeviceCategory,
): PreviewDevicePreset[] {
  return PREVIEW_DEVICE_PRESETS.filter(
    (preset) => preset.id !== "responsive" && preset.category === category,
  );
}

export function clampPreviewDimension(value: number): number {
  if (!Number.isFinite(value)) return PREVIEW_DIMENSION_MIN;
  return Math.round(
    Math.max(PREVIEW_DIMENSION_MIN, Math.min(PREVIEW_DIMENSION_MAX, value)),
  );
}

export function getPreviewDeviceLabel(id: PreviewDeviceId): string {
  return PREVIEW_DEVICE_BY_ID.get(id)?.label ?? "Responsive";
}

export function getPreviewDeviceDimensions(
  id: PreviewDeviceId,
): { widthPx: number; heightPx: number } | null {
  const preset = PREVIEW_DEVICE_BY_ID.get(id);
  if (!preset || preset.id === "responsive" || preset.widthPx <= 0) return null;
  return { widthPx: preset.widthPx, heightPx: preset.heightPx };
}

export function resolvePreviewDevice(
  widthPx: number,
  heightPx: number,
  current: PreviewDeviceId,
): PreviewDeviceId {
  if (current === "responsive") return "responsive";
  const dims = getPreviewDeviceDimensions(current);
  if (dims && dims.widthPx === widthPx && dims.heightPx === heightPx) {
    return current;
  }
  return "responsive";
}
