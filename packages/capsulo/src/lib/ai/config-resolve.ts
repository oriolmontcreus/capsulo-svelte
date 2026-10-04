import type { CapsuloConfig } from "../config/define-config";
import { DEFAULT_AI_MODEL } from "./protocol";

/** Pure, so the dev AI proxy (integration) can resolve it from the config it was given. */
export function resolveAiConfig(config: CapsuloConfig): { enabled: boolean; model: string } {
	const aiConfig = config.ai ?? {};
	return { enabled: aiConfig.enabled !== false, model: aiConfig.model?.trim() || DEFAULT_AI_MODEL };
}
