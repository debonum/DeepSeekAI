export class ModelManager {
  constructor(providerManager, storageManager, uiManager, i18nManager, tempStateManager) {
    this.providerManager = providerManager;
    this.storageManager = storageManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;
    this.tempStateManager = tempStateManager;
    this.customModelDropdown = null;
  }

  // 更新模型选项
  async updateModelOptions(provider) {
    // 首先清理现有的模型下拉菜单
    this.cleanupCustomModelDropdown();

    const modelSelect = this.uiManager.elements.modelSelect;

    // 清空现有选项前备份当前选中的值
    const currentSelectedValue = modelSelect.value;

    modelSelect.innerHTML = ''; // 清空现有选项

    // 禁用原生下拉菜单行为
    modelSelect.style.pointerEvents = 'none';

    // 确保父容器可以接收点击事件
    const modelContainer = modelSelect.parentElement;
    if (modelContainer && modelContainer.classList.contains('custom-select-container')) {
      modelContainer.style.pointerEvents = 'auto';
      modelContainer.style.cursor = 'pointer';
    }

    // 从ProviderManager获取模型列表
    const models = await this.providerManager.getModels(provider);

    // 获取保存的模型设置
    const settings = await this.storageManager.getSettings();

    // 优先使用之前选中的值，然后是settings中的值，最后是默认值
    const currentModel = currentSelectedValue || settings.model;

    // 将模型列表转换为选项格式
    const allModels = models.map(model => ({
      value: model.value,
      label: model.label
    }));

    // 填充模型下拉框
    allModels.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      modelSelect.appendChild(optionElement);
    });

    // 当没有模型时，设置一个空占位符
    if (allModels.length === 0) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '';
      emptyOption.disabled = true;
      emptyOption.selected = true;
      modelSelect.appendChild(emptyOption);
    } else {
      // 设置当前选中的模型
      if (currentModel && allModels.some(opt => opt.value === currentModel)) {
        modelSelect.value = currentModel;
      } else {
        // 如果没有保存的值或值无效，使用第一个选项并保存
        modelSelect.value = allModels[0]?.value || '';
        this.storageManager.saveModel(modelSelect.value);
      }
    }

    // 创建自定义下拉菜单，支持模型删除功能
    this.createCustomModelDropdown(provider, allModels, currentModel);

    return allModels;
  }

  // 创建自定义模型下拉菜单
  createCustomModelDropdown(provider, options, currentModel) {
    const modelSelect = document.getElementById('model');
    const modelContainer = modelSelect.closest('.custom-select-container');
    let customDropdown = document.getElementById('custom-model-dropdown');

    // 如果下拉菜单不存在，创建一个新的
    if (!customDropdown) {
      customDropdown = document.createElement('div');
      customDropdown.id = 'custom-model-dropdown';
      customDropdown.className = 'custom-select-dropdown';

      // 将下拉菜单添加到容器中
      if (modelContainer) {
        modelContainer.appendChild(customDropdown);
      } else {
        modelSelect.insertAdjacentElement('afterend', customDropdown);
      }
    }

    // 保存引用以便后续清理
    this.customModelDropdown = customDropdown;

    // 清空内容并设置初始状态
    customDropdown.innerHTML = '';
    customDropdown.style.display = 'none';

    // 确保modelSelect的样式设置正确
    modelSelect.style.pointerEvents = 'none';
    modelSelect.style.appearance = 'none';
    modelSelect.style.webkitAppearance = 'none';
    modelSelect.style.mozAppearance = 'none';

    // 确保父容器可以接收点击事件
    if (modelContainer) {
      modelContainer.style.pointerEvents = 'auto';
      modelContainer.style.cursor = 'pointer';

      // 移除之前可能存在的点击事件
      modelContainer.removeEventListener('click', this.modelSelectClickListener);

      // 为容器添加点击事件
      this.modelSelectClickListener = (e) => {
        e.stopPropagation();
        this.updateDropdownPosition(modelSelect, customDropdown);

        // 切换下拉菜单显示状态
        const isVisible = customDropdown.style.display === 'block';

        // 隐藏所有其他下拉菜单
        document.querySelectorAll('.custom-select-dropdown').forEach(dropdown => {
          if (dropdown !== customDropdown) {
            dropdown.style.display = 'none';
          }
        });

        customDropdown.style.display = isVisible ? 'none' : 'block';
      };

      modelContainer.addEventListener('click', this.modelSelectClickListener);
    }

    // 为每个选项创建元素
    options.forEach(option => {
      const optionElement = document.createElement('div');
      optionElement.className = 'custom-select-option';
      if (option.value === currentModel) {
        optionElement.classList.add('selected');
      }

      // 创建选项内容容器
      const optionContent = document.createElement('div');
      optionContent.className = 'option-content';

      // 添加选项文本
      const optionText = document.createElement('span');
      optionText.textContent = option.label;
      optionContent.appendChild(optionText);

      // 添加删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-model-btn';
      deleteBtn.title = this.i18nManager.getTranslation('deleteModelBtnTitle');
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>';

      // 为删除按钮添加事件监听器
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止冒泡，避免触发选择模型
        customDropdown.style.display = 'none'; // 隐藏下拉菜单
        this.showDeleteModelDialog(provider, option.value, option.label);
      });

      optionContent.appendChild(deleteBtn);
      optionElement.appendChild(optionContent);

      // 为选项添加点击事件
      optionElement.addEventListener('click', () => {
        // 设置选中值
        modelSelect.value = option.value;
        customDropdown.style.display = 'none';

        // 更新选中样式
        document.querySelectorAll('.custom-select-option').forEach(el => {
          el.classList.remove('selected');
        });
        optionElement.classList.add('selected');

        // 触发change事件
        modelSelect.dispatchEvent(new Event('change'));
      });

      customDropdown.appendChild(optionElement);
    });

    // 添加自定义模型选项 - deepseek不需要添加模型，其他服务商才显示
    if (provider !== 'deepseek') {
      const addCustomModel = document.createElement('div');
      addCustomModel.className = 'custom-select-option add-model-option';
      // 每次都重新获取国际化翻译
      const addModelText = this.i18nManager.getTranslation('addModel');
      addCustomModel.textContent = '+ ' + addModelText;
      addCustomModel.style.color = 'var(--accent-color)';
      addCustomModel.style.textAlign = 'center';
      addCustomModel.style.fontWeight = 'bold';
      addCustomModel.style.padding = '10px';
      addCustomModel.style.borderTop = options.length > 0 ? '1px solid var(--border-color)' : 'none';
      addCustomModel.addEventListener('click', () => {
        customDropdown.style.display = 'none';
        this.showAddModelDialog();
      });

      customDropdown.appendChild(addCustomModel);
    }

    // 下拉菜单点击事件处理
    const dropdownClickListener = (e) => {
      e.stopPropagation();
    };

    customDropdown.addEventListener('click', dropdownClickListener);

    // 更新下拉菜单定位
    const updateDropdownPosition = () => {
      this.updateDropdownPosition(modelSelect, customDropdown);
    };

    // 文档点击事件，用于关闭下拉菜单
    const documentClickListener = (e) => {
      if (e.target !== modelSelect && !modelSelect.contains(e.target) &&
          e.target !== customDropdown && !customDropdown.contains(e.target) &&
          e.target !== modelContainer && !modelContainer.contains(e.target)) {
        customDropdown.style.display = 'none';
      }
    };

    // 添加事件监听器
    document.addEventListener('click', documentClickListener);

    // 保存事件监听器引用，以便后续清理
    this.documentClickListener = documentClickListener;
    this.dropdownClickListener = dropdownClickListener;
  }

  // 辅助方法：更新下拉菜单位置
  updateDropdownPosition(selectElement, dropdownElement) {
    if (selectElement && dropdownElement) {
      const selectRect = selectElement.getBoundingClientRect();
      dropdownElement.style.width = `${Math.max(selectRect.width, 130)}px`;
      dropdownElement.style.left = '0';
      dropdownElement.style.top = `${selectRect.height}px`;
    }
  }

  // 清理自定义模型下拉菜单
  cleanupCustomModelDropdown() {
    try {
      // 移除容器点击事件监听器
      if (this.modelSelectClickListener) {
        const modelContainer = document.querySelector('#model')?.closest('.custom-select-container');
        if (modelContainer) {
          modelContainer.removeEventListener('click', this.modelSelectClickListener);
        }
      }

      // 移除文档点击事件监听器
      if (this.documentClickListener) {
        document.removeEventListener('click', this.documentClickListener);
      }

      // 移除下拉菜单点击事件监听器
      if (this.customModelDropdown && this.dropdownClickListener) {
        this.customModelDropdown.removeEventListener('click', this.dropdownClickListener);
      }

      // 移除所有选项和删除按钮的事件监听器
      const customDropdown = document.getElementById('custom-model-dropdown');
      if (customDropdown) {
        // 获取所有选项
        const options = customDropdown.querySelectorAll('.custom-select-option');
        options.forEach(option => {
          // 移除选项点击事件
          const newOption = option.cloneNode(true);
          option.parentNode.replaceChild(newOption, option);
        });

        // 获取所有删除按钮并移除事件监听器
        const deleteButtons = customDropdown.querySelectorAll('.delete-model-btn');
        deleteButtons.forEach(button => {
          const newButton = button.cloneNode(true);
          if (button.parentNode) {
            button.parentNode.replaceChild(newButton, button);
          }
        });

        // 清空内容
        customDropdown.innerHTML = '';
        customDropdown.style.display = 'none';
      }

      // 清空引用
      this.modelSelectClickListener = null;
      this.documentClickListener = null;
      this.dropdownClickListener = null;
      this.customModelDropdown = null;
    } catch (error) {
      console.error('清理模型下拉菜单错误:', error);
    }
  }

  // 显示删除模型确认弹窗
  showDeleteModelDialog(provider, modelId, modelName) {
    const deleteModelModal = document.getElementById('deleteModelModal');
    const deleteModelConfirmText = document.getElementById('deleteModelConfirmText');
    const confirmDeleteModelButton = document.getElementById('confirmDeleteModelButton');
    const cancelDeleteModelButton = document.getElementById('cancelDeleteModelButton');
    const closeDeleteModelModal = document.getElementById('closeDeleteModelModal');
    const deleteModelValidationMessage = document.getElementById('deleteModelValidationMessage');
    const deleteModelTitle = document.getElementById('deleteModelTitle');

    if (!deleteModelModal) return;

    // 设置标题
    if (deleteModelTitle) {
      deleteModelTitle.textContent = this.i18nManager.getTranslation('deleteModel');
    }

    // 设置确认文本
    if (deleteModelConfirmText) {
      const confirmText = this.i18nManager.getTranslation('confirmDeleteModel').replace('{model}', modelName);
      deleteModelConfirmText.textContent = confirmText;
    }

    // 设置确认按钮文本
    if (confirmDeleteModelButton) {
      confirmDeleteModelButton.textContent = this.i18nManager.getTranslation('deleteModel');
    }

    // 清除验证消息
    if (deleteModelValidationMessage) {
      deleteModelValidationMessage.innerHTML = '';
      deleteModelValidationMessage.className = 'validation-message';
    }

    // 显示弹窗
    deleteModelModal.classList.add('show');

    // 处理确认按钮点击
    const handleConfirm = async () => {
      await this.handleDeleteModel(modelId, provider);
    };

    // 处理取消按钮点击
    const handleClose = () => {
      deleteModelModal.classList.remove('show');

      // 移除事件监听器
      if (confirmDeleteModelButton) {
        confirmDeleteModelButton.removeEventListener('click', handleConfirm);
      }

      if (cancelDeleteModelButton) {
        cancelDeleteModelButton.removeEventListener('click', handleClose);
      }

      if (closeDeleteModelModal) {
        closeDeleteModelModal.removeEventListener('click', handleClose);
      }

      document.removeEventListener('keydown', handleEsc);
    };

    // 处理ESC键关闭弹窗
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // 添加事件监听器
    if (confirmDeleteModelButton) {
      confirmDeleteModelButton.addEventListener('click', handleConfirm);
    }

    if (cancelDeleteModelButton) {
      cancelDeleteModelButton.addEventListener('click', handleClose);
    }

    if (closeDeleteModelModal) {
      closeDeleteModelModal.addEventListener('click', handleClose);
    }

    document.addEventListener('keydown', handleEsc);
  }

  // 显示添加模型弹窗
  showAddModelDialog() {
    const provider = document.getElementById('provider')?.value;

    // DeepSeek不需要添加自定义模型，直接返回
    if (provider === 'deepseek') {
      return;
    }

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

          // 更新显示的文本
          const selectedOption = document.querySelector('#model-container .selected-text');
          if (selectedOption) {
            selectedOption.textContent = modelName;
          }
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