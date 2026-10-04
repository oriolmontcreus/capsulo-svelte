<script lang="ts">
  import { getCapsuleByKey } from "../../capsules/core/registry";
  import type { PageEditorValuesByInstance } from "../persistence";
  import type { SchemaValues } from "../../form-builder/core/types";
  import { validatePageContent } from "../../capsules/core/validate-content";
  import { VALIDATION_OPTIONS } from "../validate-documents";
  import {
    buildCapsuleInstanceData,
    getCapsuleDisplayTitle,
  } from "./capsule-instances";
  import { getCapsuleGroupColorThemeId } from "./capsule-group-colors";
  import CapsuleGroupBody from "./CapsuleGroupBody.svelte";
  import CapsuleGroupHeader from "./CapsuleGroupHeader.svelte";
  import type { FieldFocusTarget, GroupedCapsuleEntry } from "./types";

  type Props = {
    group: GroupedCapsuleEntry;
    isExpanded: boolean;
    locale: string;
    valuesByInstance: PageEditorValuesByInstance;
    schemaHydrationVersion: number;
    focusTarget?: FieldFocusTarget | null;
    showAllErrors?: boolean;
    /** Reveal every error on the page (the header's issue badge). */
    onShowErrors: () => void;
    onToggle: () => void;
    onInstanceValuesChange: (instanceId: string, values: SchemaValues) => void;
  };

  let {
    group,
    isExpanded,
    locale,
    valuesByInstance,
    schemaHydrationVersion,
    focusTarget = null,
    showAllErrors = false,
    onShowErrors,
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
  const issueCount = $derived(
    capsule
      ? validatePageContent(
          instanceData.instanceIds.map((instanceId) => ({ instanceId, capsuleKey: group.capsuleKey })),
          valuesByInstance,
          () => capsule.schema,
          VALIDATION_OPTIONS,
        ).length
      : 0,
  );
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
    {issueCount}
    {onShowErrors}
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
      {focusTarget}
      {showAllErrors}
      {onInstanceValuesChange}
    />
  {/if}
</section>
