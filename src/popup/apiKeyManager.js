export class ApiKeyManager {
  constructor(providerManager, uiManager, i18nManager) {
    this.providerManager = providerManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;
    this.lastValidatedValue = '';
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
      this.i18nManager.getTranslation('validating'),
      true
    );

    try {
      const settings = {
        model: provider === 'custom' ? this.uiManager.getCustomModelName() : this.uiManager.elements.modelSelect.value,
        customApiUrl: this.uiManager.getCustomApiUrlValue()
      };

      const isValid = await this.providerManager.validateApiKey(provider, apiKey, settings.model);

      // 恢复API输入框状态
      this.uiManager.elements.apiKeyInput.disabled = false;

      if (isValid) {
        // 仅在验证成功后保存API密钥
        await this.providerManager.saveApiKey(provider, apiKey);
        // 更新lastValidatedValue
        this.lastValidatedValue = apiKey;

        this.uiManager.showMessage(
          this.i18nManager.getTranslation('saveSuccess'),
          true
        );
      } else {
        this.uiManager.showMessage(
          this.i18nManager.getTranslation('apiKeyInvalid'),
          false
        );
      }
    } catch (error) {
      // 恢复API输入框状态
      this.uiManager.elements.apiKeyInput.disabled = false;

      console.error('API验证错误:', error);
      this.uiManager.showMessage(
        this.i18nManager.getTranslation('fetchError'),
        false
      );
    }
  }
}