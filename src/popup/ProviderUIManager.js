export class ProviderUIManager {
  constructor(providerManager, storageManager, uiManager, i18nManager) {
    this.providerManager = providerManager;
    this.storageManager = storageManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;
    this.customProviderDropdown = null;
  }

  // 更新服务商UI
  async updateProviderUI(provider) {
    console.log(`开始更新服务商UI: ${provider}`);

    // 显示/隐藏特定的UI元素
    const isDeepseek = provider === 'deepseek';
    const isCustom = provider.startsWith('custom_');
    const isAddCustom = provider === 'custom';

    // 更新获取API Key的链接
    const apiKeyLink = document.getElementById('apiKeyLink');
    if (apiKeyLink) {
      // 如果是自定义服务商或添加自定义服务商选项，隐藏链接
      if (isCustom || isAddCustom) {
        apiKeyLink.style.display = 'none';
      } else {
        apiKeyLink.style.display = 'inline';
        // 获取服务商的API Key链接
        const linkUrl = this.providerManager.getApiKeyLink(provider);
        if (linkUrl) {
          apiKeyLink.href = linkUrl;
        } else {
          // 默认使用deepseek的链接
          apiKeyLink.href = this.providerManager.getApiKeyLink('deepseek');
        }
      }
    }

    // 清空API密钥输入框
    this.uiManager.setApiKeyValue('');

    // 更新API密钥
    await this.loadApiKey(provider);

    // 只更新自定义API URL的placeholder，不修改输入框的值
    try {
      // 获取默认URL
      const defaultUrl = this.providerManager.getDefaultApiUrl(provider);

      // 只设置placeholder，不修改输入框的值
      if (this.uiManager.elements.customApiUrl) {
        this.uiManager.elements.customApiUrl.placeholder = defaultUrl || '';
      }
    } catch (error) {
      console.error('设置API URL placeholder出错:', error);
    }

    console.log(`服务商UI更新完成: ${provider}`);
  }

  // 加载自定义API URL
  async loadCustomApiUrl(provider) {
    try {
      // 确保元素已正确获取
      this.uiManager.refreshElements();

      // 获取自定义API URL和默认URL
      const customApiUrl = await this.providerManager.getCustomApiUrl(provider);
      const defaultUrl = this.providerManager.getDefaultApiUrl(provider);

      // 设置默认URL作为placeholder
      if (this.uiManager.elements.customApiUrl) {
        // 只设置placeholder，不修改输入框的值
        this.uiManager.elements.customApiUrl.placeholder = defaultUrl || '';
      }

      // 如果有自定义URL且当前输入框为空，才设置到输入框
      if (customApiUrl && this.uiManager.elements.customApiUrl && !this.uiManager.elements.customApiUrl.value) {
        this.uiManager.elements.customApiUrl.value = customApiUrl;
      }

      console.log(`加载${provider}的API URL: 自定义=${customApiUrl}, 默认=${defaultUrl}`);
    } catch (error) {
      console.error('加载自定义API URL出错:', error);
    }
  }

  // 加载API密钥
  async loadApiKey(provider) {
    try {
      // 获取API密钥
      const apiKey = await this.providerManager.getApiKey(provider);

      // 清空输入框
      this.uiManager.setApiKeyValue('');

      // 设置API密钥到输入框
      if (apiKey) {
        this.uiManager.setApiKeyValue(apiKey);
      }

      console.log(`加载${provider}的API密钥: ${apiKey ? '已设置' : '未设置'}`);
    } catch (error) {
      console.error('加载API密钥出错:', error);
    }
  }

  // 创建自定义服务商下拉菜单
  async createCustomProviderDropdown(currentProvider) {
    // 先清理旧的下拉菜单
    this.cleanupCustomProviderDropdown();

    const providerSelect = document.getElementById('provider');
    const providerContainer = providerSelect.closest('.custom-select-container');

    // 移除可能存在的旧下拉菜单元素
    const oldDropdown = document.getElementById('custom-provider-dropdown');
    if (oldDropdown) {
      oldDropdown.remove();
    }

    let customDropdown = document.createElement('div');
    customDropdown.id = 'custom-provider-dropdown';
    customDropdown.className = 'custom-select-dropdown';

    // 将下拉菜单添加到容器中
    if (providerContainer) {
      providerContainer.appendChild(customDropdown);
    } else {
      providerSelect.insertAdjacentElement('afterend', customDropdown);
    }

    // 保存引用以便后续清理
    this.customProviderDropdown = customDropdown;

    // 完全禁用原生下拉菜单
    providerSelect.style.pointerEvents = 'none';
    providerSelect.style.appearance = 'none';
    providerSelect.style.webkitAppearance = 'none';
    providerSelect.style.mozAppearance = 'none';

    // 确保父容器可以接收点击事件
    if (providerContainer) {
      providerContainer.style.pointerEvents = 'auto';
      providerContainer.style.cursor = 'pointer';

      // 移除之前可能存在的点击事件
      providerContainer.removeEventListener('click', this.providerSelectClickListener);

      // 为容器添加点击事件
      this.providerSelectClickListener = (e) => {
        e.stopPropagation();
        this.updateDropdownPosition(providerSelect, customDropdown);

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

      providerContainer.addEventListener('click', this.providerSelectClickListener);
    }

    // 设置初始状态
    customDropdown.style.display = 'none';

    // 获取所有可见的服务商（这里已经过滤掉了隐藏的服务商）
    const providers = await this.providerManager.getAllVisibleProviders();

    // 添加分隔线
    const addDivider = () => {
      const divider = document.createElement('div');
      divider.className = 'option-divider';
      customDropdown.appendChild(divider);
    };

    // 为每个服务商创建选项
    providers.forEach((provider, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'custom-select-option';
      if (provider.id === currentProvider) {
        optionElement.classList.add('selected');
      }

      // 创建选项内容容器
      const optionContent = document.createElement('div');
      optionContent.className = 'option-content';

      // 添加选项文本
      const optionText = document.createElement('span');
      optionText.textContent = provider.name;
      optionContent.appendChild(optionText);

      // 添加删除按钮（对所有服务商显示）
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-model-btn delete-provider-btn';
      deleteBtn.style.display = 'inline-flex';
      deleteBtn.title = this.i18nManager.getTranslation('deleteProviderBtnTitle');
      deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>';

      // 为删除按钮添加事件监听器
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止冒泡，避免触发选择服务商
        customDropdown.style.display = 'none'; // 隐藏下拉菜单
        this.showDeleteProviderDialog(provider.id, provider.name);
      });

      optionContent.appendChild(deleteBtn);
      optionElement.appendChild(optionContent);

      // 为选项添加点击事件
      optionElement.addEventListener('click', () => {
        // 设置选中值
        providerSelect.value = provider.id;
        customDropdown.style.display = 'none';

        // 更新选中样式
        document.querySelectorAll('.custom-select-option').forEach(el => {
          el.classList.remove('selected');
        });
        optionElement.classList.add('selected');

        // 触发change事件
        providerSelect.dispatchEvent(new Event('change'));
      });

      customDropdown.appendChild(optionElement);

      // 在默认服务商和自定义服务商之间添加分隔线
      if (index === providers.length - 1 ||
          (provider.id.startsWith('custom_') !== providers[index + 1].id.startsWith('custom_'))) {
        addDivider();
      }
    });

    // 添加"添加服务商"选项
    const addCustomProvider = document.createElement('div');
    addCustomProvider.className = 'custom-select-option add-model-option';
    // 每次都重新获取国际化翻译
    const addProviderText = this.i18nManager.getTranslation('addCustomProvider');
    addCustomProvider.textContent = '+ ' + addProviderText;
    addCustomProvider.style.color = 'var(--accent-color)';
    addCustomProvider.style.textAlign = 'center';
    addCustomProvider.style.fontWeight = 'bold';
    addCustomProvider.style.padding = '10px';
    addCustomProvider.addEventListener('click', () => {
      customDropdown.style.display = 'none';
      this.showCustomProviderDialog();
    });

    customDropdown.appendChild(addCustomProvider);

    // 下拉菜单点击事件处理
    const dropdownClickListener = (e) => {
      e.stopPropagation();
    };

    customDropdown.addEventListener('click', dropdownClickListener);

    // 文档点击事件，用于关闭下拉菜单
    const documentClickListener = (e) => {
      if (e.target !== providerSelect && !providerSelect.contains(e.target) &&
          e.target !== customDropdown && !customDropdown.contains(e.target) &&
          e.target !== providerContainer && !providerContainer.contains(e.target)) {
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

  // 清理自定义服务商下拉菜单
  cleanupCustomProviderDropdown() {
    try {
      // 移除容器点击事件监听器
      if (this.providerSelectClickListener) {
        const providerContainer = document.querySelector('#provider')?.closest('.custom-select-container');
        if (providerContainer) {
          providerContainer.removeEventListener('click', this.providerSelectClickListener);
        }
      }

      // 移除文档点击事件监听器
      if (this.documentClickListener) {
        document.removeEventListener('click', this.documentClickListener);
      }

      // 移除下拉菜单点击事件监听器
      if (this.customProviderDropdown && this.dropdownClickListener) {
        this.customProviderDropdown.removeEventListener('click', this.dropdownClickListener);
      }

      // 移除所有选项和删除按钮的事件监听器
      const customDropdown = document.getElementById('custom-provider-dropdown');
      if (customDropdown) {
        // 获取所有选项
        const options = customDropdown.querySelectorAll('.custom-select-option');
        options.forEach(option => {
          // 移除选项点击事件
          const newOption = option.cloneNode(true);
          option.parentNode.replaceChild(newOption, option);
        });

        // 获取所有删除按钮并移除事件监听器
        const deleteButtons = customDropdown.querySelectorAll('.delete-provider-btn');
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
      this.providerSelectClickListener = null;
      this.documentClickListener = null;
      this.dropdownClickListener = null;
      this.customProviderDropdown = null;
    } catch (error) {
      console.error('清理服务商下拉菜单错误:', error);
    }
  }

  // 显示删除服务商确认弹窗
  showDeleteProviderDialog(providerId, providerName) {
    const deleteProviderModal = document.getElementById('deleteProviderModal');
    const deleteProviderConfirmText = document.getElementById('deleteProviderConfirmText');
    const confirmDeleteProviderButton = document.getElementById('confirmDeleteProviderButton');
    const cancelDeleteProviderButton = document.getElementById('cancelDeleteProviderButton');
    const closeDeleteProviderModal = document.getElementById('closeDeleteProviderModal');
    const deleteProviderValidationMessage = document.getElementById('deleteProviderValidationMessage');
    const deleteProviderTitle = document.getElementById('deleteProviderTitle');

    if (!deleteProviderModal) return;

    // 保存要删除的服务商ID
    this.providerToDelete = providerId;

    // 设置标题
    if (deleteProviderTitle) {
      deleteProviderTitle.textContent = this.i18nManager.getTranslation('deleteProvider');
    }

    // 设置确认文本
    if (deleteProviderConfirmText) {
      const confirmText = this.i18nManager.getTranslation('deleteProviderConfirm').replace('{provider}', providerName);
      deleteProviderConfirmText.textContent = confirmText;
    }

    // 设置确认按钮文本
    if (confirmDeleteProviderButton) {
      confirmDeleteProviderButton.textContent = this.i18nManager.getTranslation('deleteProvider');
    }

    // 清除验证消息
    if (deleteProviderValidationMessage) {
      deleteProviderValidationMessage.innerHTML = '';
      deleteProviderValidationMessage.className = 'validation-message';
    }

    // 显示弹窗
    deleteProviderModal.classList.add('show');

    // 处理确认按钮点击
    const handleConfirm = async () => {
      await this.handleDeleteProvider();
    };

    // 处理取消按钮点击
    const handleClose = () => {
      deleteProviderModal.classList.remove('show');

      // 移除事件监听器
      if (confirmDeleteProviderButton) {
        confirmDeleteProviderButton.removeEventListener('click', handleConfirm);
      }

      if (cancelDeleteProviderButton) {
        cancelDeleteProviderButton.removeEventListener('click', handleClose);
      }

      if (closeDeleteProviderModal) {
        closeDeleteProviderModal.removeEventListener('click', handleClose);
      }

      document.removeEventListener('keydown', handleEsc);

      // 清除要删除的服务商ID
      this.providerToDelete = null;
    };

    // 处理ESC键关闭弹窗
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // 添加事件监听器
    if (confirmDeleteProviderButton) {
      confirmDeleteProviderButton.addEventListener('click', handleConfirm);
    }

    if (cancelDeleteProviderButton) {
      cancelDeleteProviderButton.addEventListener('click', handleClose);
    }

    if (closeDeleteProviderModal) {
      closeDeleteProviderModal.addEventListener('click', handleClose);
    }

    document.addEventListener('keydown', handleEsc);
  }

  // 显示添加服务商弹窗
  showCustomProviderDialog() {
    const customProviderModal = document.getElementById('customProviderModal');
    const customProviderNameInput = document.getElementById('customProviderNameInput');
    const customProviderApiKey = document.getElementById('customProviderApiKey');
    const customApiUrlInput = document.getElementById('customApiUrlInput');
    const customModelIdInput = document.getElementById('customModelIdInput');
    const customModelNameInput = document.getElementById('customModelNameInput');
    const customProviderValidationMessage = document.getElementById('customProviderValidationMessage');

    if (!customProviderModal) return;

    // 清空输入框
    if (customProviderNameInput) customProviderNameInput.value = '';
    if (customProviderApiKey) customProviderApiKey.value = '';
    if (customApiUrlInput) customApiUrlInput.value = '';
    if (customModelIdInput) customModelIdInput.value = '';
    if (customModelNameInput) customModelNameInput.value = '';

    // 设置输入框的placeholder
    if (customProviderNameInput) customProviderNameInput.placeholder = this.i18nManager.getTranslation('customProviderNameExamplePlaceholder');
    if (customProviderApiKey) customProviderApiKey.placeholder = this.i18nManager.getTranslation('customProviderApiKeyPlaceholder');
    if (customApiUrlInput) customApiUrlInput.placeholder = this.i18nManager.getTranslation('customProviderUrlExamplePlaceholder');
    if (customModelIdInput) customModelIdInput.placeholder = this.i18nManager.getTranslation('customProviderModelNameExamplePlaceholder');
    if (customModelNameInput) customModelNameInput.placeholder = this.i18nManager.getTranslation('modelDisplayNamePlaceholder');

    // 清除验证消息
    if (customProviderValidationMessage) {
      customProviderValidationMessage.innerHTML = '';
      customProviderValidationMessage.className = 'validation-message';
    }

    // 显示弹窗
    customProviderModal.classList.add('show');

    // 处理ESC键关闭弹窗
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        customProviderModal.classList.remove('show');
        document.removeEventListener('keydown', handleEsc);
      }
    };

    document.addEventListener('keydown', handleEsc);
  }

  // 处理删除服务商
  async handleDeleteProvider() {
    if (!this.providerToDelete) return;

    try {
      // 禁用删除按钮
      const confirmDeleteProviderButton = document.getElementById('confirmDeleteProviderButton');
      if (confirmDeleteProviderButton) {
        confirmDeleteProviderButton.disabled = true;
      }

      // 显示加载状态
      const validationMessage = document.getElementById('deleteProviderValidationMessage');
      if (validationMessage) {
        validationMessage.innerHTML = `<span class="spinner"></span>${this.i18nManager.getTranslation('deleting')}`;
        validationMessage.className = 'validation-message success';
      }

      // 删除服务商
      const success = await this.providerManager.deleteCustomProvider(this.providerToDelete);

      if (success) {
        // 获取所有可用的服务商
        const availableProviders = await this.providerManager.getAllVisibleProviders();

        // 当前选中的服务商
        const currentProvider = this.uiManager.elements.providerSelect.value;

        // 如果当前选中的是被删除的服务商，或者没有可用服务商
        if (currentProvider === this.providerToDelete || availableProviders.length === 0) {
          // 如果有可用服务商，切换到第一个
          if (availableProviders.length > 0) {
            await this.storageManager.saveProvider(availableProviders[0].id);
          } else {
            // 如果没有可用服务商，置空
            await this.storageManager.saveProvider('');
          }
        }

        // 显示成功消息
        if (validationMessage) {
          validationMessage.innerHTML = this.i18nManager.getTranslation('deleteProviderSuccess');
          validationMessage.className = 'validation-message success';
        }

        // 简单直接的解决方案：删除成功后重新加载页面
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // 恢复删除按钮状态
        if (confirmDeleteProviderButton) {
          confirmDeleteProviderButton.disabled = false;
        }

        // 显示错误消息
        if (validationMessage) {
          validationMessage.innerHTML = this.i18nManager.getTranslation('deleteProviderError');
          validationMessage.className = 'validation-message error';
        }
      }
    } catch (error) {
      console.error('删除服务商错误:', error);

      // 恢复删除按钮状态
      const confirmDeleteProviderButton = document.getElementById('confirmDeleteProviderButton');
      if (confirmDeleteProviderButton) {
        confirmDeleteProviderButton.disabled = false;
      }

      // 显示错误消息
      const validationMessage = document.getElementById('deleteProviderValidationMessage');
      if (validationMessage) {
        validationMessage.innerHTML = this.i18nManager.getTranslation('deleteProviderError');
        validationMessage.className = 'validation-message error';
      }
    }
  }

  // 处理保存自定义服务商
  async handleSaveCustomProvider() {
    console.log(`🔄 开始处理保存自定义服务商`);

    const customProviderNameInput = document.getElementById('customProviderNameInput');
    const customProviderApiKey = document.getElementById('customProviderApiKey');
    const customApiUrlInput = document.getElementById('customApiUrlInput');
    const customModelIdInput = document.getElementById('customModelIdInput');
    const customModelNameInput = document.getElementById('customModelNameInput');
    const saveCustomProviderButton = document.getElementById('saveCustomProviderButton');
    const customProviderValidationMessage = document.getElementById('customProviderValidationMessage');

    if (!customProviderNameInput || !customProviderApiKey || !customApiUrlInput ||
        !customModelIdInput || !customModelNameInput || !saveCustomProviderButton ||
        !customProviderValidationMessage) {
      console.error(`❌ 未找到必要的DOM元素`);
      return;
    }

    const apiKey = customProviderApiKey.value;
    const customProviderName = customProviderNameInput.value;
    const customApiUrl = customApiUrlInput.value;
    const customModelId = customModelIdInput.value;
    const customModelName = customModelNameInput.value;

    console.log(`📝 表单数据:
      服务商名称: ${customProviderName}
      API URL: ${customApiUrl}
      模型ID: ${customModelId}
      模型名称: ${customModelName}
      API密钥: ${apiKey ? apiKey.substring(0, 5) + '...' + apiKey.substring(apiKey.length - 5) : '空'}`);

    // 清除之前的验证消息
    customProviderValidationMessage.innerHTML = '';
    customProviderValidationMessage.className = 'validation-message';

    // 检查必填字段
    if (!apiKey) {
      console.error(`❌ API密钥为空`);
      customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('apiKeyEmpty');
      customProviderValidationMessage.classList.add('error');
      return;
    }

    if (!customProviderName) {
      console.error(`❌ 服务商名称为空`);
      customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('customProviderEmpty');
      customProviderValidationMessage.classList.add('error');
      return;
    }

    if (!customApiUrl) {
      console.error(`❌ API URL为空`);
      customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('customProviderApiUrlEmpty');
      customProviderValidationMessage.classList.add('error');
      return;
    }

    if (!customModelId) {
      console.error(`❌ 模型ID为空`);
      customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('customModelIdEmpty');
      customProviderValidationMessage.classList.add('error');
      return;
    }

    if (!customModelName) {
      console.error(`❌ 模型名称为空`);
      customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('customModelNameEmpty');
      customProviderValidationMessage.classList.add('error');
      return;
    }

    // 禁用保存按钮并显示加载状态
    saveCustomProviderButton.disabled = true;
    customProviderValidationMessage.innerHTML = `<span class="spinner"></span>${this.i18nManager.getTranslation('validating')}`;
    customProviderValidationMessage.classList.add('success');

    try {
      // 创建新的自定义服务商对象
      const newProvider = {
        id: 'custom_' + Date.now(),
        name: customProviderName,
        apiUrl: customApiUrl,
        isDefault: false
      };

      console.log(`🔧 创建新服务商对象:`, newProvider);

      // 直接验证API密钥，使用自定义URL而不是'custom'
      console.log(`🔍 开始验证API密钥，使用自定义URL: ${customApiUrl}`);

      // 创建临时服务商对象用于验证
      const tempProvider = {
        id: 'temp_provider',
        name: 'Temporary Provider',
        apiUrl: customApiUrl,
        isDefault: false
      };

      // 临时添加到服务商列表以便验证
      this.providerManager.customProviders.push(tempProvider);

      // 验证API密钥
      const isValid = await this.providerManager.validateApiKey('temp_provider', apiKey, customModelId);

      // 移除临时服务商
      this.providerManager.customProviders = this.providerManager.customProviders.filter(p => p.id !== 'temp_provider');

      // 恢复按钮状态
      saveCustomProviderButton.disabled = false;

      if (isValid) {
        console.log(`✅ API密钥验证成功，保存服务商: ${newProvider.name}`);

        // 添加apiKey到服务商对象，确保在对象内部也存储apiKey
        newProvider.apiKey = apiKey;

        // 保存自定义服务商
        await this.providerManager.saveCustomProvider(newProvider);

        // 保存API密钥 (仍然保存到独立项也保持兼容性)
        await this.providerManager.saveApiKey(newProvider.id, apiKey);

        // 保存自定义API URL
        await this.providerManager.saveCustomApiUrl(newProvider.id, customApiUrl);

        // 保存自定义模型
        const model = {
          value: customModelId,
          label: customModelName
        };

        console.log(`📚 添加模型到服务商:`, model);
        await this.providerManager.addModel(newProvider.id, model);

        // 保存并切换到新添加的服务商
        console.log(`🔄 切换到新服务商: ${newProvider.id}`);
        await this.storageManager.saveProvider(newProvider.id);
        await this.storageManager.saveModel(customModelId);

        // 立即更新UI选择框的值
        if (this.uiManager.elements.providerSelect) {
          this.uiManager.elements.providerSelect.value = newProvider.id;

          // 更新显示的文本
          const selectedOption = document.querySelector('.custom-select-container .selected-text');
          if (selectedOption) {
            selectedOption.textContent = newProvider.name;
          }
        }

        if (this.uiManager.elements.modelSelect) {
          this.uiManager.elements.modelSelect.value = customModelId;

          // 更新显示的文本
          const selectedOption = document.querySelector('#model-container .selected-text');
          if (selectedOption) {
            selectedOption.textContent = customModelName;
          }
        }

        customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('customProviderSaveSuccess');
        customProviderValidationMessage.classList.remove('error');
        customProviderValidationMessage.classList.add('success');

        // 隐藏弹窗
        setTimeout(() => {
          const customProviderModal = document.getElementById('customProviderModal');
          if (customProviderModal) {
            customProviderModal.classList.remove('show');
          }

          console.log(`🔄 重新加载页面以应用更改`);
          // 触发页面重新加载
          window.location.reload();
        }, 1500);
      } else {
        console.error(`❌ API密钥验证失败`);
        customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('apiKeyInvalid');
        customProviderValidationMessage.classList.remove('success');
        customProviderValidationMessage.classList.add('error');
      }
    } catch (error) {
      // 恢复按钮状态
      saveCustomProviderButton.disabled = false;

      console.error(`❌ 保存服务商错误:`, error);
      customProviderValidationMessage.innerHTML = this.i18nManager.getTranslation('fetchError');
      customProviderValidationMessage.classList.remove('success');
      customProviderValidationMessage.classList.add('error');
    }
  }

  // 处理自定义API URL保存
  async handleCustomApiUrlSave() {
    const customApiUrl = this.uiManager.getCustomApiUrlValue();
    const provider = this.uiManager.elements.providerSelect.value;

    try {
      // 如果是自定义Provider，只更新UI中的值，不保存到存储
      if (provider === 'custom') {
        // 如果自定义URL为空，显示默认提示
        if (!customApiUrl) {
          this.uiManager.showMessage(
            this.i18nManager.getTranslation('customProviderApiUrlEmpty'),
            false
          );
        }
        return;
      }

      await this.providerManager.saveCustomApiUrl(provider, customApiUrl);

      // 如果自定义URL为空，显示默认URL作为placeholder
      if (!customApiUrl) {
        const defaultUrl = this.providerManager.getDefaultApiUrl(provider);
        this.uiManager.setCustomApiUrlPlaceholder(defaultUrl);
      }

      this.uiManager.showMessage(
        this.i18nManager.getTranslation('customApiUrlSaveSuccess'),
        true
      );
    } catch (error) {
      console.error('保存自定义API URL错误:', error);
      this.uiManager.showMessage(
        this.i18nManager.getTranslation('customApiUrlSaveError'),
        false
      );
    }
  }
}