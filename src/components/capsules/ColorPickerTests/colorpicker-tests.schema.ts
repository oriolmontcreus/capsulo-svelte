import { createSchema } from "$lib/form-builder/core/create-schema";
import type { FieldDefinition } from "$lib/form-builder/core/types";
import { ColorPicker } from "$lib/form-builder/fields/ColorPickerField/color-picker-field.builder";
import { Text } from "$lib/form-builder/fields/TextField/text-field.builder";

export const colorPickerTestsSchema = createSchema<FieldDefinition>({
	name: "ColorPicker Tests",
	key: "colorpicker-tests",
	description:
		"Comprehensive test capsule for all ColorPicker field configurations.",
	fields: [
		// ─── 1. Basic ColorPicker (minimal config) ───
		ColorPicker("brandColor")
			.label("Brand Color")
			.description("Basic color picker with no presets, no alpha"),

		// ─── 2. ColorPicker with default value ───
		ColorPicker("primaryColor")
			.label("Primary Color")
			.description("Color picker with a default hex value pre-selected")
			.defaultValue("#3b82f6"),

		// ─── 3. Required ColorPicker ───
		ColorPicker("requiredColor")
			.label("Required Color")
			.description("Required color picker — must select a value")
			.required(),

		// ─── 4. ColorPicker with alpha/opacity ───
		ColorPicker("overlayColor")
			.label("Overlay Color")
			.description("Color picker with alpha channel enabled for transparency")
			.showAlpha()
			.defaultValue("#00000080"),

		// ─── 5. ColorPicker with preset colors ───
		ColorPicker("statusColor")
			.label("Status Color")
			.description("Color picker with preset color swatches")
			.presetColors([
				"#ef4444",
				"#f97316",
				"#eab308",
				"#22c55e",
				"#3b82f6",
				"#8b5cf6",
				"#ec4899",
				"#000000",
				"#ffffff",
			]),

		// ─── 6. ColorPicker with alpha + presets ───
		ColorPicker("accentColor")
			.label("Accent Color")
			.description("Color picker with both alpha slider and preset swatches")
			.showAlpha()
			.defaultValue("#6366f1cc")
			.presetColors([
				"#6366f1",
				"#8b5cf6",
				"#a855f7",
				"#d946ef",
				"#ec4899",
				"#f43f5e",
				"#ef4444",
				"#f97316",
				"#eab308",
				"#22c55e",
			]),

		// ─── 7. Presets only mode (no full picker) ───
		ColorPicker("themeColor")
			.label("Theme Color")
			.description("Only presets mode — no full color picker, just swatches")
			.presetColors(
				["#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"],
				true,
			),

		// ─── 8. Translatable ColorPicker ───
		ColorPicker("titleColor")
			.label("Title Color")
			.description("Translatable color — different color per locale")
			.translatable()
			.defaultValue("#111827"),

		// ─── 9. Required + presets ───
		ColorPicker("alertColor")
			.label("Alert Color")
			.description("Required color picker restricted to preset alert colors")
			.required()
			.presetColors([
				"#dc2626",
				"#f59e0b",
				"#16a34a",
				"#2563eb",
				"#9333ea",
			]),

		// ─── 10. Required + alpha ───
		ColorPicker("bannerOverlay")
			.label("Banner Overlay")
			.description("Required color picker with alpha for banner overlays")
			.required()
			.showAlpha()
			.defaultValue("#00000099"),

		// ─── 11. All options combined ───
		ColorPicker("heroTint")
			.label("Hero Section Tint")
			.description("All options: required, alpha, presets, translatable, default value")
			.required()
			.showAlpha()
			.translatable()
			.defaultValue("#3b82f680")
			.presetColors([
				"#ef4444",
				"#f97316",
				"#f59e0b",
				"#22c55e",
				"#14b8a6",
				"#3b82f6",
				"#8b5cf6",
				"#ec4899",
				"#ffffff",
				"#000000",
			]),

		// ─── 12. Multiple presets-only color pickers (small palettes) ───
		ColorPicker("neutralTone")
			.label("Neutral Tone")
			.description("Small presets-only palette for neutral tones")
			.presetColors(["#f5f5f5", "#e5e5e5", "#a3a3a3", "#525252", "#171717"], true),

		// ─── 13. Warm palette presets-only ───
		ColorPicker("warmAccent")
			.label("Warm Accent")
			.description("Presets-only with warm color palette")
			.presetColors(
				[
					"#fef3c7",
					"#fde68a",
					"#f59e0b",
					"#d97706",
					"#92400e",
					"#fecaca",
					"#f87171",
					"#dc2626",
				],
				true,
			),

		// ─── 14. Cool palette presets-only ───
		ColorPicker("coolAccent")
			.label("Cool Accent")
			.description("Presets-only with cool color palette")
			.presetColors(
				[
					"#dbeafe",
					"#93c5fd",
					"#3b82f6",
					"#1d4ed8",
					"#1e3a5f",
					"#cffafe",
					"#22d3ee",
					"#0891b2",
				],
				true,
			),

		// ─── 15. Default value without presets ───
		ColorPicker("linkColor")
			.label("Link Color")
			.description("Default value with no presets — user picks freely")
			.defaultValue("#2563eb"),

		// ─── Separator: Text field to test mixed forms ───
		Text("notes")
			.label("Additional Notes")
			.placeholder("Any notes about the colors above...")
			.description("A text field alongside color pickers to verify form integration"),
	],
});