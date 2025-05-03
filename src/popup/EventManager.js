export class EventManager {
  constructor(managers) {
    this.managers = managers;
  }

  // 初始化所有事件监听
  initializeEventListeners() {
    // API Key visibility toggle
    this.managers.uiManager.elements.toggleButton.addEventListener(
      "click",
      () => this.managers.uiManager.toggleApiKeyVisibility()
    );

    // API Key focus event - 确保在输入时可见
    this.managers.uiManager.elements.apiKeyInput.addEventListener(
      "focus",
      () => {
        // 确保当获得焦点时内容可见
        this.managers.uiManager.elements.apiKeyInput.type = "text";
        this.managers.uiManager.elements.iconSwitch.src = "../icons/hiddle.svg";
      }
    );

    // API Key validation and hiding on blur
    this.managers.uiManager.elements.apiKeyInput.addEventListener(
      "blur",
      () => {
        // 当有内容时，失去焦点时隐藏内容
        if (this.managers.uiManager.getApiKeyValue()) {
          this.managers.uiManager.elements.apiKeyInput.type = "password";
          this.managers.uiManager.elements.iconSwitch.src = "../icons/show.svg";
        }
        // 执行API验证
        this.managers.apiKeyManager.handleApiKeyValidation();
      }
    );

    // 服务商切换事件
    this.managers.uiManager.elements.providerSelect.addEventListener(
      "change",
      async (e) => {
        const provider = e.target.value;
        console.log(`开始切换服务商到: ${provider}`);

        try {
          // 保存服务商选择
          await this.managers.storageManager.saveProvider(provider);
          console.log(`✅ 服务商已保存为: ${provider}`);

          // 更新UI（包括API密钥和自定义API URL）
          await this.managers.providerUIManager.updateProviderUI(provider);
          console.log(`✅ 服务商UI已更新: ${provider}`);

          // 更新模型选项
          await this.managers.modelManager.updateModelOptions(provider);
          console.log(`✅ 模型选项已更新: ${provider}`);
        } catch (error) {
          console.error(`服务商切换错误:`, error);
        }
      }
    );

    // 自定义API URL保存
    this.managers.uiManager.elements.customApiUrlInput.addEventListener(
      "blur",
      () => this.managers.providerUIManager.handleCustomApiUrlSave()
    );

    // 关闭模型弹窗按钮
    this.managers.uiManager.elements.closeModelModal?.addEventListener(
      "click",
      () => this.managers.uiManager.hideAddModelModal()
    );

    // 取消添加模型按钮
    this.managers.uiManager.elements.cancelModelButton?.addEventListener(
      "click",
      () => this.managers.uiManager.hideAddModelModal()
    );

    // 保存模型按钮
    this.managers.uiManager.elements.saveModelButton?.addEventListener(
      "click",
      () => this.managers.modelManager.handleSaveModel()
    );

    // 自定义服务商API Key focus事件
    this.managers.uiManager.elements.customProviderApiKey?.addEventListener(
      "focus",
      () => {
        // 确保当获得焦点时内容可见
        this.managers.uiManager.elements.customProviderApiKey.type = "text";
      }
    );

    // 自定义服务商API Key blur事件
    this.managers.uiManager.elements.customProviderApiKey?.addEventListener(
      "blur",
      () => {
        // 当有内容时，失去焦点时隐藏内容
        if (this.managers.uiManager.getCustomProviderApiKey()) {
          this.managers.uiManager.elements.customProviderApiKey.type = "password";
        }
      }
    );

    // 关闭自定义服务商弹窗按钮
    this.managers.uiManager.elements.closeCustomProviderModal?.addEventListener(
      "click",
      () => this.managers.uiManager.hideCustomProviderModal()
    );

    // 取消自定义服务商按钮
    this.managers.uiManager.elements.cancelCustomProviderButton?.addEventListener(
      "click",
      () => this.managers.uiManager.hideCustomProviderModal()
    );

    // 保存自定义服务商按钮
    this.managers.uiManager.elements.saveCustomProviderButton?.addEventListener(
      "click",
      () => this.managers.providerUIManager.handleSaveCustomProvider()
    );

    // 点击弹窗外部关闭弹窗
    this.managers.uiManager.elements.addModelModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.addModelModal) {
          this.managers.uiManager.hideAddModelModal();
        }
      }
    );

    this.managers.uiManager.elements.customProviderModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.customProviderModal) {
          this.managers.uiManager.hideCustomProviderModal();
        }
      }
    );

    // 删除服务商对话框相关事件监听
    this.managers.uiManager.elements.closeDeleteProviderModal?.addEventListener(
      "click",
      () => this.managers.uiManager.hideDeleteProviderModal()
    );

    this.managers.uiManager.elements.cancelDeleteProviderButton?.addEventListener(
      "click",
      () => this.managers.uiManager.hideDeleteProviderModal()
    );

    this.managers.uiManager.elements.confirmDeleteProviderButton?.addEventListener(
      "click",
      () => this.managers.providerUIManager.handleDeleteProvider()
    );

    this.managers.uiManager.elements.deleteProviderModal?.addEventListener(
      "click",
      (e) => {
        if (e.target === this.managers.uiManager.elements.deleteProviderModal) {
          this.managers.uiManager.hideDeleteProviderModal();
        }
      }
    );

    // Language selection
    this.managers.uiManager.elements.languageSelect.addEventListener(
      "change",
      (e) => {
        this.managers.storageManager.saveLanguage(e.target.value);
        this.managers.i18nManager.updateLabels();
      }
    );

    // Model selection
    this.managers.uiManager.elements.modelSelect.addEventListener(
      "change",
      (e) => {
        const model = e.target.value;
        // 保存模型选择
        this.managers.storageManager.saveModel(model).then(() => {
          console.log(`✅ 模型已切换为: ${model}`);
        });
      }
    );

    // Selection enabled toggle
    this.managers.uiManager.elements.selectionEnabled.addEventListener(
      "change",
      (e) => this.managers.storageManager.saveSelectionEnabled(e.target.checked)
    );

    // Remember window size toggle
    this.managers.uiManager.elements.rememberWindowSize.addEventListener(
      "change",
      (e) => this.managers.storageManager.saveRememberWindowSize(e.target.checked)
    );

    // Pin window toggle
    this.managers.uiManager.elements.pinWindow.addEventListener(
      "change",
      (e) => this.managers.storageManager.savePinWindow(e.target.checked)
    );

    // Shortcut settings
    document.getElementById('shortcutSettings').addEventListener(
      'click',
      (e) => this.handleShortcutSettings(e)
    );

    // Instructions link
    document.getElementById('instructionsLink').addEventListener(
      'click',
      (e) => this.handleInstructionsLink(e)
    );
  }

  // 处理快捷键设置
  handleShortcutSettings(e) {
    e.preventDefault();
    chrome.tabs.create({
      url: "chrome://extensions/shortcuts"
    });
  }

  // 处理说明链接
  async handleInstructionsLink(e) {
    e.preventDefault();
    const instructionsUrl = chrome.runtime.getURL('Instructions/Instructions.html');
    chrome.tabs.create({
      url: instructionsUrl
    });
  }
}