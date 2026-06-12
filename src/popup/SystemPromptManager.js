export class SystemPromptManager {
  constructor(storageManager, uiManager, i18nManager) {
    this.storageManager = storageManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;
  }

  // 初始化自定义 system prompt 管理器
  async initialize() {
    try {
      // 加载现有的自定义 system prompt
      const customSystemPrompt =
        await this.storageManager.getCustomSystemPrompt();
      if (customSystemPrompt) {
        this.uiManager.setCustomSystemPromptValue(customSystemPrompt);
      }

      // 设置事件监听器
      this.setupEventListeners();
    } catch (error) {
      console.error("初始化自定义 system prompt 管理器失败:", error);
    }
  }

  // 设置事件监听器
  setupEventListeners() {
    // 配置按钮点击事件
    if (this.uiManager.elements.customSystemPromptButton) {
      this.uiManager.elements.customSystemPromptButton.addEventListener(
        "click",
        () => {
          this.showCustomSystemPromptModal();
        },
      );
    }

    // 关闭按钮事件
    if (this.uiManager.elements.closeCustomSystemPromptModal) {
      this.uiManager.elements.closeCustomSystemPromptModal.addEventListener(
        "click",
        () => {
          this.hideCustomSystemPromptModal();
        },
      );
    }

    // 取消按钮事件
    if (this.uiManager.elements.cancelCustomSystemPromptButton) {
      this.uiManager.elements.cancelCustomSystemPromptButton.addEventListener(
        "click",
        () => {
          this.hideCustomSystemPromptModal();
        },
      );
    }

    // 保存按钮事件
    if (this.uiManager.elements.saveCustomSystemPromptButton) {
      this.uiManager.elements.saveCustomSystemPromptButton.addEventListener(
        "click",
        () => {
          this.saveCustomSystemPrompt();
        },
      );
    }

    // 点击弹窗外部关闭
    if (this.uiManager.elements.customSystemPromptModal) {
      this.uiManager.elements.customSystemPromptModal.addEventListener(
        "click",
        (e) => {
          if (e.target === this.uiManager.elements.customSystemPromptModal) {
            this.hideCustomSystemPromptModal();
          }
        },
      );
    }

    // 输入框内容变化事件
    if (this.uiManager.elements.customSystemPromptInput) {
      this.uiManager.elements.customSystemPromptInput.addEventListener(
        "input",
        () => {
          this.updateCharCount();
        },
      );
    }
  }

  // 显示自定义 system prompt 弹窗
  showCustomSystemPromptModal() {
    // 加载当前的自定义 system prompt
    this.storageManager.getCustomSystemPrompt().then((prompt) => {
      this.uiManager.setCustomSystemPromptValue(prompt);
      this.updateCharCount();
      this.uiManager.showCustomSystemPromptModal();
    });
  }

  // 隐藏自定义 system prompt 弹窗
  hideCustomSystemPromptModal() {
    this.uiManager.hideCustomSystemPromptModal();
  }

  // 保存自定义 system prompt
  async saveCustomSystemPrompt() {
    try {
      const prompt = this.uiManager.getCustomSystemPromptValue();
      const currentLang = this.i18nManager.getCurrentLang();

      // 验证输入
      if (!this.validatePrompt(prompt)) {
        return;
      }

      // 保存到存储
      await this.storageManager.saveCustomSystemPrompt(prompt);

      // 显示成功消息
      const successMsg =
        currentLang === "zh"
          ? "自定义系统提示词保存成功"
          : "Custom system prompt saved successfully";
      this.uiManager.showCustomSystemPromptValidationMessage(successMsg, true);

      // 延迟关闭弹窗
      setTimeout(() => {
        this.hideCustomSystemPromptModal();
      }, 1500);
    } catch (error) {
      console.error("保存自定义 system prompt 失败:", error);
      const currentLang = this.i18nManager.getCurrentLang();
      const errorMsg =
        currentLang === "zh"
          ? "保存自定义系统提示词失败。请重试。"
          : "Failed to save custom system prompt. Please try again.";
      this.uiManager.showCustomSystemPromptValidationMessage(errorMsg, false);
    }
  }

  // 更新字符计数
  updateCharCount() {
    const input = this.uiManager.elements.customSystemPromptInput;
    const counter = this.uiManager.elements.charCount;

    if (input && counter) {
      const length = input.value.length;
      counter.textContent = `${length} / 2000`;

      // 添加视觉反馈
      if (length >= 2000) {
        counter.classList.add("error");
      } else if (length >= 1800) {
        counter.classList.add("warning");
        counter.classList.remove("error");
      } else {
        counter.classList.remove("warning", "error");
      }
    }
  }

  // 验证 prompt
  validatePrompt(prompt) {
    const currentLang = this.i18nManager.getCurrentLang();

    // 基本验证：不能超过2000字符
    if (prompt.length > 2000) {
      const errorMsg =
        currentLang === "zh"
          ? "系统提示词不能超过2000个字符"
          : "System prompt cannot exceed 2000 characters.";
      this.uiManager.showCustomSystemPromptValidationMessage(errorMsg, false);
      return false;
    }

    // ✅ 允许空值 - 用户可以选择不使用自定义系统提示
    // 移除了原有的"不能为空"验证

    return true;
  }

  // 获取当前自定义 system prompt
  async getCurrentSystemPrompt() {
    try {
      return await this.storageManager.getCustomSystemPrompt();
    } catch (error) {
      console.error("获取自定义 system prompt 失败:", error);
      return "";
    }
  }
}
