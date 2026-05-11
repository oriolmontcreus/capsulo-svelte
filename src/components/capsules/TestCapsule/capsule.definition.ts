import { defineCapsule } from "$lib/capsules/core/define-capsule";
import TestCapsule from "./TestCapsule.astro";
import { testCapsuleSchema } from "./test-capsule.schema";

const capsule = defineCapsule({
	schema: testCapsuleSchema,
	component: TestCapsule,
	meta: {
		displayName: "Test Capsule",
		description: "Prototype capsule used to validate automatic detection."
	}
});

export default capsule;
