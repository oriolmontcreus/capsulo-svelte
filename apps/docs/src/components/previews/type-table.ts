export interface TypeNode {
  /** Shown when the row is open. May contain inline HTML (`<code>`, links). */
  description?: string;
  /** Short type signature shown in the row. */
  type: string;
  /** Full type signature, shown when the row is open. */
  typeDescription?: string;
  default?: string;
  /** Arguments of a builder method that takes more than one. */
  parameters?: { name: string; description: string }[];
  required?: boolean;
  deprecated?: boolean;
}

// The old site's TypeTable colored the docs' own types green.
const CUSTOM_TYPES = ['SelectOptionGroup', 'SelectOption', 'ResponsiveColumns', 'InternalLinksConfig'];
const CUSTOM_TYPE_PATTERN = new RegExp(`\\b(${CUSTOM_TYPES.join('|')})\\b`, 'g');

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const green = (text: string) => `<span class="text-green-600">${text}</span>`;

/** Type signature as HTML, with custom types highlighted as on the old site. */
export function renderType(type: string): string {
  // Function signatures: highlight only the custom type names.
  if (type.includes('=>') || (type.includes('(') && type.includes(')'))) {
    return escapeHtml(type).replace(CUSTOM_TYPE_PATTERN, (name) => green(name));
  }
  // Unions and plain types: a part that mentions a custom type is highlighted whole.
  return type
    .split('|')
    .map((part) => part.trim())
    .map((part) => {
      CUSTOM_TYPE_PATTERN.lastIndex = 0;
      return CUSTOM_TYPE_PATTERN.test(part) ? green(escapeHtml(part)) : escapeHtml(part);
    })
    .join(' | ');
}
