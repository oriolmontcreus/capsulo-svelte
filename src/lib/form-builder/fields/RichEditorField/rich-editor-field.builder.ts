import type { FieldCondition } from "../../core/types";
import type {
	RichEditorFieldBuilder,
	RichEditorFieldDefinition,
} from "./rich-editor-field.types";
import { assertNonNegativeInteger, assertRange } from "../../core/builder-asserts";

class RichEditorFieldBuilderImpl implements RichEditorFieldBuilder {
	private field: RichEditorFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "rich-editor",
			name,
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

	placeholder(value: string): this {
		this.field.placeholder = value;
		return this;
	}

	required(value: FieldCondition = true): this {
		this.field.required = value;
		return this;
	}

	hidden(value: FieldCondition = true): this {
		this.field.hidden = value;
		return this;
	}

	defaultValue(value: string): this {
		this.field.defaultValue = value;
		return this;
	}

	translatable(value = true): this {
		this.field.translatable = value;
		return this;
	}

	minLength(value: number): this {
		assertNonNegativeInteger(`RichEditor("${this.field.name}").minLength`, value);
		this.field.minLength = value;
		return this;
	}

	maxLength(value: number): this {
		assertNonNegativeInteger(`RichEditor("${this.field.name}").maxLength`, value);
		this.field.maxLength = value;
		return this;
	}

	build(): RichEditorFieldDefinition {
		const { name, minLength, maxLength } = this.field;
		assertRange(`RichEditor("${name}")`, "minLength", minLength, "maxLength", maxLength);
		return { ...this.field };
	}
}

export const RichEditor = (name: string): RichEditorFieldBuilder =>
	new RichEditorFieldBuilderImpl(name);

