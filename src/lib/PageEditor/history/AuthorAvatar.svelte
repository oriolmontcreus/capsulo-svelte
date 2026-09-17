<script lang="ts">
	import UserIcon from "@lucide/svelte/icons/user";

	let {
		name = null,
		avatarUrl = null,
		size = "sm"
	}: {
		name?: string | null;
		avatarUrl?: string | null;
		/** sm for the commit list, md for the commit header. */
		size?: "sm" | "md";
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

	const showImage = $derived(Boolean(avatarUrl) && !imageFailed);
	const sizeClass = $derived(size === "md" ? "size-6 text-[10px]" : "size-5 text-[9px]");
</script>

<span
	class="bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium {sizeClass}"
	aria-hidden="true"
>
	{#if showImage}
		<img
			src={avatarUrl}
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
