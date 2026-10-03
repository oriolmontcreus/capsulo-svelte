import { defineCapsule } from "$lib/capsules/core/define-capsule";
import ValidationTests from "./ValidationTests.svelte";
import { validationTestsSchema } from "./validation-tests.schema";

const capsule = defineCapsule({
	schema: validationTestsSchema,
	component: ValidationTests,
	meta: {
		displayName: "Validation Tests",
		description: "Conditional fields, field options and required validation for manual QA."
	}
});

export default capsule;
