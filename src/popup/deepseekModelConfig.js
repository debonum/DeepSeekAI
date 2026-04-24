const DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";

const DEEPSEEK_MODEL_OPTIONS = [
  {
    value: "deepseek-v4-flash",
    label: "deepseek-v4-flash",
    apiModel: "deepseek-v4-flash",
    thinkingType: "disabled",
  },
  {
    value: "deepseek-v4-flash:thinking",
    label: "deepseek-v4-flash (Thinking)",
    apiModel: "deepseek-v4-flash",
    thinkingType: "enabled",
    reasoningEffort: "high",
  },
  {
    value: "deepseek-v4-pro",
    label: "deepseek-v4-pro",
    apiModel: "deepseek-v4-pro",
    thinkingType: "disabled",
  },
  {
    value: "deepseek-v4-pro:thinking",
    label: "deepseek-v4-pro (Thinking)",
    apiModel: "deepseek-v4-pro",
    thinkingType: "enabled",
    reasoningEffort: "max",
  },
  {
    value: "deepseek-chat",
    label: "deepseek-chat (Legacy Alias)",
    apiModel: "deepseek-v4-flash",
    thinkingType: "disabled",
    isLegacyAlias: true,
  },
  {
    value: "deepseek-reasoner",
    label: "deepseek-reasoner (Legacy Alias)",
    apiModel: "deepseek-v4-flash",
    thinkingType: "enabled",
    reasoningEffort: "high",
    isLegacyAlias: true,
  },
];

const DEEPSEEK_MODEL_OPTION_MAP = new Map(
  DEEPSEEK_MODEL_OPTIONS.map((option) => [option.value, option])
);

export function getDeepSeekDefaultModels() {
  return DEEPSEEK_MODEL_OPTIONS.map(({ value, label }) => ({ value, label }));
}

export function getDeepSeekModelLabel(modelValue) {
  return DEEPSEEK_MODEL_OPTION_MAP.get(modelValue)?.label || modelValue || "";
}

export function resolveDeepSeekModel(modelValue, fallbackValue = DEEPSEEK_DEFAULT_MODEL) {
  const normalizedModel = typeof modelValue === "string" ? modelValue.trim() : "";
  const matchedOption = DEEPSEEK_MODEL_OPTION_MAP.get(normalizedModel);

  if (matchedOption) {
    return {
      ...matchedOption,
      isKnownModel: true,
      thinking:
        matchedOption.thinkingType
          ? { type: matchedOption.thinkingType }
          : null,
    };
  }

  if (normalizedModel) {
    return {
      value: normalizedModel,
      label: normalizedModel,
      apiModel: normalizedModel,
      thinking: null,
      thinkingType: null,
      reasoningEffort: null,
      isLegacyAlias: false,
      isKnownModel: false,
    };
  }

  if (fallbackValue && fallbackValue !== normalizedModel) {
    return resolveDeepSeekModel(fallbackValue, "");
  }

  return resolveDeepSeekModel(DEEPSEEK_DEFAULT_MODEL, "");
}
