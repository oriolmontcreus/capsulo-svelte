/**
 * Tools the model can call. They run in the browser (see tool-runner.ts) because the
 * unpublished drafts only exist in the editor's IndexedDB. Keep descriptions short:
 * they are sent with every request and count against the free daily allowance.
 */

export const AI_TOOL_NAMES = {
	getPage: "get_page",
	getGlobals: "get_globals",
	searchContent: "search_content",
	updateContent: "update_content"
} as const;

export const AI_TOOLS = [
	{
		type: "function",
		function: {
			name: AI_TOOL_NAMES.getPage,
			description:
				"Read the current content of one page (including unpublished draft edits): every capsule instance with its field values per locale.",
			parameters: {
				type: "object",
				properties: {
					pageId: { type: "string", description: 'Page id from the site overview, e.g. "index" or "blog/post".' }
				},
				required: ["pageId"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: AI_TOOL_NAMES.getGlobals,
			description: "Read the global variables (site-wide values used through {{key}} tokens) per locale.",
			parameters: { type: "object", properties: {} }
		}
	},
	{
		type: "function",
		function: {
			name: AI_TOOL_NAMES.searchContent,
			description:
				"Find text across all pages and global variables (case-insensitive). Returns where it appears with a short snippet.",
			parameters: {
				type: "object",
				properties: { query: { type: "string", description: "Text to look for." } },
				required: ["query"]
			}
		}
	},
	{
		type: "function",
		function: {
			name: AI_TOOL_NAMES.updateContent,
			description:
				"Change field values on one page or in the global variables. Changes are saved as a draft the editor reviews and publishes; nothing goes live. Read the content first. Send only the fields that change.",
			parameters: {
				type: "object",
				properties: {
					target: {
						type: "string",
						description: 'A page id from the site overview, or "globals" for the global variables.'
					},
					changes: {
						type: "array",
						items: {
							type: "object",
							properties: {
								instanceId: {
									type: "string",
									description: 'Capsule instance id, e.g. "hero-01". Omit for globals.'
								},
								field: { type: "string", description: "Field name from the capsule schema." },
								locale: {
									type: "string",
									description:
										"Locale to write for translatable fields. Omit for non-translatable fields (they have one value for every locale)."
								},
								value: {
									description:
										"New value: a string for text, textarea, colorpicker and single select; HTML for rich-editor; a boolean for toggle; an array of option values for multiple select."
								}
							},
							required: ["field", "value"]
						}
					}
				},
				required: ["target", "changes"]
			}
		}
	}
] as const;
