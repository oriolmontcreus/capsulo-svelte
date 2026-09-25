/** Same value escaping as Fumadocs' Tabs. */
export function escapeTabValue(value: string): string {
  return value.toLowerCase().replace(/\s/, '-');
}
