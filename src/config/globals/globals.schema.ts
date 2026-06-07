import { createSchema } from "$lib/form-builder/core/create-schema";
import type { FieldDefinition } from "$lib/form-builder/core/types";
import { Text } from "$lib/form-builder/fields/TextField/text-field.builder";
import { Textarea } from "$lib/form-builder/fields/TextareaField/textarea-field.builder";

export const globalsSchema = createSchema<FieldDefinition>({
	name: "Global Variables",
	key: "globals",
	description: "Global site-wide settings, social media links, and contact information",
	fields: [
		Text("siteName")
			.label("Site Name")
			.description("The name of your website")
			.required()
			.translatable()
			.placeholder("My Awesome Site")
			.defaultValue("My Awesome Site"),

		Text("siteEmail")
			.label("Contact Email")
			.description("Primary contact email address")
			.placeholder("contact@example.com")
			.defaultValue("contact@example.com"),

		Textarea("siteDescription")
			.label("Site Description")
			.description("A brief description of your website")
			.rows(3)
			.translatable()
			.placeholder("Enter a description of your site")
			.defaultValue("A modern website built with Capsulo CMS"),

		Text("facebookUrl")
			.label("Facebook URL")
			.description("Your Facebook page or profile URL")
			.placeholder("https://facebook.com/yourpage")
			.defaultValue(""),

		Text("twitterUrl")
			.label("Twitter/X URL")
			.description("Your Twitter/X profile URL")
			.placeholder("https://twitter.com/yourhandle")
			.defaultValue(""),

		Text("instagramUrl")
			.label("Instagram URL")
			.description("Your Instagram profile URL")
			.placeholder("https://instagram.com/yourhandle")
			.defaultValue(""),

		Text("linkedinUrl")
			.label("LinkedIn URL")
			.description("Your LinkedIn profile or company page URL")
			.placeholder("https://linkedin.com/company/yourcompany")
			.defaultValue(""),

		Text("youtubeUrl")
			.label("YouTube URL")
			.description("Your YouTube channel URL")
			.placeholder("https://youtube.com/@yourchannel")
			.defaultValue(""),

		Text("phone")
			.label("Phone Number")
			.description("Primary contact phone number")
			.placeholder("+1 (555) 123-4567")
			.defaultValue(""),

		Text("email")
			.label("Email Address")
			.description("Primary contact email")
			.placeholder("contact@example.com")
			.defaultValue("contact@example.com"),

		Textarea("address")
			.label("Physical Address")
			.description("Street address or mailing address")
			.rows(3)
			.translatable()
			.placeholder("123 Main St, City, State 12345")
			.defaultValue(""),

		Text("city")
			.label("City")
			.description("City name")
			.translatable()
			.placeholder("New York")
			.defaultValue(""),

		Text("country")
			.label("Country")
			.description("Country name")
			.translatable()
			.placeholder("United States")
			.defaultValue("")
	]
});
