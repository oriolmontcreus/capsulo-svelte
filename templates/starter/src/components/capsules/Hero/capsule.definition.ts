import { defineCapsule } from "capsulo/schema";
import Hero from "./Hero.svelte";
import { heroSchema } from "./hero.schema";

export default defineCapsule({
	schema: heroSchema,
	component: Hero,
	meta: {
		displayName: "Hero",
		description: "Page headline with a call to action."
	}
});
