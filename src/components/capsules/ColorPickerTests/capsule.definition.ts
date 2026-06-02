import { defineCapsule } from "$lib/capsules/core/define-capsule";
import ColorPickerTests from "./ColorPickerTests.svelte";
import { colorPickerTestsSchema } from "./colorpicker-tests.schema";

const capsule = defineCapsule({
	schema: colorPickerTestsSchema,
	component: ColorPickerTests,
	meta: {
		displayName: "ColorPicker Tests",
		description: "Comprehensive color picker field configurations for manual QA.",
	},
});

export default capsule;