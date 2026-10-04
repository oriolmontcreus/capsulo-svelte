import capsuloConfig from "virtual:capsulo/config";
import { resolveAiConfig } from "./config-resolve";

const resolved = resolveAiConfig(capsuloConfig);

export const AI_ENABLED = resolved.enabled;
export const AI_MODEL = resolved.model;
