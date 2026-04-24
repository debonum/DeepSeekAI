import {
  getDeepSeekModelLabel,
  resolveDeepSeekModel,
} from "./deepseekModelConfig.js";

export class ModelManager {
  constructor(providerManager, storageManager, uiManager, i18nManager, tempStateManager) {
    this.providerManager = providerManager;
    this.storageManager = storageManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;
    this.tempStateManager = tempStateManager;
    this.modelPickerEscHandler = null;
    this.modelPickerState = {
      provider: "deepseek",
      options: [],
      currentModel: "",
      searchTerm: "",
    };
  }

  // 更新模型选项
  async updateModelOptions(provider) {
    this.cleanupCustomModelDropdown();
    this.uiManager.refreshElements();

    const modelSelect = this.uiManager.elements.modelSelect;

    const currentSelectedValue = modelSelect.value;
    modelSelect.innerHTML = "";

    const models = await this.providerManager.getModels(provider);
    const settings = await this.storageManager.getSettings();
    const currentModel = currentSelectedValue || settings.model;
    const allModels = models.map((model) => ({
      value: model.value,
      label: model.label,
    }));

    if (
      provider === "deepseek" &&
      this.shouldPreserveDeepSeekModel(currentModel, allModels)
    ) {
      allModels.unshift({
        value: currentModel,
        label: getDeepSeekModelLabel(currentModel),
      });
    }

    allModels.forEach((option) => {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      modelSelect.appendChild(optionElement);
    });

    if (allModels.length === 0) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "";
      emptyOption.disabled = true;
      emptyOption.selected = true;
      modelSelect.appendChild(emptyOption);
    } else {
      if (currentModel && allModels.some((opt) => opt.value === currentModel)) {
        modelSelect.value = currentModel;
      } else {
        modelSelect.value = allModels[0]?.value || "";
        this.storageManager.saveModel(modelSelect.value);
      }
    }

