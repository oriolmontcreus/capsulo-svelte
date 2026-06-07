export const GLOBAL_VARIABLES_CONTEXT_KEY = Symbol("global-variables-context");

export type GlobalVariablesContext = {
	locale: string;
	knownKeys: ReadonlySet<string>;
	getPreview: (key: string) => string;
};
