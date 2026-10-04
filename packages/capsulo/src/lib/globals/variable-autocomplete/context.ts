import type { VariableItem } from "./types";

export const GLOBAL_VARIABLES_CONTEXT_KEY = Symbol("global-variables-context");

export type GlobalVariablesContext = {
	knownKeys: ReadonlySet<string>;
	getPreview: (key: string) => string;
	getVariableItems: () => VariableItem[];
};
