export class ApiKeyManager {
  constructor(providerManager, uiManager, i18nManager, modelManager) {
    this.providerManager = providerManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;
    this.modelManager = modelManager; // 可选：用于统一弹出添加模型对话框
    this.lastValidatedValue = "";
  }

  // 处理API密钥验证
  async handleApiKeyValidation() {
    const apiKey = this.uiManager.getApiKeyValue();
    const provider = this.uiManager.elements.providerSelect.value;

    // 如果API key没有变化，不进行验证
    if (apiKey === this.lastValidatedValue) {
      return;
    }

    // 禁用API输入框，防止重复提交
    this.uiManager.elements.apiKeyInput.disabled = true;

    // 显示验证中提示和加载动画
    this.uiManager.showMessage(
      this.i18nManager.getTranslation("validating"),
      true,
    );

    try {
      const settings = {
        model:
          provider === "custom"
            ? this.uiManager.getCustomModelName()
            : this.uiManager.elements.modelSelect.value,
        customApiUrl: this.uiManager.getCustomApiUrlValue(),
      };

      // 非 deepseek：必须有模型，否则不要保存 Key，直接引导添加模型
      if (provider !== "deepseek" && !settings.model) {
        this.uiManager.showMessage(
          this.i18nManager.getTranslation("noModel"),
          false,
        );
        if (this.modelManager?.showAddModelDialog) {
          this.modelManager.showAddModelDialog();
        } else if (this.uiManager.showAddModelModal) {
          // 兜底
          this.uiManager.showAddModelModal();
        }
        // 恢复API输入框状态
        this.uiManager.elements.apiKeyInput.disabled = false;
        return;
      }

      const result = await this.providerManager.validateApiKey(
        provider,
        apiKey,
        settings.model,
      );

      // 恢复API输入框状态
      this.uiManager.elements.apiKeyInput.disabled = false;

      if (result?.ok) {
        // 仅在验证成功后保存API密钥
        await this.providerManager.saveApiKey(provider, apiKey);
        // 更新lastValidatedValue
        this.lastValidatedValue = apiKey;

        this.uiManager.showMessage(
          this.i18nManager.getTranslation("saveSuccess"),
          true,
        );
      } else {
        const reason = result?.reason;
        const msg =
          result?.message || this.i18nManager.getTranslation("apiKeyInvalid");
        // 针对不同原因给出更明确的提示
        if (reason === "invalid_key") {
          this.uiManager.showMessage(
            this.i18nManager.getTranslation("apiKeyInvalidStrict"),
            false,
          );
        } else if (reason === "invalid_model") {
          this.uiManager.showMessage(
            this.i18nManager.getTranslation("modelInvalidStrict"),
            false,
          );
        } else if (reason === "rate_limited") {
          this.uiManager.showMessage("Rate limited. Please try later.", false);
        } else if (reason === "server_error") {
          this.uiManager.showMessage(
            "Service error. Please retry later.",
            false,
          );
        } else if (reason === "network") {
          this.uiManager.showMessage("Network error. Check connection.", false);
        } else {
          this.uiManager.showMessage(msg, false);
        }
      }
    } catch (error) {
      // 恢复API输入框状态
      this.uiManager.elements.apiKeyInput.disabled = false;

      console.error("API验证错误:", error);
      this.uiManager.showMessage(
        this.i18nManager.getTranslation("fetchError"),
        false,
      );
    }
  }
}
