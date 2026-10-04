import { globalsSchema } from "$/config/globals/globals.schema";

export function getGlobalsKnownKeys(): ReadonlySet<string> {
	return new Set(globalsSchema.fields.map((field) => field.name));
}
