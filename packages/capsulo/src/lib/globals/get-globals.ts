import { globalsSchema } from "virtual:capsulo/globals-schema";

export function getGlobalsKnownKeys(): ReadonlySet<string> {
	return new Set(globalsSchema.fields.map((field) => field.name));
}
