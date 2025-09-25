export class TempStateManager {
  constructor() {
    this.STORAGE_PREFIX = 'temp_state_';
    this.AUTO_SAVE_DELAY = 1000; // 1秒延迟自动保存
    this.saveTimeouts = new Map(); // 防抖用的超时映射
  }

  // 临时状态类型
  static TYPES = {
    ADD_MODEL: 'add_model',
    ADD_PROVIDER: 'add_provider'
  };

  // 获取临时状态存储键
  getStorageKey(type) {
    return `${this.STORAGE_PREFIX}${type}`;
  }

  // 保存临时状态（防抖）
  saveTempState(type, formData, immediate = false) {
    const key = this.getStorageKey(type);

    const saveAction = () => {
      try {
        // 添加时间戳
        const stateData = {
          ...formData,
          timestamp: Date.now(),
          lastModified: new Date().toISOString()
        };

        localStorage.setItem(key, JSON.stringify(stateData));
      } catch (error) {
        console.error('保存临时状态失败:', error);
      }
    };

    if (immediate) {
      saveAction();
    } else {
      // 清除现有的延迟保存
      if (this.saveTimeouts.has(type)) {
        clearTimeout(this.saveTimeouts.get(type));
      }

      // 设置新的延迟保存
      const timeoutId = setTimeout(saveAction, this.AUTO_SAVE_DELAY);
      this.saveTimeouts.set(type, timeoutId);
    }
  }

  // 获取临时状态
  getTempState(type) {
    try {
      const key = this.getStorageKey(type);
      const data = localStorage.getItem(key);

      if (!data) return null;

      const parsedData = JSON.parse(data);

      // 检查状态是否过期（24小时）
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      if (Date.now() - parsedData.timestamp > maxAge) {
        this.clearTempState(type);
        return null;
      }

      return parsedData;
    } catch (error) {
      console.error('获取临时状态失败:', error);
      return null;
    }
  }

  // 清除临时状态
  clearTempState(type) {
    try {
      const key = this.getStorageKey(type);
      localStorage.removeItem(key);

      // 清除对应的延迟保存
      if (this.saveTimeouts.has(type)) {
        clearTimeout(this.saveTimeouts.get(type));
        this.saveTimeouts.delete(type);
      }

    } catch (error) {
      console.error('清除临时状态失败:', error);
    }
  }

  // 获取所有临时状态
  getAllTempStates() {
    const states = {};
    for (const type of Object.values(TempStateManager.TYPES)) {
      const state = this.getTempState(type);
      if (state) {
        states[type] = state;
      }
    }
    return states;
  }

  // 清除所有临时状态
  clearAllTempStates() {
    for (const type of Object.values(TempStateManager.TYPES)) {
      this.clearTempState(type);
    }
  }

  // 检查是否有临时状态
  hasTempState(type) {
    return this.getTempState(type) !== null;
  }

  // 检查临时状态是否有实际内容
  hasTempStateContent(type) {
    const state = this.getTempState(type);
    if (!state) return false;

    // 移除时间戳等元数据，只检查实际表单数据
    const { timestamp, lastModified, ...formData } = state;

    // 检查是否有任何非空的内容
    return Object.values(formData).some(value =>
      value && value.toString().trim() !== ''
    );
  }

  // 自动保存表单数据（用于表单输入监听）
  autoSaveTempState(type, getFormDataCallback) {
    try {
      const formData = getFormDataCallback();

      // 检查是否有任何非空的内容
      const hasContent = Object.values(formData).some(value =>
        value && value.toString().trim() !== ''
      );

      if (hasContent) {
        // 有内容时保存
        this.saveTempState(type, formData);
      } else {
        // 所有内容都为空时清除临时状态
        this.clearTempState(type);
      }
    } catch (error) {
      console.error('自动保存临时状态失败:', error);
    }
  }

  // 获取模型添加表单数据
  getModelFormData() {
    const modelApiId = document.getElementById('modelApiId');
    const modelDisplayName = document.getElementById('modelDisplayName');
    const modelApiKey = document.getElementById('modelApiKey');

    const data = {
      modelApiId: modelApiId?.value || '',
      modelDisplayName: modelDisplayName?.value || '',
      modelApiKey: modelApiKey?.value || '',
      currentProvider: document.getElementById('provider')?.value || ''
    };

    return data;
  }

  // 恢复模型添加表单数据
  restoreModelFormData(data) {
    try {
      const modelApiId = document.getElementById('modelApiId');
      const modelDisplayName = document.getElementById('modelDisplayName');
      const modelApiKey = document.getElementById('modelApiKey');

      // 修复：不检查值是否为空字符串，因为空字符串也是有效的数据
      if (modelApiId && data.modelApiId !== undefined) {
        modelApiId.value = data.modelApiId;
      }

      if (modelDisplayName && data.modelDisplayName !== undefined) {
        modelDisplayName.value = data.modelDisplayName;
      }

      if (modelApiKey && data.modelApiKey !== undefined) {
        modelApiKey.value = data.modelApiKey;
      }

    } catch (error) {
      console.error('恢复模型表单数据失败:', error);
    }
  }

  // 获取服务商添加表单数据
  getProviderFormData() {
    const customProviderNameInput = document.getElementById('customProviderNameInput');
    const customProviderApiKey = document.getElementById('customProviderApiKey');
    const customApiUrlInput = document.getElementById('customApiUrlInput');
    const customModelIdInput = document.getElementById('customModelIdInput');
    const customModelNameInput = document.getElementById('customModelNameInput');

    const data = {
      providerName: customProviderNameInput?.value || '',
      apiKey: customProviderApiKey?.value || '',
      apiUrl: customApiUrlInput?.value || '',
      modelId: customModelIdInput?.value || '',
      modelName: customModelNameInput?.value || ''
    };

    return data;
  }

  // 恢复服务商添加表单数据
  restoreProviderFormData(data) {
    try {
      const customProviderNameInput = document.getElementById('customProviderNameInput');
      const customProviderApiKey = document.getElementById('customProviderApiKey');
      const customApiUrlInput = document.getElementById('customApiUrlInput');
      const customModelIdInput = document.getElementById('customModelIdInput');
      const customModelNameInput = document.getElementById('customModelNameInput');

      // 修复：不检查值是否为空字符串，因为空字符串也是有效的数据
      if (customProviderNameInput && data.providerName !== undefined) {
        customProviderNameInput.value = data.providerName;
      }

      if (customProviderApiKey && data.apiKey !== undefined) {
        customProviderApiKey.value = data.apiKey;
      }

      if (customApiUrlInput && data.apiUrl !== undefined) {
        customApiUrlInput.value = data.apiUrl;
      }

      if (customModelIdInput && data.modelId !== undefined) {
        customModelIdInput.value = data.modelId;
      }

      if (customModelNameInput && data.modelName !== undefined) {
        customModelNameInput.value = data.modelName;
      }

    } catch (error) {
      console.error('恢复服务商表单数据失败:', error);
    }
  }

  // 安装表单监听器
  installFormListeners(type) {
    let elements = [];
    let getFormDataCallback;

    if (type === TempStateManager.TYPES.ADD_MODEL) {
      elements = [
        'modelApiId',
        'modelDisplayName',
        'modelApiKey'
      ];
      getFormDataCallback = () => this.getModelFormData();
    } else if (type === TempStateManager.TYPES.ADD_PROVIDER) {
      elements = [
        'customProviderNameInput',
        'customProviderApiKey',
        'customApiUrlInput',
        'customModelIdInput',
        'customModelNameInput'
      ];
      getFormDataCallback = () => this.getProviderFormData();
    }

    // 为每个表单元素添加输入监听器
    elements.forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element) {
        // 移除可能存在的旧监听器
        element.removeEventListener('input', element._tempStateListener);
        element.removeEventListener('change', element._tempStateListener);

        // 创建新的监听器
        const listener = () => {
          this.autoSaveTempState(type, getFormDataCallback);
        };

        // 保存监听器引用以便后续移除
        element._tempStateListener = listener;

        // 添加事件监听器
        element.addEventListener('input', listener);
        element.addEventListener('change', listener);
      }
    });

    console.log(`📝 已安装表单监听器: ${type}`);
  }

  // 移除表单监听器
  removeFormListeners(type) {
    let elements = [];

    if (type === TempStateManager.TYPES.ADD_MODEL) {
      elements = ['modelApiId', 'modelDisplayName', 'modelApiKey'];
    } else if (type === TempStateManager.TYPES.ADD_PROVIDER) {
      elements = [
        'customProviderNameInput',
        'customProviderApiKey',
        'customApiUrlInput',
        'customModelIdInput',
        'customModelNameInput'
      ];
    }

    elements.forEach(elementId => {
      const element = document.getElementById(elementId);
      if (element && element._tempStateListener) {
        element.removeEventListener('input', element._tempStateListener);
        element.removeEventListener('change', element._tempStateListener);
        delete element._tempStateListener;
      }
    });

    console.log(`🗑️ 已移除表单监听器: ${type}`);
  }
}
