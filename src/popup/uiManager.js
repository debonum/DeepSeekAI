export class UiManager {
  constructor() {
    this.initElements();
  }

  // 初始化元素引用
  initElements() {
    this.elements = {
      apiKeyInput: document.getElementById("apiKey"),
      toggleButton: document.getElementById("toggleVisibility"),
      iconSwitch: document.getElementById("iconSwitch"),
      providerSelect: document.getElementById("provider"),
      languageSelect: document.getElementById("language"),
      modelSelect: document.getElementById("model"),
      selectionEnabled: document.getElementById("selectionEnabled"),
      rememberWindowSize: document.getElementById("rememberWindowSize"),
      pinWindow: document.getElementById("pinWindow"),
      customApiUrl: document.getElementById("customApiUrl"),
      customApiUrlInput: document.getElementById("customApiUrlInput"),
      customProviderNameInput: document.getElementById("customProviderNameInput"),
      providerNameContainer: document.getElementById("providerNameContainer"),
      customModelIdInput: document.getElementById("customModelIdInput"),
      customModelNameInput: document.getElementById("customModelNameInput"),
      customModelContainer: document.getElementById("customModelContainer"),
      saveCustomProviderBtn: document.getElementById("saveCustomProviderBtn"),
      saveCustomProviderContainer: document.getElementById("saveCustomProviderContainer"),
      // 添加模型相关元素
      addModelButton: document.getElementById("addModelButton"),
      addModelModal: document.getElementById("addModelModal"),
      closeModelModal: document.getElementById("closeModelModal"),
      modelApiKey: document.getElementById("modelApiKey"),
      modelApiId: document.getElementById("modelApiId"),
      modelDisplayName: document.getElementById("modelDisplayName"),
      saveModelButton: document.getElementById("saveModelButton"),
      cancelModelButton: document.getElementById("cancelModelButton"),
      modelValidationMessage: document.getElementById("modelValidationMessage"),
      addModelTitle: document.getElementById("addModelTitle"),
      modelIdLabel: document.getElementById("modelIdLabel"),
      modelDisplayNameLabel: document.getElementById("modelDisplayNameLabel"),
      modelApiKeyLabel: document.getElementById("modelApiKeyLabel"),
      // 自定义服务商弹窗元素
      customProviderModal: document.getElementById("customProviderModal"),
      closeCustomProviderModal: document.getElementById("closeCustomProviderModal"),
      customProviderApiKey: document.getElementById("customProviderApiKey"),
      saveCustomProviderButton: document.getElementById("saveCustomProviderButton"),
      cancelCustomProviderButton: document.getElementById("cancelCustomProviderButton"),
      customProviderValidationMessage: document.getElementById("customProviderValidationMessage"),
      customProviderTitle: document.getElementById("customProviderTitle"),
      customProviderNameInputLabel: document.getElementById("customProviderNameInputLabel"),
      customApiUrlInputLabel: document.getElementById("customApiUrlInputLabel"),
      customModelNameInputLabel: document.getElementById("customModelNameInputLabel"),
      customProviderApiKeyLabel: document.getElementById("customProviderApiKeyLabel"),
      // 删除服务商相关元素
      deleteProviderBtn: document.getElementById("deleteProviderBtn"),
      deleteProviderModal: document.getElementById("deleteProviderModal"),
      closeDeleteProviderModal: document.getElementById("closeDeleteProviderModal"),
      deleteProviderConfirmText: document.getElementById("deleteProviderConfirmText"),
      cancelDeleteProviderButton: document.getElementById("cancelDeleteProviderButton"),
      confirmDeleteProviderButton: document.getElementById("confirmDeleteProviderButton"),
      deleteProviderValidationMessage: document.getElementById("deleteProviderValidationMessage"),
      deleteProviderTitle: document.getElementById("deleteProviderTitle"),
      customModelDropdown: document.getElementById("custom-model-dropdown"),
      // 删除模型相关元素
      deleteModelModal: document.getElementById("deleteModelModal"),
      closeDeleteModelModal: document.getElementById("closeDeleteModelModal"),
      deleteModelConfirmText: document.getElementById("deleteModelConfirmText"),
      cancelDeleteModelButton: document.getElementById("cancelDeleteModelButton"),
      confirmDeleteModelButton: document.getElementById("confirmDeleteModelButton"),
      deleteModelValidationMessage: document.getElementById("deleteModelValidationMessage"),
      deleteModelTitle: document.getElementById("deleteModelTitle")
    };
  }

  // 刷新DOM元素引用，确保它们被正确获取
  refreshElements() {
    // 重新获取可能未正确加载的元素
    if (!this.elements.customApiUrl) {
      this.elements.customApiUrl = document.getElementById("customApiUrl");
    }
    if (!this.elements.customApiUrlInput) {
      this.elements.customApiUrlInput = document.getElementById("customApiUrlInput");
    }
    if (!this.elements.customProviderNameInput) {
      this.elements.customProviderNameInput = document.getElementById("customProviderNameInput");
    }
    if (!this.elements.providerNameContainer) {
      this.elements.providerNameContainer = document.getElementById("providerNameContainer");
    }
    if (!this.elements.customModelIdInput) {
      this.elements.customModelIdInput = document.getElementById("customModelIdInput");
    }
    if (!this.elements.customModelNameInput) {
      this.elements.customModelNameInput = document.getElementById("customModelNameInput");
    }
    if (!this.elements.customModelContainer) {
      this.elements.customModelContainer = document.getElementById("customModelContainer");
    }
    if (!this.elements.saveCustomProviderBtn) {
      this.elements.saveCustomProviderBtn = document.getElementById("saveCustomProviderBtn");
    }
    if (!this.elements.saveCustomProviderContainer) {
      this.elements.saveCustomProviderContainer = document.getElementById("saveCustomProviderContainer");
    }
    // 添加模型相关元素
    if (!this.elements.addModelButton) {
      this.elements.addModelButton = document.getElementById("addModelButton");
    }
    if (!this.elements.addModelModal) {
      this.elements.addModelModal = document.getElementById("addModelModal");
    }
    if (!this.elements.closeModelModal) {
      this.elements.closeModelModal = document.getElementById("closeModelModal");
    }
    if (!this.elements.modelApiId) {
      this.elements.modelApiId = document.getElementById("modelApiId");
    }
    if (!this.elements.modelDisplayName) {
      this.elements.modelDisplayName = document.getElementById("modelDisplayName");
    }
    if (!this.elements.saveModelButton) {
      this.elements.saveModelButton = document.getElementById("saveModelButton");
    }
    if (!this.elements.cancelModelButton) {
      this.elements.cancelModelButton = document.getElementById("cancelModelButton");
    }
    if (!this.elements.modelValidationMessage) {
      this.elements.modelValidationMessage = document.getElementById("modelValidationMessage");
    }
    if (!this.elements.addModelTitle) {
      this.elements.addModelTitle = document.getElementById("addModelTitle");
    }
    if (!this.elements.modelIdLabel) {
      this.elements.modelIdLabel = document.getElementById("modelIdLabel");
    }
    if (!this.elements.modelDisplayNameLabel) {
      this.elements.modelDisplayNameLabel = document.getElementById("modelDisplayNameLabel");
    }

    // 自定义服务商弹窗元素
    if (!this.elements.customProviderModal) {
      this.elements.customProviderModal = document.getElementById("customProviderModal");
    }
    if (!this.elements.closeCustomProviderModal) {
      this.elements.closeCustomProviderModal = document.getElementById("closeCustomProviderModal");
    }
    if (!this.elements.customProviderApiKey) {
      this.elements.customProviderApiKey = document.getElementById("customProviderApiKey");
    }
    if (!this.elements.saveCustomProviderButton) {
      this.elements.saveCustomProviderButton = document.getElementById("saveCustomProviderButton");
    }
    if (!this.elements.cancelCustomProviderButton) {
      this.elements.cancelCustomProviderButton = document.getElementById("cancelCustomProviderButton");
    }
    if (!this.elements.customProviderValidationMessage) {
      this.elements.customProviderValidationMessage = document.getElementById("customProviderValidationMessage");
    }
    if (!this.elements.customProviderTitle) {
      this.elements.customProviderTitle = document.getElementById("customProviderTitle");
    }
    if (!this.elements.customApiUrlInputLabel) {
      this.elements.customApiUrlInputLabel = document.getElementById("customApiUrlInputLabel");
    }
    if (!this.elements.customModelNameInputLabel) {
      this.elements.customModelNameInputLabel = document.getElementById("customModelNameInputLabel");
    }
    if (!this.elements.customProviderApiKeyLabel) {
      this.elements.customProviderApiKeyLabel = document.getElementById("customProviderApiKeyLabel");
    }

    // 删除服务商相关元素
    if (!this.elements.deleteProviderBtn) {
      this.elements.deleteProviderBtn = document.getElementById("deleteProviderBtn");
    }
    if (!this.elements.deleteProviderModal) {
      this.elements.deleteProviderModal = document.getElementById("deleteProviderModal");
    }
    if (!this.elements.closeDeleteProviderModal) {
      this.elements.closeDeleteProviderModal = document.getElementById("closeDeleteProviderModal");
    }
    if (!this.elements.deleteProviderConfirmText) {
      this.elements.deleteProviderConfirmText = document.getElementById("deleteProviderConfirmText");
    }
    if (!this.elements.cancelDeleteProviderButton) {
      this.elements.cancelDeleteProviderButton = document.getElementById("cancelDeleteProviderButton");
    }
    if (!this.elements.confirmDeleteProviderButton) {
      this.elements.confirmDeleteProviderButton = document.getElementById("confirmDeleteProviderButton");
    }
    if (!this.elements.deleteProviderValidationMessage) {
      this.elements.deleteProviderValidationMessage = document.getElementById("deleteProviderValidationMessage");
    }
    if (!this.elements.deleteProviderTitle) {
      this.elements.deleteProviderTitle = document.getElementById("deleteProviderTitle");
    }
    if (!this.elements.customModelDropdown) {
      this.elements.customModelDropdown = document.getElementById("custom-model-dropdown");
    }

    // 添加删除模型相关元素
    if (!this.elements.deleteModelModal) {
      this.elements.deleteModelModal = document.getElementById("deleteModelModal");
    }
    if (!this.elements.closeDeleteModelModal) {
      this.elements.closeDeleteModelModal = document.getElementById("closeDeleteModelModal");
    }
    if (!this.elements.deleteModelConfirmText) {
      this.elements.deleteModelConfirmText = document.getElementById("deleteModelConfirmText");
    }
    if (!this.elements.cancelDeleteModelButton) {
      this.elements.cancelDeleteModelButton = document.getElementById("cancelDeleteModelButton");
    }
    if (!this.elements.confirmDeleteModelButton) {
      this.elements.confirmDeleteModelButton = document.getElementById("confirmDeleteModelButton");
    }
    if (!this.elements.deleteModelValidationMessage) {
      this.elements.deleteModelValidationMessage = document.getElementById("deleteModelValidationMessage");
    }
    if (!this.elements.deleteModelTitle) {
      this.elements.deleteModelTitle = document.getElementById("deleteModelTitle");
    }
  }

  // 显示添加模型弹窗
  showAddModelModal() {
    this.refreshElements();
    if (this.elements.addModelModal) {
      this.elements.addModelModal.classList.add('show');
      this.elements.modelApiId.value = '';
      this.elements.modelDisplayName.value = '';
      this.clearValidationMessage(this.elements.modelValidationMessage);
    }
  }

  // 隐藏添加模型弹窗
  hideAddModelModal() {
    this.refreshElements();
    if (this.elements.addModelModal) {
      this.elements.addModelModal.classList.remove('show');
      // 清空输入字段
      this.elements.modelApiId.value = '';
      this.elements.modelDisplayName.value = '';
      this.clearValidationMessage(this.elements.modelValidationMessage);
    }
  }

  // 显示自定义服务商弹窗
  showCustomProviderModal() {
    this.refreshElements();
    if (this.elements.customProviderModal) {
      this.elements.customProviderModal.classList.add('show');
      // 清空输入字段
      if (this.elements.customProviderNameInput) {
        this.elements.customProviderNameInput.value = '';
      }
      if (this.elements.customProviderApiKey) {
        this.elements.customProviderApiKey.value = '';
      }
      if (this.elements.customApiUrlInput) {
        this.elements.customApiUrlInput.value = '';
      }
      if (this.elements.customModelIdInput) {
        this.elements.customModelIdInput.value = '';
      }
      if (this.elements.customModelNameInput) {
        this.elements.customModelNameInput.value = '';
      }
      this.clearValidationMessage(this.elements.customProviderValidationMessage);
    }
  }

  // 隐藏自定义服务商弹窗
  hideCustomProviderModal() {
    this.refreshElements();
    if (this.elements.customProviderModal) {
      this.elements.customProviderModal.classList.remove('show');
      // 清空输入字段
      if (this.elements.customProviderNameInput) {
        this.elements.customProviderNameInput.value = '';
      }
      if (this.elements.customProviderApiKey) {
        this.elements.customProviderApiKey.value = '';
      }
      if (this.elements.customApiUrlInput) {
        this.elements.customApiUrlInput.value = '';
      }
      if (this.elements.customModelIdInput) {
        this.elements.customModelIdInput.value = '';
      }
      if (this.elements.customModelNameInput) {
        this.elements.customModelNameInput.value = '';
      }
      this.clearValidationMessage(this.elements.customProviderValidationMessage);
    }
  }

  // 清除验证消息的通用方法
  clearValidationMessage(element) {
    if (element) {
      element.innerHTML = '';
      element.className = 'validation-message';
    }
  }

  // 显示模型验证消息（已弃用，改为使用按钮状态显示）
  showModelValidationMessage(message, isSuccess) {
    // 空方法，验证状态现在直接在按钮上显示
  }

  // 显示自定义服务商验证消息（已弃用，改为使用按钮状态显示）
  showCustomProviderValidationMessage(message, isSuccess) {
    // 空方法，验证状态现在直接在按钮上显示
  }

  // 获取模型API ID
  getModelApiId() {
    this.refreshElements();
    return this.elements.modelApiId?.value?.trim() || '';
  }

  // 获取模型显示名称输入值
  getModelDisplayNameValue() {
    this.refreshElements();
    return this.elements.modelDisplayName?.value?.trim() || '';
  }

  // 获取模型显示名称
  getModelDisplayName() {
    this.refreshElements();
    return this.elements.modelDisplayName?.textContent?.trim() || '';
  }

  // 显示或隐藏Provider Name输入框
  toggleProviderNameContainer(show) {
    this.refreshElements();
    if (this.elements.providerNameContainer) {
      this.elements.providerNameContainer.style.display = show ? 'flex' : 'none';
    }
  }

  // 显示或隐藏Model Name输入框
  toggleCustomModelContainer(show) {
    this.refreshElements();
    if (this.elements.customModelContainer) {
      this.elements.customModelContainer.style.display = show ? 'flex' : 'none';
    }
  }

  // 显示或隐藏保存按钮
  toggleSaveCustomProviderBtn(show) {
    this.refreshElements();
    if (this.elements.saveCustomProviderContainer) {
      this.elements.saveCustomProviderContainer.style.display = show ? 'block' : 'none';
    }
  }

  // 获取自定义Provider名称
  getCustomProviderName() {
    this.refreshElements();
    return this.elements.customProviderNameInput?.value?.trim() || '';
  }

  // 获取自定义服务商API密钥
  getCustomProviderApiKey() {
    this.refreshElements();
    return this.elements.customProviderApiKey?.value?.trim() || '';
  }

  // 获取自定义Model名称
  getCustomModelName() {
    this.refreshElements();
    return this.elements.customModelNameInput?.value?.trim() || '';
  }

  // 获取自定义Model ID
  getCustomModelId() {
    this.refreshElements();
    return this.elements.customModelIdInput?.value?.trim() || '';
  }

  // 添加自定义Provider到下拉列表
  addCustomProviderToSelect(id, name) {
    this.refreshElements();
    const providerSelect = this.elements.providerSelect;

    // 检查是否已存在
    if (document.getElementById(id)) {
      return;
    }

    // 创建新的选项
    const option = document.createElement('option');
    option.value = id;
    option.id = id;
    option.textContent = name;

    // 插入到custom选项之前
    const customOption = providerSelect.querySelector('option[value="custom"]');
    if (customOption) {
      providerSelect.insertBefore(option, customOption);
    } else {
      providerSelect.appendChild(option);
    }
  }

  showMessage(message, isSuccess) {
    // 使用已存在的错误消息div
    const errorMessageElement = document.getElementById('errorMessage');
    if (!errorMessageElement) return;

    // 清空原有内容
    errorMessageElement.innerHTML = '';

    // 设置正确的class
    errorMessageElement.className = isSuccess ? 'success-message' : 'error-message';

    // 检查是否是验证中的消息
    if (message.includes('验证中') || message.includes('Validating')) {
      // 创建文本节点
      const textNode = document.createTextNode(message + ' ');
      errorMessageElement.appendChild(textNode);

      // 创建加载动画
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      errorMessageElement.appendChild(spinner);
    } else {
      // 普通消息
      errorMessageElement.textContent = message;

      // 如果不是验证消息，2秒后自动清除
      if (!message.includes('验证') && !message.includes('Validating')) {
        setTimeout(() => {
          errorMessageElement.textContent = '';
        }, 2000);
      }
    }
  }

  toggleApiKeyVisibility() {
    const isPassword = this.elements.apiKeyInput.type === "password";
    this.elements.apiKeyInput.type = isPassword ? "text" : "password";
    this.elements.iconSwitch.src = isPassword ? "../icons/hiddle.svg" : "../icons/show.svg";
  }

  getApiKeyValue() {
    return this.elements.apiKeyInput.value.trim();
  }

  setApiKeyValue(value) {
    this.elements.apiKeyInput.value = value;
  }

  getCustomApiUrlValue() {
    this.refreshElements();
    return this.elements.customApiUrl?.value?.trim() || '';
  }

  getModalCustomApiUrlValue() {
    this.refreshElements();
    return this.elements.customApiUrlInput?.value?.trim() || '';
  }

  setCustomApiUrlValue(value) {
    this.refreshElements();
    if (this.elements.customApiUrl) {
      // 只有当value有值或当前输入框为空时才设置值
      if (value || !this.elements.customApiUrl.value) {
        this.elements.customApiUrl.value = value;
      }
    }
  }

  setCustomApiUrlPlaceholder(value) {
    this.refreshElements();
    if (this.elements.customApiUrlInput) {
      this.elements.customApiUrlInput.placeholder = value;
    }
  }

  /**
   * 显示删除服务商确认弹窗
   */
  showDeleteProviderModal() {
    this.refreshElements();
    if (this.elements.deleteProviderModal) {
      this.elements.deleteProviderModal.classList.add('show');
      this.clearValidationMessage(this.elements.deleteProviderValidationMessage);
    }
  }

  /**
   * 隐藏删除服务商确认弹窗
   */
  hideDeleteProviderModal() {
    this.refreshElements();
    if (this.elements.deleteProviderModal) {
      this.elements.deleteProviderModal.classList.remove('show');
      this.clearValidationMessage(this.elements.deleteProviderValidationMessage);
    }
  }

  /**
   * 显示删除服务商验证消息
   * @param {string} message 消息内容
   * @param {boolean} isSuccess 是否成功
   */
  showDeleteProviderValidationMessage(message, isSuccess) {
    if (this.elements.deleteProviderValidationMessage) {
      this.elements.deleteProviderValidationMessage.textContent = message;
      this.elements.deleteProviderValidationMessage.className = 'validation-message';
      if (isSuccess) {
        this.elements.deleteProviderValidationMessage.classList.add('success');
      } else {
        this.elements.deleteProviderValidationMessage.classList.add('error');
      }
    }
  }
}