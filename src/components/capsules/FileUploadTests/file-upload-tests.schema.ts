import { createSchema } from "$lib/form-builder/core/create-schema";
import type { FieldDefinition } from "$lib/form-builder/core/types";
import { FileUpload } from "$lib/form-builder/fields/FileUploadField/file-upload-field.builder";
import { Text } from "$lib/form-builder/fields/TextField/text-field.builder";

export const fileUploadTestsSchema = createSchema<FieldDefinition>({
  name: "File Upload Tests",
  key: "file-upload-tests",
  description:
    "Test capsule for the FileUpload field. Changes only apply on Save.",
  fields: [
    // ─── 1. Single image ───
    FileUpload("avatar")
      .label("Avatar (single image)")
      .description("Single image upload — a new pick replaces the previous one")
      .images()
      .maxSize(2 * 1024 * 1024),

    // ─── 2. Single image, required ───
    FileUpload("cover")
      .label("Cover (required)")
      .description("Required single image upload")
      .images()
      .required()
      .maxSize(5 * 1024 * 1024),

    // ─── 3. Multiple images with maxFiles ───
    FileUpload("gallery")
      .label("Gallery (multiple)")
      .description("Multiple image upload, up to 4 files")
      .images()
      .multiple()
      .maxFiles(4)
      .maxSize(5 * 1024 * 1024),

    // ─── 4. Multiple images, no explicit limit ───
    FileUpload("attachments")
      .label("Attachments (multiple, no maxFiles)")
      .description("Multiple uploads without a file-count limit")
      .images()
      .multiple(),

    // ─── Separator: Text field to verify mixed forms + Save ───
    Text("caption")
      .label("Caption")
      .placeholder("A caption to verify form integration...")
      .description("A text field alongside file uploads"),
  ],
});
