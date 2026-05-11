import fs from "node:fs";
import ts from "typescript";
import type { ParsedSchemaDefinition, ParsedSchemaField, ParsedSchemaFile } from "./types";

const BUILDER_TS_TYPE_MAP: Record<string, string> = {
	TextField: "string"
};

function getStringLiteralValue(node: ts.Expression | undefined): string | undefined {
	if (!node) return undefined;

	if (ts.isStringLiteralLike(node)) return node.text;
	if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;

	return undefined;
}

function normalizeInterfaceStem(input: string): string {
	const cleaned = input.replace(/[^A-Za-z0-9]+/g, " ").trim();
	if (!cleaned) return "Schema";

	return cleaned
		.split(/\s+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

function parseFieldFromObjectLiteral(node: ts.ObjectLiteralExpression): ParsedSchemaField | undefined {
	const values: Partial<ParsedSchemaField> = {
		builder: "ObjectField",
		type: "any",
		required: false,
		hasDefaultValue: false
	};

	for (const property of node.properties) {
		if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
			continue;
		}

		const key = property.name.text;
		if (key === "name") {
			values.name = getStringLiteralValue(property.initializer);
		}

		if (key === "type") {
			values.builder = getStringLiteralValue(property.initializer) ?? "ObjectField";
		}

		if (key === "required" && property.initializer.kind === ts.SyntaxKind.TrueKeyword) {
			values.required = true;
		}

		if (key === "defaultValue") {
			values.hasDefaultValue = true;
		}
	}
	if (!values.name) return undefined;

	return values as ParsedSchemaField;
}

function parseFieldFromBuilderChain(node: ts.Expression): ParsedSchemaField | undefined {
	if (ts.isObjectLiteralExpression(node)) {
		return parseFieldFromObjectLiteral(node);
	}

	const methods: Array<{ name: string; args: readonly ts.Expression[] }> = [];
	let cursor: ts.Expression = node;

	while (ts.isCallExpression(cursor) && ts.isPropertyAccessExpression(cursor.expression)) {
		methods.push({ name: cursor.expression.name.text, args: cursor.arguments });
		cursor = cursor.expression.expression;
	}

	if (!ts.isCallExpression(cursor) || !ts.isIdentifier(cursor.expression)) {
		return undefined;
	}

	const builder = cursor.expression.text;
	const fieldName = getStringLiteralValue(cursor.arguments[0]);
	if (!fieldName) return undefined;

	let required = false;
	let hasDefaultValue = false;

	for (const method of methods) {
		if (method.name === "defaultValue") {
			hasDefaultValue = true;
		}

		if (method.name === "required") {
			const firstArg = method.args[0];
			required = firstArg ? firstArg.kind !== ts.SyntaxKind.FalseKeyword : true;
		}
	}

	return {
		name: fieldName,
		builder,
		required,
		hasDefaultValue,
		type: BUILDER_TS_TYPE_MAP[builder] ?? "any"
	};
}

function parseSchemaFromDeclaration(
	declaration: ts.VariableDeclaration
): ParsedSchemaDefinition | undefined {
	if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
		return undefined;
	}

	if (!ts.isIdentifier(declaration.name) || !ts.isIdentifier(declaration.initializer.expression)) {
		return undefined;
	}

	if (declaration.initializer.expression.text !== "createSchema") {
		return undefined;
	}

	const input = declaration.initializer.arguments[0];
	if (!input || !ts.isObjectLiteralExpression(input)) {
		return undefined;
	}

	let displayName: string | undefined;
	let key: string | undefined;
	let fieldsArray: ts.ArrayLiteralExpression | undefined;

	for (const property of input.properties) {
		if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
			continue;
		}

		switch (property.name.text) {
			case "name":
				displayName = getStringLiteralValue(property.initializer);
				break;
			case "key":
				key = getStringLiteralValue(property.initializer);
				break;
			case "fields":
				if (ts.isArrayLiteralExpression(property.initializer)) {
					fieldsArray = property.initializer;
				}
				break;
			default:
				break;
		}
	}

	if (!fieldsArray) {
		return undefined;
	}

	const parsedFields = fieldsArray.elements
		.map((element) => parseFieldFromBuilderChain(element))
		.filter((field): field is ParsedSchemaField => Boolean(field));

	return {
		variableName: declaration.name.text,
		displayName: displayName ?? normalizeInterfaceStem(declaration.name.text),
		key,
		fields: parsedFields
	};
}

export function getInterfaceName(schema: ParsedSchemaDefinition): string {
	return `${normalizeInterfaceStem(schema.displayName)}Data`;
}

export function parseSchemaFile(filePath: string): ParsedSchemaFile {
	const sourceText = fs.readFileSync(filePath, "utf8");
	const sourceFile = ts.createSourceFile(
		filePath,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS
	);

	const schemas: ParsedSchemaDefinition[] = [];

	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) {
			continue;
		}

		for (const declaration of statement.declarationList.declarations) {
			const parsedSchema = parseSchemaFromDeclaration(declaration);
			if (parsedSchema) {
				schemas.push(parsedSchema);
			}
		}
	}

	return { filePath, schemas };
}
