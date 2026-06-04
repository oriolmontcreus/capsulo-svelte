<script lang="ts">
  import { Input } from "$lib/components/ui/input";
  import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
  } from "$lib/components/ui/field";
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "$lib/components/ui/popover";
  import {
    Root as TabsRoot,
    List as TabsList,
    Trigger as TabsTrigger,
  } from "$lib/components/ui/tabs";
  import type { ColorPickerFieldDefinition } from "./color-picker-field.types";
  import {
    COLOR_CHANNELS_BY_SPACE,
    CHANNEL_LABELS,
    type ColorChannel,
    type ColorSpace,
    type Hsva,
    getChannelMax,
    getChannelValue,
    hexToHsva,
    hsvaToAreaBackground,
    hsvaToCssColor,
    hsvaToHex,
    isValidHexInput,
    normalizeHex,
    round,
    setChannelValue,
  } from "./color-utils";

  interface Props {
    field: ColorPickerFieldDefinition;
    value: string;
    onValueChange: (value: string) => void;
    error?: string;
  }

  let { field, value, onValueChange, error }: Props = $props();

  const includeAlpha = $derived(field.showAlpha ?? false);

  let open = $state(false);
  let colorSpace = $state<ColorSpace>("hsl");
  let hsva = $state<Hsva>({ h: 0, s: 0, v: 0, a: 1 });
  let lastEmittedHex = $state("");

  const localHex = $derived(hsvaToHex(hsva, includeAlpha));

  const channels = $derived(
    colorSpace === "hex" ? [] : COLOR_CHANNELS_BY_SPACE[colorSpace],
  );

  let hexDraft = $state("");
  let hexFocused = $state(false);
  let hexDirty = $state(false);

  const areaThumbStyle = $derived({
    left: `${hsva.s}%`,
    top: `${100 - hsva.v}%`,
  });

  const hueThumbStyle = $derived({
    left: `${(hsva.h / 360) * 100}%`,
  });

  const alphaThumbStyle = $derived({
    left: `${hsva.a * 100}%`,
  });

  const areaBackground = $derived(hsvaToAreaBackground(hsva.h));
  const swatchColor = $derived(hsvaToCssColor(hsva));

  const DEFAULT_SWATCHES = [
    "#000000",
    "#ffffff",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#ff8800",
    "#8800ff",
    "#008800",
    "#880000",
    "#888888",
    "#444444",
    "#cccccc",
  ];

  const swatches = $derived(
    field.presetColors && field.presetColors.length > 0
      ? field.presetColors
      : DEFAULT_SWATCHES,
  );

  $effect(() => {
    const normalized = normalizeHex(value || "#000000", includeAlpha);
    if (normalized === lastEmittedHex) return;
    hsva = hexToHsva(normalized);
    hexDirty = false;
  });

  $effect(() => {
    localHex;
    if (hexFocused || hexDirty) return;
    hexDraft = localHex;
  });

  function commitColor(next: Hsva): void {
    hsva = next;
    const hex = hsvaToHex(next, includeAlpha).toLowerCase();
    lastEmittedHex = hex;
    onValueChange(hex);
  }

  function commitColorFromPicker(next: Hsva): void {
    hexDirty = false;
    commitColor(next);
  }

  function applyFromHex(hex: string, closePopover = false): void {
    hexDirty = false;
    const normalized = normalizeHex(hex, includeAlpha);
    commitColor(hexToHsva(normalized));
    if (closePopover) open = false;
  }

  function setHue(h: number): void {
    commitColorFromPicker({ ...hsva, h: clamp(h, 0, 360) });
  }

  function setSaturationBrightness(s: number, v: number): void {
    commitColorFromPicker({
      ...hsva,
      s: clamp(s, 0, 100),
      v: clamp(v, 0, 100),
    });
  }

  function setAlpha(a: number): void {
    commitColorFromPicker({ ...hsva, a: clamp(a, 0, 1) });
  }

  function setChannel(channel: ColorChannel, raw: string): void {
    if (colorSpace === "hex") return;
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    commitColorFromPicker(setChannelValue(hsva, colorSpace, channel, parsed));
  }

  function commitHexDraft(): void {
    if (!isValidHexInput(hexDraft)) {
      hexDraft = localHex;
      hexDirty = false;
      return;
    }
    const normalized = normalizeHex(hexDraft, includeAlpha);
    lastEmittedHex = normalized;
    commitColor(hexToHsva(normalized));
    hexDirty = true;
  }

  function onHexInput(raw: string): void {
    if (!/^#?[0-9a-fA-F]*$/.test(raw)) return;
    hexDraft = raw;
    hexDirty = true;
  }

  function clamp(n: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, n));
  }

  let areaEl = $state<HTMLDivElement | null>(null);
  let hueTrackEl = $state<HTMLDivElement | null>(null);
  let alphaTrackEl = $state<HTMLDivElement | null>(null);

  function updateAreaFromPointer(event: PointerEvent): void {
    if (!areaEl) return;
    const rect = areaEl.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    setSaturationBrightness(x * 100, (1 - y) * 100);
  }

  function updateHueFromPointer(event: PointerEvent): void {
    if (!hueTrackEl) return;
    const rect = hueTrackEl.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setHue(x * 360);
  }

  function updateAlphaFromPointer(event: PointerEvent): void {
    if (!alphaTrackEl) return;
    const rect = alphaTrackEl.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    setAlpha(x);
  }

  function onAreaPointerDown(event: PointerEvent): void {
    event.preventDefault();
    areaEl?.setPointerCapture(event.pointerId);
    updateAreaFromPointer(event);

    const onMove = (e: PointerEvent) => updateAreaFromPointer(e);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onHuePointerDown(event: PointerEvent): void {
    event.preventDefault();
    hueTrackEl?.setPointerCapture(event.pointerId);
    updateHueFromPointer(event);

    const onMove = (e: PointerEvent) => updateHueFromPointer(e);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onAlphaPointerDown(event: PointerEvent): void {
    event.preventDefault();
    alphaTrackEl?.setPointerCapture(event.pointerId);
    updateAlphaFromPointer(event);

    const onMove = (e: PointerEvent) => updateAlphaFromPointer(e);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function channelInputValue(channel: ColorChannel): string {
    if (colorSpace === "hex") return "";
    return String(getChannelValue(hsva, colorSpace, channel));
  }

  function formatHueOutput(): string {
    return String(round(hsva.h));
  }

  function formatAlphaOutput(): string {
    return `${round(hsva.a * 100)}%`;
  }
</script>

<Field data-invalid={error ? "true" : undefined}>
  <FieldLabel id="{field.name}-label">
    {field.label ?? field.name}
    {#if field.required}
      <span class="text-destructive">*</span>
    {/if}
  </FieldLabel>

  <Popover bind:open>
    <PopoverTrigger>
      <button
        type="button"
        id={field.name}
        aria-labelledby="{field.name}-label"
        class="flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          class="size-6 shrink-0 rounded-md border border-border"
          style="background-color: {swatchColor};"
        ></span>
        <span class="truncate font-mono">{localHex}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent side="right" align="start" class="w-auto p-0 ml-4">
      {#if field.onlyPresets}
        <div class="grid grid-cols-5 gap-2 p-3">
          {#each swatches as color (color)}
            <button
              type="button"
              class="size-8 rounded-md border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
              style="background-color: {color};"
              title={color}
              onclick={() => applyFromHex(color, true)}
            ></button>
          {/each}
        </div>
      {:else}
        <div class="color-picker-panel flex w-[248px] flex-col gap-2 p-3">
          <!-- Color space tabs (like the reference design) -->
          <TabsRoot
            value={colorSpace}
            onValueChange={(v) => {
              colorSpace = v as ColorSpace;
            }}
          >
            <TabsList class="w-full" variant="default">
              <TabsTrigger value="hex" class="uppercase">Hex</TabsTrigger>
              <TabsTrigger value="rgb" class="uppercase">RGB</TabsTrigger>
              <TabsTrigger value="hsl" class="uppercase">HSL</TabsTrigger>
            </TabsList>
          </TabsRoot>

          <!-- Color area (HSB saturation × brightness) -->
          <div
            bind:this={areaEl}
            class="color-area relative h-[180px] w-full cursor-crosshair rounded-lg"
            onpointerdown={onAreaPointerDown}
            role="slider"
            aria-label="Saturation and brightness"
            aria-valuenow={round(hsva.s)}
            tabindex="0"
          >
            <div
              class="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
              style="background: {areaBackground};"
              aria-hidden="true"
            ></div>
            <div
              class="color-thumb color-area-thumb pointer-events-none absolute z-10 size-[17px] rounded-full border-2 border-white bg-clip-padding shadow-[0_0_4px_rgba(0,0,0,0.5)]"
              style="left: {areaThumbStyle.left}; top: {areaThumbStyle.top}; background-color: {swatchColor};"
            ></div>
          </div>

          <!-- Hue slider -->
          <div class="flex flex-col gap-1 px-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-foreground">Hue</span>
              <span class="text-muted-foreground tabular-nums"
                >{formatHueOutput()}</span
              >
            </div>
            <div
              bind:this={hueTrackEl}
              class="color-hue-track relative h-3 w-full cursor-crosshair rounded-full"
              onpointerdown={onHuePointerDown}
              role="slider"
              aria-label="Hue"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={round(hsva.h)}
              tabindex="0"
            >
              <div
                class="color-thumb pointer-events-none absolute top-1/2 size-[17px] rounded-full border-2 border-white bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                style="left: {hueThumbStyle.left};"
              ></div>
            </div>
          </div>

          <!-- Alpha slider -->
          {#if includeAlpha}
            <div class="flex flex-col gap-1 px-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-foreground">Alpha</span>
                <span class="text-muted-foreground tabular-nums"
                  >{formatAlphaOutput()}</span
                >
              </div>
              <div
                bind:this={alphaTrackEl}
                class="color-alpha-track relative h-3 w-full cursor-crosshair rounded-full"
                style="--alpha-color: {hsvaToCssColor({ ...hsva, a: 1 })};"
                onpointerdown={onAlphaPointerDown}
                role="slider"
                aria-label="Alpha"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={round(hsva.a * 100)}
                tabindex="0"
              >
                <div
                  class="color-thumb pointer-events-none absolute top-1/2 size-[17px] rounded-full border-2 border-white bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
                  style="left: {alphaThumbStyle.left};"
                ></div>
              </div>
            </div>
          {/if}

          <!-- Channel fields -->
          {#if colorSpace === "hex"}
            <div class="flex flex-col gap-1">
              <label
                class="text-muted-foreground text-xs uppercase"
                for="{field.name}-hex"
              >
                Hex
              </label>
              <Input
                id="{field.name}-hex"
                type="text"
                inputmode="text"
                spellcheck={false}
                autocomplete="off"
                autocapitalize="off"
                maxlength={includeAlpha ? 9 : 7}
                pattern="^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$"
                class="h-8 px-2 font-mono text-xs"
                value={hexDraft}
                onfocus={() => {
                  hexFocused = true;
                  if (!hexDraft) hexDraft = localHex;
                }}
                onblur={() => {
                  hexFocused = false;
                  commitHexDraft();
                }}
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                oninput={(e) => onHexInput(e.currentTarget.value)}
              />
            </div>
          {:else}
            <div class="grid w-full grid-cols-3 items-center gap-2">
              {#each channels as channel (channel)}
                <div class="flex flex-col gap-1">
                  <label
                    class="text-muted-foreground text-xs uppercase"
                    for="{field.name}-{channel}"
                  >
                    {CHANNEL_LABELS[channel]}
                  </label>
                  <Input
                    id="{field.name}-{channel}"
                    type="number"
                    min={0}
                    max={getChannelMax(colorSpace, channel)}
                    step={channel === "hue"
                      ? 1
                      : colorSpace === "rgb"
                        ? 1
                        : 0.1}
                    class="h-8 px-2 text-center text-xs tabular-nums"
                    value={channelInputValue(channel)}
                    oninput={(e) => setChannel(channel, e.currentTarget.value)}
                  />
                </div>
              {/each}
            </div>
          {/if}

          <!-- Preset swatches -->
          {#if field.presetColors && field.presetColors.length > 0}
            <div class="grid grid-cols-5 gap-2 border-t border-border pt-2">
              {#each field.presetColors as presetColor (presetColor)}
                <button
                  type="button"
                  class="size-7 rounded-md border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                  style="background-color: {presetColor};"
                  title={presetColor}
                  onclick={() => applyFromHex(presetColor)}
                ></button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </PopoverContent>
  </Popover>

  {#if field.description}
    <FieldDescription>{field.description}</FieldDescription>
  {/if}

  {#if error}
    <FieldError>{error}</FieldError>
  {/if}
</Field>

<style>
  .color-thumb {
    transform: translate(-50%, -50%) scale(var(--thumb-scale, 1));
    transform-origin: center;
  }

  .color-hue-track {
    background: linear-gradient(
      to right,
      #ff0000 0%,
      #ffff00 17%,
      #00ff00 33%,
      #00ffff 50%,
      #0000ff 67%,
      #ff00ff 83%,
      #ff0000 100%
    );
  }

  .color-alpha-track {
    background:
      linear-gradient(to right, transparent, var(--alpha-color, #000)),
      repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px;
  }

  .color-area:active .color-area-thumb,
  .color-hue-track:active .color-thumb,
  .color-alpha-track:active .color-thumb {
    --thumb-scale: 1.15;
  }

  .color-area-thumb {
    z-index: 10;
  }
</style>
