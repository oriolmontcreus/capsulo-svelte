import { defineCapsule } from "$lib/capsules/core/define-capsule";
import FileUploadTests from "./FileUploadTests.svelte";
import { fileUploadTestsSchema } from "./file-upload-tests.schema";

const capsule = defineCapsule({
	schema: fileUploadTestsSchema,
	component: FileUploadTests,
	meta: {
		displayName: "File Upload Tests",
		description: "FileUpload field configurations for manual QA."
	}
});

export default capsule;
