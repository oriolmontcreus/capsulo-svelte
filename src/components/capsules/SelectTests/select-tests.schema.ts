import { createSchema } from "$lib/form-builder/core/create-schema";
import type { FieldDefinition } from "$lib/form-builder/core/types";
import { Select } from "$lib/form-builder/fields/SelectField/select-field.builder";
import { Text } from "$lib/form-builder/fields/TextField/text-field.builder";

export const selectTestsSchema = createSchema<FieldDefinition>({
  name: "Select Tests",
  key: "select-tests",
  description:
    "Comprehensive test capsule for all Select field configurations.",
  fields: [
    // ─── 1. Basic Select (flat options) ───
    Select("country")
      .label("Country")
      .required()
      .placeholder("Select a country")
      .description("Basic select with flat options")
      .options([
        { label: "United States", value: "us" },
        { label: "United Kingdom", value: "uk" },
        { label: "Canada", value: "ca" },
        { label: "Australia", value: "au" },
        { label: "Germany", value: "de" },
        { label: "France", value: "fr" },
      ]),

    // ─── 1b. Multiselect (flat options) ───
    Select("tags")
      .label("Tags")
      .placeholder("Select one or more tags")
      .description("Basic multiselect with flat options")
      .multiple()
      .options([
        { label: "Design", value: "design" },
        { label: "Engineering", value: "engineering" },
        { label: "Marketing", value: "marketing" },
        { label: "Sales", value: "sales" },
        { label: "Support", value: "support" },
      ]),

    // ─── 1c. Multiselect with default values ───
    Select("regions")
      .label("Regions")
      .description("Multiselect with default values pre-selected")
      .multiple()
      .defaultValue(["us", "ca"])
      .options([
        { label: "United States", value: "us" },
        { label: "United Kingdom", value: "uk" },
        { label: "Canada", value: "ca" },
        { label: "Australia", value: "au" },
      ]),

    // ─── 1d. Multiselect searchable ───
    Select("skills")
      .label("Skills")
      .searchable()
      .searchPlaceholder("Search skills...")
      .description(
        "Searchable multiselect — popover stays open while selecting",
      )
      .multiple()
      .options([
        { label: "HTML", value: "html" },
        { label: "CSS", value: "css" },
        { label: "JavaScript", value: "javascript" },
        { label: "TypeScript", value: "typescript" },
        { label: "Svelte", value: "svelte" },
        { label: "React", value: "react" },
        { label: "Vue", value: "vue" },
        { label: "Node.js", value: "nodejs" },
      ]),

    // ─── 1e. Multiselect required ───
    Select("categories")
      .label("Categories")
      .placeholder("Select at least one category")
      .description("Required multiselect with validation")
      .multiple()
      .required()
      .options([
        { label: "News", value: "news" },
        { label: "Tutorial", value: "tutorial" },
        { label: "Review", value: "review" },
        { label: "Opinion", value: "opinion" },
      ]),

    // ─── 2. Required Select ───
    Select("priority")
      .label("Priority")
      .placeholder("Choose priority")
      .description("Required select with validation")
      .required()
      .options([
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ]),

    // ─── 3. Select with Default Value ───
    Select("theme")
      .label("Theme")
      .description("Select with a default value pre-selected")
      .defaultValue("dark")
      .options([
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
        { label: "System", value: "system" },
      ]),

    // ─── 4. Grouped Select ───
    Select("framework")
      .label("Framework")
      .placeholder("Choose a framework")
      .description("Select with grouped options")
      .groups([
        {
          label: "Frontend",
          options: [
            { label: "React", value: "react" },
            { label: "Vue", value: "vue" },
            { label: "Svelte", value: "svelte" },
            { label: "Angular", value: "angular" },
          ],
        },
        {
          label: "Backend",
          options: [
            { label: "Express", value: "express" },
            { label: "Fastify", value: "fastify" },
            { label: "Django", value: "django" },
            { label: "Spring", value: "spring" },
          ],
        },
        {
          label: "Full-stack",
          options: [
            { label: "Next.js", value: "nextjs" },
            { label: "Nuxt", value: "nuxt" },
            { label: "SvelteKit", value: "sveltekit" },
          ],
        },
      ]),

    // ─── 5. Grouped Select with Default Value ───
    Select("language")
      .label("Programming Language")
      .description("Grouped select with a default value")
      .defaultValue("ts")
      .groups([
        {
          label: "Web",
          options: [
            { label: "JavaScript", value: "js" },
            { label: "TypeScript", value: "ts" },
            { label: "Python", value: "py" },
          ],
        },
        {
          label: "Systems",
          options: [
            { label: "Rust", value: "rs" },
            { label: "Go", value: "go" },
            { label: "C++", value: "cpp" },
          ],
        },
      ]),

    // ─── 6. Select with Disabled Options ───
    Select("plan")
      .label("Subscription Plan")
      .placeholder("Select a plan")
      .description("Select with some disabled options")
      .options([
        {
          label: "Free",
          value: "free",
          description: "Basic features for personal use",
        },
        {
          label: "Pro",
          value: "pro",
          description: "Advanced features for professionals",
        },
        {
          label: "Enterprise",
          value: "enterprise",
          description: "Custom solutions for teams",
          disabled: true,
        },
        {
          label: "Legacy",
          value: "legacy",
          description: "Deprecated plan",
          disabled: true,
        },
      ]),

    // ─── 7. Select with Descriptions ───
    Select("deployment")
      .label("Deployment Region")
      .description("All options have descriptions shown inline")
      .options([
        {
          label: "North America",
          value: "na",
          description: "US East & West Coast",
        },
        { label: "Europe", value: "eu", description: "Frankfurt & London" },
        {
          label: "Asia Pacific",
          value: "ap",
          description: "Tokyo & Singapore",
        },
        { label: "South America", value: "sa", description: "São Paulo" },
      ]),

    // ─── 8. Searchable Select ───
    Select("city")
      .label("City")
      .searchable()
      .searchPlaceholder("Search cities...")
      .emptyMessage("No cities match your search.")
      .description("Searchable select with many options")
      .options([
        { label: "New York", value: "new-york" },
        { label: "Los Angeles", value: "los-angeles" },
        { label: "Chicago", value: "chicago" },
        { label: "Houston", value: "houston" },
        { label: "Phoenix", value: "phoenix" },
        { label: "Philadelphia", value: "philadelphia" },
        { label: "San Antonio", value: "san-antonio" },
        { label: "San Diego", value: "san-diego" },
        { label: "Dallas", value: "dallas" },
        { label: "San Jose", value: "san-jose" },
        { label: "Austin", value: "austin" },
        { label: "Jacksonville", value: "jacksonville" },
        { label: "Fort Worth", value: "fort-worth" },
        { label: "Columbus", value: "columbus" },
        { label: "Indianapolis", value: "indianapolis" },
      ]),

    // ─── 9. Searchable Grouped Select ───
    Select("animal")
      .label("Animal")
      .searchable()
      .searchPlaceholder("Search animals...")
      .description("Searchable select with groups")
      .groups([
        {
          label: "Mammals",
          options: [
            { label: "Dog", value: "dog" },
            { label: "Cat", value: "cat" },
            { label: "Elephant", value: "elephant" },
            { label: "Dolphin", value: "dolphin" },
          ],
        },
        {
          label: "Birds",
          options: [
            { label: "Eagle", value: "eagle" },
            { label: "Penguin", value: "penguin" },
            { label: "Owl", value: "owl" },
          ],
        },
        {
          label: "Reptiles",
          options: [
            { label: "Snake", value: "snake" },
            { label: "Lizard", value: "lizard" },
            { label: "Turtle", value: "turtle" },
          ],
        },
      ]),

    // ─── 10. Internal Links Select ───
    Select("linkedPage")
      .label("Link to Page")
      .placeholder("Select a page to link to")
      .description("Internal links mode with auto-resolve locale")
      .internalLinks(true, false),

    // ─── 11. Internal Links with Grouped Sections ───
    Select("linkedPageGrouped")
      .label("Link to Page (Grouped)")
      .placeholder("Select a page to link to")
      .description("Internal links mode grouped by section")
      .internalLinks(true, true),

    // ─── 12. Searchable + Required ───
    Select("status")
      .label("Status")
      .searchable()
      .searchPlaceholder("Filter statuses...")
      .required()
      .description("Searchable and required select")
      .options([
        { label: "Draft", value: "draft" },
        { label: "In Review", value: "in-review" },
        { label: "Approved", value: "approved" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ]),

    // ─── 13. Empty Select (no options) ───
    Select("emptyField")
      .label("Empty Field (No Options)")
      .placeholder("No options available")
      .description("Select with no options defined — tests empty state"),

    // ─── 14. Configurable minSearchLength ───
    Select("color")
      .label("Color")
      .searchable()
      .minSearchLength(2)
      .description("Searchable with min 2 chars required before filtering")
      .options([
        { label: "Crimson Red", value: "crimson" },
        { label: "Ocean Blue", value: "ocean-blue" },
        { label: "Forest Green", value: "forest-green" },
        { label: "Sunset Orange", value: "sunset-orange" },
        { label: "Royal Purple", value: "royal-purple" },
        { label: "Golden Yellow", value: "golden-yellow" },
      ]),

    // ─── 15. Custom emptyMessage ───
    Select("ingredient")
      .label("Ingredient")
      .searchable()
      .emptyMessage("No ingredients found. Try a different search.")
      .description("Searchable with a custom empty message")
      .options([
        { label: "Flour", value: "flour" },
        { label: "Sugar", value: "sugar" },
        { label: "Eggs", value: "eggs" },
        { label: "Butter", value: "butter" },
        { label: "Milk", value: "milk" },
      ]),

    // ─── 16. Without columns (default single-column dropdown) ───
    Select("noColumns")
      .label("No Columns (default)")
      .placeholder("Standard single-column layout")
      .description("Flat options without a columns config — baseline layout")
      .options([
        { label: "Alpha", value: "alpha" },
        { label: "Beta", value: "beta" },
        { label: "Gamma", value: "gamma" },
        { label: "Delta", value: "delta" },
      ]),

    // ─── 17. Two-column dropdown grid ───
    Select("twoColumns")
      .label("Two Columns")
      .placeholder("Pick an option")
      .description("Dropdown options laid out in 2 columns")
      .columns(2)
      .options([
        { label: "Apple", value: "apple" },
        { label: "Banana", value: "banana" },
        { label: "Cherry", value: "cherry" },
        { label: "Date", value: "date" },
        { label: "Elderberry", value: "elderberry" },
        { label: "Fig", value: "fig" },
        { label: "Grape", value: "grape" },
        { label: "Honeydew", value: "honeydew" },
      ]),

    // ─── 18. Three-column dropdown grid ───
    Select("threeColumns")
      .label("Three Columns")
      .placeholder("Pick an option")
      .description("Dropdown options laid out in 3 columns")
      .columns(3)
      .options([
        { label: "Red", value: "red" },
        { label: "Orange", value: "orange" },
        { label: "Yellow", value: "yellow" },
        { label: "Green", value: "green" },
        { label: "Blue", value: "blue" },
        { label: "Indigo", value: "indigo" },
        { label: "Violet", value: "violet" },
        { label: "Pink", value: "pink" },
        { label: "Cyan", value: "cyan" },
      ]),

    // ─── 19. Responsive columns ───
    Select("responsiveColumns")
      .label("Responsive Columns")
      .placeholder("Pick a size")
      .description("1 col on mobile, 2 on sm, 3 on md, 4 on lg+")
      .columns({ base: 1, sm: 2, md: 3, lg: 4 })
      .options([
        { label: "XS", value: "xs" },
        { label: "SM", value: "sm" },
        { label: "MD", value: "md" },
        { label: "LG", value: "lg" },
        { label: "XL", value: "xl" },
        { label: "2XL", value: "2xl" },
        { label: "3XL", value: "3xl" },
        { label: "4XL", value: "4xl" },
      ]),

    // ─── 20. Grouped + columns ───
    Select("groupedColumns")
      .label("Grouped + 2 Columns")
      .placeholder("Pick a tool")
      .description("Grouped options with a 2-column dropdown layout")
      .columns(2)
      .groups([
        {
          label: "Design",
          options: [
            { label: "Figma", value: "figma" },
            { label: "Sketch", value: "sketch" },
            { label: "Adobe XD", value: "xd" },
          ],
        },
        {
          label: "Development",
          options: [
            { label: "VS Code", value: "vscode" },
            { label: "WebStorm", value: "webstorm" },
            { label: "Neovim", value: "neovim" },
          ],
        },
      ]),

    // ─── 21. Full-width field span ───
    Select("colSpanFull")
      .label("Full Width (colSpan)")
      .placeholder("Spans the full form width")
      .description("Field uses colSpan: full in the form grid")
      .colSpan("full")
      .options([
        { label: "Option A", value: "a" },
        { label: "Option B", value: "b" },
        { label: "Option C", value: "c" },
      ]),

    // ─── 22. Highlight search matches ───
    Select("highlightMatches")
      .label("Highlight Matches")
      .searchable()
      .highlightMatches()
      .searchPlaceholder("Type to highlight matches...")
      .description("Searchable with highlightMatches enabled")
      .options([
        { label: "JavaScript", value: "javascript" },
        { label: "TypeScript", value: "typescript" },
        { label: "Python", value: "python" },
        { label: "Ruby", value: "ruby" },
        { label: "Rust", value: "rust" },
        { label: "Go", value: "go" },
      ]),

    // ─── Separator: Text field to test mixed forms ───
    Text("notes")
      .label("Additional Notes")
      .placeholder("Any additional notes about the selections above...")
      .description("A text field alongside selects to verify form integration"),
  ],
});
