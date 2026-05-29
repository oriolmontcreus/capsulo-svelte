import { defineCapsule } from "$lib/capsules/core/define-capsule";
import SelectTests from "./SelectTests.svelte";
import { selectTestsSchema } from "./select-tests.schema";

const capsule = defineCapsule({
	schema: selectTestsSchema,
	component: SelectTests,
	meta: {
		displayName: "Select Tests",
		description: "Comprehensive select field configurations for manual QA."
	}
});

export default capsule;
