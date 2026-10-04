export type VariableItem = {
	key: string;
	value: string;
	scope: "Global";
};

export type AutocompleteTrigger = {
	query: string;
	replaceFrom: number;
	replaceTo: number;
};
