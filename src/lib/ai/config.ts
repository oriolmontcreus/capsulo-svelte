import capsuloConfig from "../../../capsulo.config";
import type { CapsuloConfig } from "$lib/config/define-config";
import { DEFAULT_AI_MODEL } from "./protocol";

const aiConfig = (capsuloConfig as CapsuloConfig).ai ?? {};

export const AI_ENABLED = aiConfig.enabled !== false;
export const AI_MODEL = aiConfig.model?.trim() || DEFAULT_AI_MODEL;
