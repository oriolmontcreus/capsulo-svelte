import { defineCapsule } from "$lib/capsules/core/define-capsule";
import RepeaterTests from "./RepeaterTests.svelte";
import { repeaterTestsSchema } from "./repeater-tests.schema";

const capsule = defineCapsule({
	schema: repeaterTestsSchema,
	component: RepeaterTests,
	meta: {
		displayName: "Repeater Tests",
		description: "Repeater field configurations for manual QA."
	}
});

export default capsule;
