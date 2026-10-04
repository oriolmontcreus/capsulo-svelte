<script lang="ts">
	import UserIcon from "@lucide/svelte/icons/user";
	import type { ClassValue } from "clsx";
	import type { AvatarConfig } from "../avatar/avatar-config";
	import { avatarDataUri } from "../avatar/avatar-render";
	import { cn } from "../utils";

	let {
		name = null,
		seed = null,
		avatar = null,
		avatarUrl = null,
		size = "sm",
		class: className
	}: {
		name?: string | null;
		/** The user id: draws their default avatar when they haven't picked one. Null for deleted users. */
		seed?: string | null;
		avatar?: AvatarConfig | null;
		/** An uploaded picture wins over the generated avatar. */
		avatarUrl?: string | null;
		/** sm: commit list, md: commit header, lg: sidebar and menus, xl: the avatar editor. */
		size?: "sm" | "md" | "lg" | "xl";
		class?: ClassValue;
	} = $props();

	let imageFailed = $state(false);

	// A broken avatar_url must fall back rather than leave a torn image icon.
	$effect(() => {
		avatarUrl;
		imageFailed = false;
	});

	/** Up to two initials, Unicode-safe (Array.from, not charAt). */
	const initials = $derived.by(() => {
		const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
		return words
			.slice(0, 2)
			.map((word) => Array.from(word)[0] ?? "")
			.join("")
			.toLocaleUpperCase();
	});

	const imageSrc = $derived.by(() => {
		if (avatarUrl && !imageFailed) return avatarUrl;
		if (avatar) return avatarDataUri(avatar.seed, avatar.background);
		if (seed) return avatarDataUri(seed);
		return null;
	});

	const sizeClass = $derived(
		{
			sm: "size-5 text-[9px]",
			md: "size-6 text-[10px]",
			lg: "size-7 text-[11px]",
			xl: "size-28 text-2xl"
		}[size]
	);
</script>

<span
	class={cn(
		"bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium",
		sizeClass,
		className
	)}
	aria-hidden="true"
>
	{#if imageSrc}
		<img
			src={imageSrc}
			alt=""
			class="size-full object-cover"
			loading="lazy"
			onerror={() => (imageFailed = true)}
		/>
	{:else if initials}
		{initials}
	{:else}
		<UserIcon class="size-3" />
	{/if}
</span>
