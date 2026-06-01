export interface ParsedSchemaField {
	name: string;
	type: string;
	required: boolean;
	hasDefaultValue: boolean;
	multiple: boolean;
	builder: string;
}

export interface ParsedSchemaDefinition {
	variableName: string;
	displayName: string;
	key?: string;
	fields: ParsedSchemaField[];
}

export interface ParsedSchemaFile {
	filePath: string;
	schemas: ParsedSchemaDefinition[];
}

export interface GeneratedDtsFile {
	path: string;
	content: string;
}

export type FileWriteResult = "written" | "skipped";

export interface ProcessSchemaSuccess {
	status: "success";
	filePath: string;
	outputPath: string;
	result: FileWriteResult;
	schemaCount: number;
	fieldCount: number;
}

export interface ProcessSchemaFailure {
	status: "error";
	filePath: string;
	error: Error;
}

export type ProcessSchemaResult = ProcessSchemaSuccess | ProcessSchemaFailure;

export interface BatchProcessSummary {
	processed: number;
	written: number;
	skipped: number;
	failed: number;
	results: ProcessSchemaResult[];
}
