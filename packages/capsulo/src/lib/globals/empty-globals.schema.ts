import { createSchema } from "../form-builder/core/create-schema";

/** Used when the site has no `src/config/globals/globals.schema.ts`. */
export const globalsSchema = createSchema({
	name: "Global Variables",
	key: "globals",
	fields: []
});
