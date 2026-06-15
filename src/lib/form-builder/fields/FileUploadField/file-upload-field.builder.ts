import type { ResponsiveColumns } from "../../core/types";
import type {
	FileUploadFieldBuilder,
	FileUploadFieldDefinition,
} from "./file-upload-field.types";

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml";

class FileUploadFieldBuilderImpl implements FileUploadFieldBuilder {
	private field: FileUploadFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "file-upload",
			name,
			multiple: false,
		};
	}

	label(value: string): this {
		this.field.label = value;
		return this;
	}

	description(value: string): this {
		this.field.description = value;
		return this;
	}

	required(value = true): this {
		this.field.required = value;
		return this;
	}

	defaultValue(value: string[]): this {
		this.field.defaultValue = value;
		return this;
	}

	accept(value: string): this {
		this.field.accept = value;
		return this;
	}

	maxSize(bytes: number): this {
		this.field.maxSize = bytes;
		return this;
	}

	maxFiles(count: number): this {
		this.field.maxFiles = count;
		return this;
	}

	multiple(value = true): this {
		this.field.multiple = value;
		return this;
	}

	images(): this {
		this.field.accept = IMAGE_ACCEPT;
		return this;
	}

	colSpan(value: number | "full" | ResponsiveColumns): this {
		this.field.colSpan = value;
		return this;
	}

	build(): FileUploadFieldDefinition {
		return { ...this.field };
	}
}

export const FileUpload = (name: string): FileUploadFieldBuilder =>
	new FileUploadFieldBuilderImpl(name);
