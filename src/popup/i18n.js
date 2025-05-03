export class I18nManager {
  constructor() {
    this.translations = {
      zh: {
        validating: '验证中...',
        saveSuccess: '保存成功',
        apiKeyInvalid: 'API密钥无效或者检查当前选择的模型是否可用',
        noBalance: '余额不足',
        noApiKey: '请先设置API密钥',
        fetchError: '获取失败',
        rememberWindowSize: '保存窗口大小',
        customApiUrlSaveSuccess: '自定义API地址已保存',
        customApiUrlSaveError: '保存自定义API地址失败',
        customApiUrlLabel: '自定义API地址',
        customApiUrlPlaceholder: '输入自定义API地址（或使用默认）',
        apiKeyEmpty: 'API密钥不能为空',
        apiKeyLabel: 'API密钥',
        apiKeyPlaceholder: '在此输入API密钥',
        balanceText: '余额',
        customProviderNameLabel: '服务商名称',
        customProviderNamePlaceholder: '输入自定义服务商名称',
        customProviderNameExamplePlaceholder: '例如: 我的自定义服务商',
        customProviderApiKeyPlaceholder: '请输入API密钥',
        customProviderUrlExamplePlaceholder: '例如: https://api.example.com/v1/chat/completions',
        customProviderModelNameExamplePlaceholder: '例如: deepseek-chat',
        customProviderEmpty: '服务商名称不能为空',
        customProviderSaveSuccess: '自定义服务商已保存',
        customProviderSaveError: '保存自定义服务商失败',
        customProviderApiUrlEmpty: '自定义服务商需要API地址',
        customProvider: '自定义服务商',
        customModelNameLabel: '模型名称',
        customModelNamePlaceholder: '输入模型名称用于API验证',
        customModelNameEmpty: '模型名称不能为空',
        customModelIdEmpty: '模型ID不能为空',
        saveCustomProviderBtnText: '保存',
        addModel: '添加模型',
        addModelTitle: '添加模型',
        modelApiId: '模型API标识',
        modelDisplayName: '模型显示名称',
        modelApiIdPlaceholder: '输入模型API标识（如 deepseek-chat）',
        modelDisplayNamePlaceholder: '输入模型显示名称（如 DeepSeek AI）',
        saveModel: '保存',
        cancelModel: '取消',
        modelSaveSuccess: '模型添加成功',
        modelSaveError: '添加模型失败',
        modelValidationError: '模型验证失败，该模型可能不存在或不可用',
        modelApiIdEmpty: '模型API标识不能为空',
        modelDisplayNameEmpty: '模型显示名称不能为空',
        modelChanged: '模型已更改为',
        processing: '处理中...',
        toggle: '显示/隐藏API密钥',
        'header-title': 'DeepSeek AI',
        providerLabel: '服务商',
        addCustomProvider: '添加服务商',
        apiKeyLink: '获取API密钥',
        modelLabel: '模型',
        selectionEnabledLabel: '快速按钮',
        preferredLanguageLabel: '首选语言',
        pinWindowLabel: '固定窗口',
        shortcutSettingsText: '快捷键设置',
        shortcutDescription: '请前往设置快捷键',
        instructionsText: '使用说明',
        githubText: 'GitHub',
        statusText: 'API服务状态',
        feedbackText: '反馈',
        deleteProvider: '删除服务商',
        hideProvider: '隐藏服务商',
        deleteProviderConfirm: '确定要删除服务商 {provider}？此操作不可撤销。',
        hideProviderConfirm: '确定要隐藏服务商 {provider}？您可以稍后在设置中重新启用它。',
        deleteProviderSuccess: '服务商删除成功',
        hideProviderSuccess: '服务商已隐藏',
        deleteProviderError: '删除服务商失败',
        deleteModel: '删除模型',
        deleteModelBtnTitle: '删除模型',
        deleteProviderBtnTitle: '删除服务商',
        confirmDeleteModel: '确定要删除模型 {model}？此操作不可撤销。',
        deleteModelSuccess: '模型删除成功',
        deleting: '删除中...',
        saving: '保存中...'
      },
      en: {
        validating: 'Validating...',
        saveSuccess: 'Saved successfully',
        apiKeyInvalid: 'API key is invalid or check if the current selected model is available',
        noBalance: 'Insufficient balance',
        noApiKey: 'Please set API key first',
        fetchError: 'Failed to fetch',
        rememberWindowSize: 'Save Window Size',
        customApiUrlSaveSuccess: 'Custom API URL saved',
        customApiUrlSaveError: 'Failed to save custom API URL',
        customApiUrlLabel: 'Custom API URL',
        customApiUrlPlaceholder: 'Enter custom API URL (or use default)',
        apiKeyEmpty: 'API key cannot be empty',
        apiKeyLabel: 'API Key',
        apiKeyPlaceholder: 'Enter API Key here',
        balanceText: 'Balance',
        customProviderNameLabel: 'Provider Name',
        customProviderNamePlaceholder: 'Enter custom provider name',
        customProviderNameExamplePlaceholder: 'e.g. My Custom Provider',
        customProviderApiKeyPlaceholder: 'Please enter API key',
        customProviderUrlExamplePlaceholder: 'e.g. https://api.example.com/v1/chat/completions',
        customProviderModelNameExamplePlaceholder: 'e.g. deepseek-chat',
        customProviderEmpty: 'Provider name cannot be empty',
        customProviderSaveSuccess: 'Custom provider saved',
        customProviderSaveError: 'Failed to save custom provider',
        customProviderApiUrlEmpty: 'Custom provider needs API URL',
        customProvider: 'Custom Provider',
        customModelNameLabel: 'Model Name',
        customModelNamePlaceholder: 'Enter model name for API validation',
        customModelNameEmpty: 'Model name cannot be empty',
        customModelIdEmpty: 'Model ID cannot be empty',
        saveCustomProviderBtnText: 'Save',
        addModel: 'Add Model',
        addModelTitle: 'Add Model',
        modelApiId: 'Model API ID',
        modelDisplayName: 'Model Display Name',
        modelApiIdPlaceholder: 'Enter model API ID (e.g. deepseek-chat)',
        modelDisplayNamePlaceholder: 'Enter model display name (e.g. DeepSeek AI)',
        saveModel: 'Save',
        cancelModel: 'Cancel',
        modelSaveSuccess: 'Model added successfully',
        modelSaveError: 'Failed to add model',
        modelValidationError: 'Model validation failed, this model may not exist or be unavailable',
        modelApiIdEmpty: 'Model API ID cannot be empty',
        modelDisplayNameEmpty: 'Model display name cannot be empty',
        modelChanged: 'Model changed to',
        processing: 'Processing...',
        toggle: 'Show/Hide API Key',
        'header-title': 'DeepSeek AI',
        providerLabel: 'Service Provider',
        addCustomProvider: 'Add Provider',
        apiKeyLink: 'Get API Key',
        modelLabel: 'Model',
        selectionEnabledLabel: 'Quick Button',
        preferredLanguageLabel: 'Preferred Language',
        pinWindowLabel: 'Pin Window',
        shortcutSettingsText: 'Shortcut Settings',
        shortcutDescription: 'Please go to set shortcuts',
        instructionsText: 'Instructions',
        githubText: 'GitHub',
        statusText: 'API Service Status',
        feedbackText: 'Feedback',
        deleteProvider: 'Delete Provider',
        hideProvider: 'Hide Provider',
        deleteProviderConfirm: 'Are you sure you want to delete {provider}? This action cannot be undone.',
        hideProviderConfirm: 'Are you sure you want to hide {provider}? You can re-enable it later in settings.',
        deleteProviderSuccess: 'Provider deleted successfully',
        hideProviderSuccess: 'Provider hidden successfully',
        deleteProviderError: 'Failed to delete provider',
        deleteModel: 'Delete Model',
        deleteModelBtnTitle: 'Delete Model',
        deleteProviderBtnTitle: 'Delete Provider',
        confirmDeleteModel: 'Are you sure you want to delete model {model}? This action cannot be undone.',
        deleteModelSuccess: 'Model deleted successfully',
        deleting: 'Deleting...',
        saving: 'Saving...'
      }
    };
  }

  getCurrentLang() {
    return localStorage.getItem('preferredLang') || 'en';
  }

  setCurrentLang(lang) {
    localStorage.setItem('preferredLang', lang);
  }

  getTranslation(key) {
    const currentLang = this.getCurrentLang();
    return this.translations[currentLang][key] || key;
  }

  // 更新所有标签的文本内容
  updateLabels() {
    try {
      const currentLang = this.getCurrentLang();

      // 更新标题
      this.updateElementText('header-title', 'header-title');

      // 更新服务商相关标签
      this.updateElementText('providerLabel', 'providerLabel');
      this.updateElementText('customProvider', 'addCustomProvider');

      // 更新API密钥相关标签
      this.updateElementText('apiKeyLabelText', 'apiKeyLabel');
      this.updateElementText('apiKeyLink', 'apiKeyLink');

      // 更新自定义API URL相关标签
      this.updateElementText('customApiUrlLabel', 'customApiUrlLabel');

      // 更新模型相关标签
      this.updateElementText('modelLabel', 'modelLabel');

      // 更新其他设置标签
      this.updateElementText('selectionEnabledLabel', 'selectionEnabledLabel');
      this.updateElementText('preferredLanguageLabel', 'preferredLanguageLabel');
      this.updateElementText('rememberWindowSizeLabel', 'rememberWindowSize');
      this.updateElementText('pinWindowLabel', 'pinWindowLabel');

      // 更新快捷键设置标签
      this.updateElementText('shortcutSettingsText', 'shortcutSettingsText');
      this.updateElementText('shortcutDescription', 'shortcutDescription');

      // 更新帮助链接标签
      this.updateElementText('instructionsText', 'instructionsText');
      this.updateElementText('githubText', 'githubText');
      this.updateElementText('statusText', 'statusText');
      this.updateElementText('feedbackText', 'feedbackText');

      // 更新输入框占位符
      this.updateInputPlaceholder('apiKey', 'apiKeyPlaceholder');

      // 更新模态窗口中的输入框placeholder
      this.updateInputPlaceholder('customProviderNameInput', 'customProviderNameExamplePlaceholder');
      this.updateInputPlaceholder('customProviderApiKey', 'customProviderApiKeyPlaceholder');
      this.updateInputPlaceholder('customApiUrlInput', 'customProviderUrlExamplePlaceholder');
      this.updateInputPlaceholder('customModelIdInput', 'customProviderModelNameExamplePlaceholder');
      this.updateInputPlaceholder('customModelNameInput', 'modelDisplayNamePlaceholder');
      this.updateInputPlaceholder('modelApiId', 'modelApiIdPlaceholder');
      this.updateInputPlaceholder('modelDisplayName', 'modelDisplayNamePlaceholder');

      // 更新弹窗标签
      this.updateElementText('customProviderTitle', 'addCustomProvider');
      this.updateElementText('customProviderNameInputLabel', 'customProviderNameLabel');
      this.updateElementText('customProviderApiKeyLabel', 'apiKeyLabel');
      this.updateElementText('customApiUrlInputLabel', 'customApiUrlLabel');
      this.updateElementText('customModelIdInputLabel', 'modelApiId');
      this.updateElementText('customModelNameInputLabel', 'customModelNameLabel');

      this.updateElementText('addModelTitle', 'addModelTitle');
      this.updateElementText('modelIdLabel', 'modelApiId');
      this.updateElementText('modelDisplayNameLabel', 'modelDisplayName');

      this.updateElementText('deleteProviderTitle', 'deleteProvider');
      this.updateElementText('deleteModelTitle', 'deleteModel');

      // 更新按钮文本
      this.updateElementText('saveCustomProviderButton', 'saveCustomProviderBtnText');
      this.updateElementText('cancelCustomProviderButton', 'cancelModel');
      this.updateElementText('saveModelButton', 'saveModel');
      this.updateElementText('cancelModelButton', 'cancelModel');
      this.updateElementText('confirmDeleteProviderButton', 'deleteProvider');
      this.updateElementText('cancelDeleteProviderButton', 'cancelModel');
      this.updateElementText('confirmDeleteModelButton', 'deleteModel');
      this.updateElementText('cancelDeleteModelButton', 'cancelModel');
    } catch (error) {
      console.error('更新标签错误:', error);
    }
  }

  // 更新元素文本
  updateElementText(elementId, translationKey) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.getTranslation(translationKey);
    }
  }

  // 更新输入框占位符
  updateInputPlaceholder(elementId, translationKey) {
    const element = document.getElementById(elementId);
    if (element) {
      // 保存当前值
      const currentValue = element.value;

      // 更新placeholder
      element.placeholder = this.getTranslation(translationKey);

      // 确保值不会被清空
      if (element.value !== currentValue) {
        element.value = currentValue;
      }
    }
  }
}