import { ApiKeyManager } from './ApiKeyManager.js';
import { I18nManager } from './i18n.js';
import { UiManager } from './uiManager.js';
import { StorageManager } from './storageManager.js';
import { ProviderManager } from './ProviderManager.js';
import { ModelManager } from './ModelManager.js';
import { ProviderUIManager } from './ProviderUIManager.js';
import { EventManager } from './EventManager.js';

class PopupManager {
  constructor() {
    // 初始化所有管理器
    this.i18nManager = new I18nManager();
    this.uiManager = new UiManager();
    this.storageManager = new StorageManager();
    this.providerManager = new ProviderManager();

    // 初始化依赖其他管理器的管理器
    this.modelManager = new ModelManager(
      this.providerManager,
      this.storageManager,
      this.uiManager,
      this.i18nManager
    );

    this.providerUIManager = new ProviderUIManager(
      this.providerManager,
      this.storageManager,
      this.uiManager,
      this.i18nManager
    );

    this.apiKeyManager = new ApiKeyManager(
      this.providerManager,
      this.uiManager,
      this.i18nManager
    );

    // 将所有管理器传递给事件管理器
    this.eventManager = new EventManager({
      i18nManager: this.i18nManager,
      uiManager: this.uiManager,
      storageManager: this.storageManager,
      providerManager: this.providerManager,
      modelManager: this.modelManager,
      providerUIManager: this.providerUIManager,
      apiKeyManager: this.apiKeyManager
    });

    // 初始化
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
  }

  onDOMReady() {
    // 确保先更新国际化标签
    this.i18nManager.updateLabels();
    this.eventManager.initializeEventListeners();
    this.loadInitialState();
  }

  async loadInitialState() {
    try {

      // 获取设置
      const settings = await this.storageManager.getSettings();
      const currentProvider = settings.provider || 'deepseek';


      // 加载所有可见的服务商到下拉菜单
      const visibleProviders = await this.providerManager.getAllVisibleProviders();

      // 清空现有选项
      this.uiManager.elements.providerSelect.innerHTML = '';

      // 添加所有可见的服务商
      for (const provider of visibleProviders) {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.name;
        this.uiManager.elements.providerSelect.appendChild(option);
      }

      // 添加"添加服务商"选项
      const addOption = document.createElement('option');
      addOption.value = 'custom';
      addOption.textContent = this.i18nManager.getTranslation('addCustomProvider');
      addOption.id = 'customProvider';
      this.uiManager.elements.providerSelect.appendChild(addOption);

      // 设置UI元素的初始值
      this.uiManager.elements.languageSelect.value = settings.language;
      this.uiManager.elements.providerSelect.value = currentProvider;
      this.uiManager.elements.selectionEnabled.checked = settings.selectionEnabled;
      this.uiManager.elements.rememberWindowSize.checked = settings.rememberWindowSize;
      this.uiManager.elements.pinWindow.checked = settings.pinWindow;

      // 只清空API密钥输入框，不清空自定义API地址输入框
      this.uiManager.setApiKeyValue('');

      // 创建自定义服务商下拉菜单
      await this.providerUIManager.createCustomProviderDropdown(currentProvider);

      // 更新服务商UI（包括API密钥和自定义API URL的placeholder）
      await this.providerUIManager.updateProviderUI(currentProvider);

      // 更新模型选项
      await this.modelManager.updateModelOptions(currentProvider);

      // 设置保存的model值
      if (settings.model) {
        this.uiManager.elements.modelSelect.value = settings.model;
      }

      // 再次更新国际化标签，确保所有动态生成的元素也应用了正确的语言
      this.i18nManager.updateLabels();

    } catch (error) {
      console.error('初始化错误:', error);
    }
  }
}

// 初始化
const popupManager = new PopupManager();

// 全局函数，用于更新内容
window.updateContent = () => {
  // 只更新标签文本，不触发任何其他操作
  if (popupManager && popupManager.i18nManager) {
    popupManager.i18nManager.updateLabels();
  }
};

// 获取当前语言
const getCurrentLang = () => localStorage.getItem('preferredLang') || 'en';

// 设置当前语言
const setCurrentLang = (lang) => localStorage.setItem('preferredLang', lang);

// 语言切换按钮事件
document.getElementById('language-toggle')?.addEventListener('click', () => {
  // 保存当前输入值
  const customApiUrlElement = document.getElementById('customApiUrl');
  const apiKeyElement = document.getElementById('apiKey');

  const currentApiUrl = customApiUrlElement?.value || '';
  const currentApiKey = apiKeyElement?.value || '';

  // 保存当前选中的服务商和模型
  const currentProvider = document.getElementById('provider')?.value || 'deepseek';
  const currentModel = document.getElementById('model')?.value || '';

  // 切换语言
  const currentLang = getCurrentLang();
  const newLang = currentLang === 'zh' ? 'en' : 'zh';
  setCurrentLang(newLang);

  // 更新UI文本
  if (popupManager && popupManager.i18nManager) {
    popupManager.i18nManager.updateLabels();
  }

  // 恢复输入值
  if (customApiUrlElement) {
    customApiUrlElement.value = currentApiUrl;
  }
  if (apiKeyElement) {
    apiKeyElement.value = currentApiKey;
  }

  // 重新创建自定义服务商下拉菜单
  if (popupManager && popupManager.providerUIManager) {
    popupManager.providerUIManager.createCustomProviderDropdown(currentProvider);
  }

  // 重新创建模型下拉菜单
  if (popupManager && popupManager.modelManager) {
    popupManager.modelManager.updateModelOptions(currentProvider).then(() => {
      // 恢复之前选中的模型
      const modelSelect = document.getElementById('model');
      if (modelSelect && currentModel) {
        modelSelect.value = currentModel;
      }

      // 确保模态窗口中的文本也被更新
      if (popupManager && popupManager.i18nManager) {
        popupManager.i18nManager.updateLabels();
      }
    });
  }
});
