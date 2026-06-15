import type {
	FieldBuilder,
	FileUploadFieldDefinition,
	ResponsiveColumns,
} from "../../core/types";

export type { FileUploadFieldDefinition };

export interface FileUploadFieldBuilder
	extends FieldBuilder<FileUploadFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	required(value?: boolean): this;
	defaultValue(value: string[]): this;
	accept(value: string): this;
	maxSize(bytes: number): this;
	maxFiles(count: number): this;
	multiple(value?: boolean): this;
	images(): this;
	colSpan(value: number | "full" | ResponsiveColumns): this;
}