    this.syncModelPicker(provider, allModels, modelSelect.value);
    return allModels;
  }

  syncModelPicker(provider, options, currentModel) {
    this.modelPickerState = {
      provider,
      options,
      currentModel,
      searchTerm: "",
    };

    const addButton = this.uiManager.elements.modelPickerAddButton;
    const footer = this.uiManager.elements.modelPickerFooter;
    const isDeepSeek = provider === "deepseek";

    if (footer) {
      footer.hidden = isDeepSeek;
    }

    if (addButton) {
      addButton.hidden = isDeepSeek;
      addButton.disabled = isDeepSeek;
    }

    const searchInput = this.uiManager.elements.modelPickerSearch;
    if (searchInput) {
      searchInput.value = "";
    }

    this.updateModelPickerTrigger();
    this.renderModelPickerList();
  }

  shouldPreserveDeepSeekModel(modelValue, options) {
    if (!modelValue || options.some((option) => option.value === modelValue)) {
      return false;
    }

    const normalizedModel = typeof modelValue === "string" ? modelValue.trim() : "";
    if (!normalizedModel) {
      return false;
    }

    return resolveDeepSeekModel(normalizedModel, "").isKnownModel === true;
  }

  setCurrentModel(modelValue) {
    this.modelPickerState.currentModel = modelValue || "";
    this.updateModelPickerTrigger();
    this.renderModelPickerList();
  }

  openModelPicker() {
    this.uiManager.refreshElements();

    const modal = this.uiManager.elements.modelPickerModal;
    if (!modal) return;

    this.modelPickerState.searchTerm = "";
    if (this.uiManager.elements.modelPickerSearch) {
      this.uiManager.elements.modelPickerSearch.value = "";
    }

    this.renderModelPickerList();
    modal.classList.add("show");
    this.uiManager.elements.modelPickerTrigger?.setAttribute("aria-expanded", "true");

    if (this.modelPickerEscHandler) {
      document.removeEventListener("keydown", this.modelPickerEscHandler);
    }

    this.modelPickerEscHandler = (event) => {
      if (event.key === "Escape") {
        this.closeModelPicker();
      }
    };

    document.addEventListener("keydown", this.modelPickerEscHandler);
    window.requestAnimationFrame(() => {
      this.uiManager.elements.modelPickerSearch?.focus();
    });
  }

  closeModelPicker() {
    this.uiManager.elements.modelPickerModal?.classList.remove("show");
    this.uiManager.elements.modelPickerTrigger?.setAttribute("aria-expanded", "false");

    if (this.modelPickerEscHandler) {
      document.removeEventListener("keydown", this.modelPickerEscHandler);
      this.modelPickerEscHandler = null;
    }
  }

  handleModelPickerSearch(keyword = "") {
    this.modelPickerState.searchTerm = keyword.trim();
    this.renderModelPickerList();
  }

  handleModelPickerAdd() {
    if (this.modelPickerState.provider === "deepseek") {
      return;
    }

    this.closeModelPicker();
    this.showAddModelDialog();
  }

  updateModelPickerTrigger() {
    const selectedOption = this.modelPickerState.options.find(
      (option) => option.value === this.modelPickerState.currentModel
    );
    const label = selectedOption?.label || this.i18nManager.getTranslation("modelPickerTriggerPlaceholder");

    if (this.uiManager.elements.modelPickerTriggerLabel) {
      this.uiManager.elements.modelPickerTriggerLabel.textContent = label;
    }

    const trigger = this.uiManager.elements.modelPickerTrigger;
    if (trigger) {
      trigger.classList.toggle("is-empty", !selectedOption);
      trigger.title = selectedOption ? label : "";
    }
  }

  renderModelPickerList() {
    const listElement = this.uiManager.elements.modelPickerList;
    const emptyElement = this.uiManager.elements.modelPickerEmptyState;

    if (!listElement || !emptyElement) return;

    listElement.innerHTML = "";

    const { provider, options, currentModel, searchTerm } = this.modelPickerState;
    const keyword = searchTerm.toLowerCase();
    const filteredOptions = options.filter((option) =>
      !keyword || `${option.label} ${option.value}`.toLowerCase().includes(keyword)
    );

    emptyElement.textContent = this.i18nManager.getTranslation("modelPickerEmptyState");
    emptyElement.hidden = filteredOptions.length > 0;
    listElement.hidden = filteredOptions.length === 0;

    filteredOptions.forEach((option) => {
      listElement.appendChild(
        this.createModelPickerItem(option, provider, option.value === currentModel)
      );
    });
  }

  createModelPickerItem(option, provider, isSelected) {
    const item = document.createElement("div");
    item.className = "model-picker-item";
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-selected", String(isSelected));

    if (isSelected) {
      item.classList.add("is-selected");
    }

    item.addEventListener("click", () => this.selectModel(option.value));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.selectModel(option.value);
      }
    });

    const content = document.createElement("div");
    content.className = "model-picker-item-main";

    const topRow = document.createElement("div");
    topRow.className = "model-picker-item-top";

    const title = document.createElement("div");
    title.className = "model-picker-item-title";
    title.textContent = option.label;
    topRow.appendChild(title);

    const badges = this.getModelBadges(option, provider);
    if (badges.length > 0) {
      const badgeRow = document.createElement("div");
      badgeRow.className = "model-picker-badge-row";
      badges.forEach((badgeText) => {
        const badge = document.createElement("span");
        badge.className = "model-picker-badge";
        badge.textContent = badgeText;
        badgeRow.appendChild(badge);
      });
      topRow.appendChild(badgeRow);
    }

    const subtitle = document.createElement("div");
    subtitle.className = "model-picker-item-subtitle";
    subtitle.textContent = option.value;

    content.append(topRow, subtitle);

    const actions = document.createElement("div");
    actions.className = "model-picker-actions";

    const checkmark = document.createElement("span");
    checkmark.className = "model-picker-check";
    checkmark.textContent = "✓";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "model-picker-icon-button";
    deleteButton.title = this.i18nManager.getTranslation("deleteModelBtnTitle");
    deleteButton.setAttribute("aria-label", this.i18nManager.getTranslation("deleteModelBtnTitle"));
    deleteButton.innerHTML =
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>';
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      this.closeModelPicker();
      this.showDeleteModelDialog(provider, option.value, option.label);
    });

    actions.append(checkmark, deleteButton);
    item.append(content, actions);

    return item;
  }

  getModelBadges(option, provider) {
    const badges = [];
    const isDefaultModel = this.providerManager.isDefaultModel(provider, option.value);

    if (!isDefaultModel) {
      badges.push(this.i18nManager.getTranslation("modelPickerCustomBadge"));
    }

    if (provider === "deepseek" && resolveDeepSeekModel(option.value, option.value).isLegacyAlias) {
      badges.push(this.i18nManager.getTranslation("modelPickerLegacyBadge"));
    }

    return badges;
  }

  selectModel(modelValue) {
    const modelSelect = this.uiManager.elements.modelSelect;
    if (!modelSelect) return;

    modelSelect.value = modelValue;
    this.setCurrentModel(modelValue);
    this.closeModelPicker();
    modelSelect.dispatchEvent(new Event("change"));
  }

  cleanupCustomModelDropdown() {
    try {
      this.closeModelPicker();
      if (this.uiManager.elements.modelPickerSearch) {
        this.uiManager.elements.modelPickerSearch.value = "";
      }
      this.modelPickerState.searchTerm = "";
    } catch (error) {
      console.error("清理模型选择器错误:", error);
    }
  }

  // 显示删除模型确认弹窗
  showDeleteModelDialog(provider, modelId, modelName) {
    this.closeModelPicker();

    const deleteModelModal = document.getElementById("deleteModelModal");
    const deleteModelConfirmText = document.getElementById("deleteModelConfirmText");
    const confirmDeleteModelButton = document.getElementById("confirmDeleteModelButton");
    const cancelDeleteModelButton = document.getElementById("cancelDeleteModelButton");
    const closeDeleteModelModal = document.getElementById("closeDeleteModelModal");
    const deleteModelValidationMessage = document.getElementById("deleteModelValidationMessage");
    const deleteModelTitle = document.getElementById("deleteModelTitle");

    if (!deleteModelModal) return;

    if (deleteModelTitle) {
      deleteModelTitle.textContent = this.i18nManager.getTranslation("deleteModel");
    }

    if (deleteModelConfirmText) {
      const confirmText = this.i18nManager.getTranslation("confirmDeleteModel").replace("{model}", modelName);
      deleteModelConfirmText.textContent = confirmText;
    }

    if (confirmDeleteModelButton) {
      confirmDeleteModelButton.textContent = this.i18nManager.getTranslation("deleteModel");
    }

    if (deleteModelValidationMessage) {
      deleteModelValidationMessage.innerHTML = "";
      deleteModelValidationMessage.className = "validation-message";
    }

    deleteModelModal.classList.add("show");

    const handleConfirm = async () => {
      await this.handleDeleteModel(modelId, provider);
    };

    const handleClose = () => {
      deleteModelModal.classList.remove("show");

      if (confirmDeleteModelButton) {
        confirmDeleteModelButton.removeEventListener("click", handleConfirm);
      }

      if (cancelDeleteModelButton) {
        cancelDeleteModelButton.removeEventListener("click", handleClose);
      }

      if (closeDeleteModelModal) {
        closeDeleteModelModal.removeEventListener("click", handleClose);
      }

      document.removeEventListener("keydown", handleEsc);
    };

    const handleEsc = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (confirmDeleteModelButton) {
      confirmDeleteModelButton.addEventListener("click", handleConfirm);
    }

    if (cancelDeleteModelButton) {
      cancelDeleteModelButton.addEventListener("click", handleClose);
    }

    if (closeDeleteModelModal) {
      closeDeleteModelModal.addEventListener("click", handleClose);
    }

    document.addEventListener("keydown", handleEsc);
  }

  // 显示添加模型弹窗
  showAddModelDialog() {
    const provider = document.getElementById('provider')?.value;

    // DeepSeek不需要添加自定义模型，直接返回
    if (provider === 'deepseek') {
      return;
    }

    this.closeModelPicker();

    const addModelModal = document.getElementById('addModelModal');
    const modelApiId = document.getElementById('modelApiId');
    const modelDisplayName = document.getElementById('modelDisplayName');
    const modelApiKey = document.getElementById('modelApiKey');
    const modelApiKeyLabel = document.getElementById('modelApiKeyLabel');
    const modelValidationMessage = document.getElementById('modelValidationMessage');

    if (!addModelModal) return;

    // 首先尝试恢复临时状态
    const tempState = this.tempStateManager?.getTempState?.(this.tempStateManager.constructor.TYPES.ADD_MODEL);

    if (tempState) {
      console.log('🔄 检测到模型添加的临时状态，正在恢复...');
      // 恢复表单数据
      this.tempStateManager.restoreModelFormData(tempState);
    } else {
      // 如果没有临时状态，清空输入框（但保留已有的值避免复制粘贴丢失）
      if (modelApiId && !modelApiId.value) modelApiId.value = '';
      if (modelDisplayName && !modelDisplayName.value) modelDisplayName.value = '';
      if (modelApiKey && !modelApiKey.value) modelApiKey.value = '';
    }

    // 设置输入框的placeholder
    if (modelApiId) modelApiId.placeholder = this.i18nManager.getTranslation('modelApiIdPlaceholder');
    if (modelDisplayName) modelDisplayName.placeholder = this.i18nManager.getTranslation('modelDisplayNamePlaceholder');
    if (modelApiKey) modelApiKey.placeholder = this.i18nManager.getTranslation('customProviderApiKeyPlaceholder');

    // 清除验证消息
    if (modelValidationMessage) {
      modelValidationMessage.innerHTML = '';
      modelValidationMessage.className = 'validation-message';
    }

    // 显示弹窗
    addModelModal.classList.add('show');

    // 安装表单监听器用于自动保存临时状态
    if (this.tempStateManager) {
      setTimeout(() => {
        this.tempStateManager.installFormListeners(this.tempStateManager.constructor.TYPES.ADD_MODEL);
      }, 100); // 稍微延迟以确保DOM已准备好
    }

    // 根据是否已保存 Provider 的 API Key 来决定是否显示 Key 输入
    let currentProvider = document.getElementById('provider')?.value;
    const hintedProvider = document.body?.dataset?.requireModelKeyProvider;
    if (hintedProvider) {
      currentProvider = hintedProvider;
      try { delete document.body.dataset.requireModelKeyProvider; } catch (e) {}
    }
    if (currentProvider && modelApiKey && modelApiKeyLabel) {
      this.providerManager.getApiKey(currentProvider).then((key) => {
        const hasSavedKey = !!(key && key.trim());
        // 若已有 Key，隐藏弹窗中的 Key 输入；否则显示并聚焦
        modelApiKey.style.display = hasSavedKey ? 'none' : '';
        modelApiKeyLabel.style.display = hasSavedKey ? 'none' : '';
        if (!hasSavedKey && (!modelApiKey.value || modelApiKey.value.trim() === '')) {
          modelApiKey.focus();
        }
      }).catch(() => {
        // 发生错误时保持可见，便于用户填写
        modelApiKey.style.display = '';
        modelApiKeyLabel.style.display = '';
      });
    }

    // 处理ESC键关闭弹窗
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.hideAddModelDialog();
      }
    };

    document.addEventListener('keydown', handleEsc);

    // 保存ESC处理器引用以便清理
    addModelModal._escHandler = handleEsc;
  }

  // 隐藏添加模型弹窗
  hideAddModelDialog() {
    const addModelModal = document.getElementById('addModelModal');
    if (!addModelModal) return;

    // 移除ESC事件监听器
    if (addModelModal._escHandler) {
      document.removeEventListener('keydown', addModelModal._escHandler);
      delete addModelModal._escHandler;
    }

    // 移除表单监听器
    if (this.tempStateManager) {
      this.tempStateManager.removeFormListeners(this.tempStateManager.constructor.TYPES.ADD_MODEL);
    }

    addModelModal.classList.remove('show');
  }

  // 处理删除模型
  async handleDeleteModel(modelId, provider) {
    try {
      // 禁用删除按钮
      const confirmDeleteModelButton = document.getElementById('confirmDeleteModelButton');
      if (confirmDeleteModelButton) {
        confirmDeleteModelButton.disabled = true;
      }

      // 显示加载状态
      const validationMessage = document.getElementById('deleteModelValidationMessage');
      if (validationMessage) {
        validationMessage.innerHTML = `<span class="spinner"></span>${this.i18nManager.getTranslation('deleting')}`;
        validationMessage.className = 'validation-message success';
      }

      // 删除模型
      const success = await this.providerManager.deleteModel(provider, modelId);

      if (success) {
        // 显示成功消息
        if (validationMessage) {
          validationMessage.innerHTML = this.i18nManager.getTranslation('deleteModelSuccess');
          validationMessage.className = 'validation-message success';
        }

        // 获取更新后的模型列表
        const updatedModels = await this.providerManager.getModels(provider);

        // 当前选中的模型
        const currentModel = this.uiManager.elements.modelSelect.value;

        // 如果当前选中的是被删除的模型，或者没有可用模型
        if (currentModel === modelId || updatedModels.length === 0) {
          // 如果有可用模型，切换到第一个
          if (updatedModels.length > 0) {
            await this.storageManager.saveModel(updatedModels[0].value);
          } else {
            // 如果没有可用模型，置空
            await this.storageManager.saveModel('');
          }
        }

        // 简单直接的解决方案：删除成功后重新加载页面
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // 恢复删除按钮状态
        if (confirmDeleteModelButton) {
          confirmDeleteModelButton.disabled = false;
        }

        // 显示错误消息
        if (validationMessage) {
          validationMessage.innerHTML = this.i18nManager.getTranslation('deleteModelError');
          validationMessage.className = 'validation-message error';
        }
      }
    } catch (error) {
      console.error('删除模型错误:', error);

      // 恢复删除按钮状态
      const confirmDeleteModelButton = document.getElementById('confirmDeleteModelButton');
      if (confirmDeleteModelButton) {
        confirmDeleteModelButton.disabled = false;
      }

      // 显示错误消息
      const validationMessage = document.getElementById('deleteModelValidationMessage');
      if (validationMessage) {
        validationMessage.innerHTML = this.i18nManager.getTranslation('deleteModelError');
        validationMessage.className = 'validation-message error';
      }
    }
  }

  // 处理保存模型
  async handleSaveModel() {
    const modelApiId = document.getElementById('modelApiId');
    const modelDisplayName = document.getElementById('modelDisplayName');
    const provider = document.getElementById('provider')?.value;
    const modelApiKeyInput = document.getElementById('modelApiKey');
    const saveModelButton = document.getElementById('saveModelButton');
    const modelValidationMessage = document.getElementById('modelValidationMessage');

    if (!modelApiId || !modelDisplayName || !provider || !saveModelButton || !modelValidationMessage) {
      return;
    }

    const modelId = modelApiId.value;
    const modelName = modelDisplayName.value;

    // 清除之前的验证消息
    modelValidationMessage.innerHTML = '';
    modelValidationMessage.className = 'validation-message';

    // 检查必填字段
    if (!modelId) {
      modelValidationMessage.innerHTML = this.i18nManager.getTranslation('modelIdEmpty');
      modelValidationMessage.classList.add('error');
      return;
    }

    if (!modelName) {
      modelValidationMessage.innerHTML = this.i18nManager.getTranslation('modelNameEmpty');
      modelValidationMessage.classList.add('error');
      return;
    }

    // 禁用保存按钮并显示加载状态
    saveModelButton.disabled = true;
    modelValidationMessage.innerHTML = `<span class="spinner"></span>${this.i18nManager.getTranslation('validating')}`;
    modelValidationMessage.classList.add('info');

    try {
      // 先检查 provider 是否已有保存的 Key
      const savedKey = await this.providerManager.getApiKey(provider);
      // 优先使用已保存的 Key；若没有，再使用弹窗里填写的 Key；若仍没有，尝试读取主页面输入框当前值
      let apiKey = savedKey || modelApiKeyInput?.value?.trim() || this.uiManager?.getApiKeyValue?.() || '';
      if (!apiKey) {
        // 若仍无 key，直接提示并留在弹窗，避免打断流程
        modelValidationMessage.innerHTML = this.i18nManager.getTranslation('apiKeyEmpty');
        modelValidationMessage.classList.remove('info');
        modelValidationMessage.classList.add('error');
        saveModelButton.disabled = false;
        return;
      }

      // 验证模型与 Key 是否可用（一次请求校验二者），并解析失败原因
      const result = await this.providerManager.validateApiKey(provider, apiKey, modelId);

      if (!result?.ok) {
        // 验证失败 - 统一提示
        modelValidationMessage.innerHTML = this.i18nManager.getTranslation('checkModelOrKeyOrPermission');
        modelValidationMessage.classList.remove('info');
        modelValidationMessage.classList.add('error');
        saveModelButton.disabled = false;
        return;
      }

      // 验证成功，继续保存模型
      modelValidationMessage.innerHTML = `<span class="spinner"></span>${this.i18nManager.getTranslation('saving')}`;
      modelValidationMessage.classList.remove('info', 'error');
      modelValidationMessage.classList.add('success');

      // 创建新模型对象
      const newModel = {
        value: modelId,
        label: modelName
      };

      // 添加模型到服务商
      const success = await this.providerManager.addModel(provider, newModel);

      if (success) {
        // 保存 Key（若弹窗里填写了 key，以弹窗为准覆盖写入；否则保留已保存的 key）
        if (modelApiKeyInput?.value?.trim()) {
          await this.providerManager.saveApiKey(provider, modelApiKeyInput.value.trim());
        } else if (!savedKey && apiKey) {
          await this.providerManager.saveApiKey(provider, apiKey);
        }
        // 保存并切换到新添加的模型
        await this.storageManager.saveModel(modelId);

        // 立即更新UI选择框的值
        if (this.uiManager.elements.modelSelect) {
          this.uiManager.elements.modelSelect.value = modelId;
          this.setCurrentModel(modelId);
        }

        // 清除临时状态（验证成功，数据已正式保存）
        if (this.tempStateManager) {
          this.tempStateManager.clearTempState(this.tempStateManager.constructor.TYPES.ADD_MODEL);
        }

        // 显示成功消息
        modelValidationMessage.innerHTML = this.i18nManager.getTranslation('modelSaveSuccess');
        modelValidationMessage.classList.remove('error', 'info');
        modelValidationMessage.classList.add('success');

        // 延迟关闭弹窗并更新模型列表
        setTimeout(async () => {
          this.hideAddModelDialog();
          await this.updateModelOptions(provider);
        }, 1500);
      } else {
        // 显示错误消息
        modelValidationMessage.innerHTML = this.i18nManager.getTranslation('modelSaveError');
        modelValidationMessage.classList.remove('success', 'info');
        modelValidationMessage.classList.add('error');

        // 恢复保存按钮状态
        saveModelButton.disabled = false;
      }
    } catch (error) {
      console.error('保存模型错误:', error);

      // 显示错误消息
      modelValidationMessage.innerHTML = this.i18nManager.getTranslation('modelSaveError');
      modelValidationMessage.classList.remove('success', 'info');
      modelValidationMessage.classList.add('error');

      // 恢复保存按钮状态
      saveModelButton.disabled = false;
    }
  }
}
