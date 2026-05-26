<script lang="ts">
  import { getCapsuleByKey } from "$lib/capsules/core/registry";
  import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
  import type { SchemaValues } from "$lib/form-builder/core/types";
  import {
    buildCapsuleInstanceData,
    getCapsuleDisplayTitle,
  } from "./capsule-instances";
  import { getCapsuleGroupColorThemeId } from "./capsule-group-colors";
  import CapsuleGroupBody from "./CapsuleGroupBody.svelte";
  import CapsuleGroupHeader from "./CapsuleGroupHeader.svelte";
  import type { GroupedCapsuleEntry } from "./types";

  type Props = {
    group: GroupedCapsuleEntry;
    isExpanded: boolean;
    locale: string;
    valuesByInstance: PageEditorValuesByInstance;
    schemaHydrationVersion: number;
    onToggle: () => void;
    onInstanceValuesChange: (instanceId: string, values: SchemaValues) => void;
  };

  let {
    group,
    isExpanded,
    locale,
    valuesByInstance,
    schemaHydrationVersion,
    onToggle,
    onInstanceValuesChange,
  }: Props = $props();

  const firstEntry = $derived(group.entries[0]?.entry);
  const capsule = $derived(getCapsuleByKey(group.capsuleKey));
  const title = $derived(
    getCapsuleDisplayTitle(
      group.capsuleKey,
      firstEntry?.componentName ?? group.capsuleKey,
    ),
  );
  const instanceData = $derived(buildCapsuleInstanceData(group));
  const panelId = $derived(`capsule-panel-${group.capsuleKey}`);
  const colorThemeId = $derived(getCapsuleGroupColorThemeId(group.capsuleKey));
</script>

<section
  class="capsule-group overflow-hidden rounded-md border"
  data-capsule-theme={colorThemeId}
>
  <CapsuleGroupHeader
    {title}
    capsuleKey={group.capsuleKey}
    instanceIds={instanceData.instanceIds}
    {isExpanded}
    {panelId}
    {onToggle}
  />

  {#if isExpanded}
    <CapsuleGroupBody
      {panelId}
      capsuleKey={group.capsuleKey}
      {capsule}
      flatInstanceKeys={instanceData.flatInstanceKeys}
      instanceIds={instanceData.instanceIds}
      {locale}
      {valuesByInstance}
      {schemaHydrationVersion}
      {onInstanceValuesChange}
    />
  {/if}
</section>
