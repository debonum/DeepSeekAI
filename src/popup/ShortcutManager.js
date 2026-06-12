/**
 * 快捷键管理器 - 处理用户自定义快捷键功能
 * 支持自定义显示/隐藏聊天窗口的快捷键
 */
export class ShortcutManager {
  constructor(storageManager, uiManager, i18nManager) {
    this.storageManager = storageManager;
    this.uiManager = uiManager;
    this.i18nManager = i18nManager;

    // 默认快捷键配置
    this.defaultShortcuts = {
      "toggle-chat": {
        default: "Ctrl+Shift+Y",
        description: "Open or close the chat window (destroys session).",
        displayName: "Open/Close Chat",
      },
      "show-hide-chat": {
        default: "Ctrl+Shift+U",
        description: "Show or hide the chat window (preserves session).",
        displayName: "Show/Hide Chat",
      },
    };
  }

  /**
   * 初始化快捷键管理器
   */
  async initialize() {
    await this.loadShortcutSettings();
    this.setupEventListeners();
  }

  /**
   * 加载快捷键设置
   */
  async loadShortcutSettings() {
    try {
      const settings = await this.storageManager.getSettings();
      this.currentShortcuts = settings.shortcuts || this.defaultShortcuts;
    } catch (error) {
      console.error("加载快捷键设置失败:", error);
      this.currentShortcuts = this.defaultShortcuts;
    }
  }

  /**
   * 保存快捷键设置
   */
  async saveShortcutSettings(shortcuts) {
    try {
      this.currentShortcuts = shortcuts;
      await this.storageManager.saveShortcuts(shortcuts);

      // 通知其他组件快捷键已更新
      chrome.runtime.sendMessage({
        action: "shortcutsUpdated",
        shortcuts: shortcuts,
      });

      return true;
    } catch (error) {
      console.error("保存快捷键设置失败:", error);
      return false;
    }
  }

  /**
   * 解析快捷键组合
   */
  parseShortcut(shortcutString) {
    if (!shortcutString) return null;

    const parts = shortcutString
      .split("+")
      .map((part) => part.trim().toLowerCase());

    const result = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: null,
    };

    for (const part of parts) {
      switch (part) {
        case "ctrl":
          result.ctrl = true;
          break;
        case "shift":
          result.shift = true;
          break;
        case "alt":
          result.alt = true;
          break;
        case "cmd":
        case "command":
        case "meta":
          result.meta = true;
          break;
        default:
          if (part.length === 1 || (part.length > 1 && this.isValidKey(part))) {
            result.key = part.toUpperCase();
          }
          break;
      }
    }

    return result.key ? result : null;
  }

  /**
   * 验证是否是有效按键
   */
  isValidKey(key) {
    const validKeys = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
      "m",
      "n",
      "o",
      "p",
      "q",
      "r",
      "s",
      "t",
      "u",
      "v",
      "w",
      "x",
      "y",
      "z",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "f1",
      "f2",
      "f3",
      "f4",
      "f5",
      "f6",
      "f7",
      "f8",
      "f9",
      "f10",
      "f11",
      "f12",
      "enter",
      "space",
      "tab",
      "escape",
      "backspace",
      "delete",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "home",
      "end",
      "pageup",
      "pagedown",
    ];

    return validKeys.includes(key.toLowerCase());
  }

  /**
   * 格式化快捷键显示
   */
  formatShortcutForDisplay(shortcut) {
    if (!shortcut) return "";

    const parts = [];
    if (shortcut.meta) parts.push("Cmd");
    if (shortcut.ctrl) parts.push("Ctrl");
    if (shortcut.shift) parts.push("Shift");
    if (shortcut.alt) parts.push("Alt");
    if (shortcut.key) parts.push(this.formatKey(shortcut.key));

    return parts.join(" + ");
  }

  /**
   * 格式化按键显示
   */
  formatKey(key) {
    const keyMap = {
      " ": "Space",
      escape: "Esc",
      enter: "Enter",
      tab: "Tab",
      backspace: "Backspace",
      delete: "Del",
      arrowup: "↑",
      arrowdown: "↓",
      arrowleft: "←",
      arrowright: "→",
    };

    // 处理功能键
    if (key.toLowerCase().startsWith("f") && key.length > 1) {
      const num = key.slice(1);
      if (!isNaN(num)) return `F${num}`;
    }

    return keyMap[key.toLowerCase()] || key.toUpperCase();
  }

  /**
   * 验证快捷键是否冲突
   */
  validateShortcut(shortcutString, command = "toggle-chat") {
    if (!shortcutString.trim()) {
      return { valid: false, error: "快捷键不能为空" };
    }

    // 检查快捷键格式
    const shortcut = this.parseShortcut(shortcutString);
    if (!shortcut) {
      return { valid: false, error: "无效的快捷键格式" };
    }

    // 检查是否包含主键
    if (!shortcut.key) {
      return { valid: false, error: "必须包含一个主键（字母、数字或功能键）" };
    }

    // 检查是否有效键
    if (!this.isValidKey(shortcut.key)) {
      return { valid: false, error: "无效的按键" };
    }

    // 检查是否只使用了标准修饰键
    const modifiers = [
      shortcut.ctrl,
      shortcut.shift,
      shortcut.alt,
      shortcut.meta,
    ];
    if (modifiers.filter(Boolean).length === 0) {
      return {
        valid: false,
        error: "至少需要一个修饰键（Ctrl、Shift、Alt 或 Cmd）",
      };
    }

    // 检查操作系统特定的限制
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if (isMac && shortcut.ctrl && !shortcut.meta) {
      return {
        valid: false,
        error: "在 macOS 上建议使用 Cmd 键而不是 Ctrl 键",
      };
    }

    return { valid: true, shortcut };
  }

  /**
   * 获取当前快捷键显示文本
   */
  getCurrentShortcutDisplay() {
    const shortcut = this.currentShortcuts["toggle-chat"];
    const parsed = this.parseShortcut(shortcut.default);
    return this.formatShortcutForDisplay(parsed);
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 快捷键设置按钮点击事件
    const shortcutSettings = document.getElementById("shortcutSettings");
    if (shortcutSettings) {
      shortcutSettings.addEventListener("click", (e) => {
        e.preventDefault();
        this.showShortcutDialog();
      });
    }
  }

  /**
   * 显示快捷键对话框
   */
  async showShortcutDialog() {
    // 检查是否已存在对话框
    if (document.getElementById("shortcutModal")) {
      return;
    }

    // 创建对话框
    const modal = this.createShortcutModal();
    document.body.appendChild(modal);

    // 显示模态窗口
    setTimeout(() => modal.classList.add("show"), 10);
  }

  /**
   * 创建快捷键对话框
   */
  createShortcutModal() {
    const modal = document.createElement("div");
    modal.id = "shortcutModal";
    modal.className = "modal";

    const currentShortcut = this.getCurrentShortcutDisplay();

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <span id="shortcutTitle">快捷键设置</span>
          <span class="close" id="closeShortcutModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="shortcutInput" id="shortcutInputLabel">
              显示/隐藏聊天窗口快捷键
            </label>
            <input
              type="text"
              id="shortcutInput"
              class="form-control shortcut-input"
              placeholder="例如: Ctrl+Shift+D"
              value="${currentShortcut}"
              readonly
            />
            <div class="input-hint" id="shortcutHint">
              点击输入框然后按下您想要的组合键
            </div>
          </div>
          <div id="shortcutValidationMessage" class="validation-message"></div>
          <div style="margin-top: 16px; padding: 12px; background: rgba(10, 132, 255, 0.05); border-radius: 8px;">
            <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">
              <strong>提示：</strong>快捷键将在您保存后生效。确保选择的快捷键不会与其他程序冲突。
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button id="resetShortcutButton" class="cancel-button">重置</button>
          <button id="cancelShortcutButton" class="cancel-button">取消</button>
          <button id="saveShortcutButton" class="save-button">保存</button>
        </div>
      </div>
    `;

    // 添加事件监听器
    this.attachShortcutModalEvents(modal);

    return modal;
  }

  /**
   * 绑定快捷键对话框事件
   */
  attachShortcutModalEvents(modal) {
    const closeButton = modal.querySelector("#closeShortcutModal");
    const cancelButton = modal.querySelector("#cancelShortcutButton");
    const saveButton = modal.querySelector("#saveShortcutButton");
    const resetButton = modal.querySelector("#resetShortcutButton");
    const shortcutInput = modal.querySelector("#shortcutInput");
    const validationMessage = modal.querySelector("#shortcutValidationMessage");

    // 关闭按钮点击事件
    const closeModal = () => {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 300);
    };

    closeButton.addEventListener("click", closeModal);
    cancelButton.addEventListener("click", closeModal);

    // 点击外部关闭
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // 快捷键输入框事件
    shortcutInput.addEventListener("focus", (e) => {
      e.target.value = "请按下组合键...";
      validationMessage.textContent = "";
      validationMessage.className = "validation-message";
    });

    shortcutInput.addEventListener("keydown", (e) => {
      e.preventDefault();

      // 构建快捷键字符串
      const parts = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.metaKey) parts.push("Cmd");

      // 获取按键名称（排除修饰键）
      let key = e.key.toLowerCase();
      if (key === " ") key = "space";
      if (key === "escape") key = "escape";

      // 只添加非修饰键
      if (
        key.length === 1 ||
        key.startsWith("f") ||
        [
          "space",
          "escape",
          "enter",
          "tab",
          "backspace",
          "delete",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "home",
          "end",
          "pageup",
          "pagedown",
        ].includes(key)
      ) {
        parts.push(this.formatKey(key));

        const shortcutString = parts.join("+");
        const validation = this.validateShortcut(shortcutString);

        if (validation.valid) {
          shortcutInput.value = shortcutString;
          validationMessage.textContent = "快捷键格式正确";
          validationMessage.className = "validation-message success";
        } else {
          validationMessage.textContent = validation.error;
          validationMessage.className = "validation-message error";
        }
      }
    });

    // 重置按钮事件
    resetButton.addEventListener("click", () => {
      shortcutInput.value = this.formatShortcutForDisplay(
        this.parseShortcut(this.defaultShortcuts["toggle-chat"].default),
      );
      validationMessage.textContent = "已重置为默认快捷键";
      validationMessage.className = "validation-message success";
    });

    // 保存按钮事件
    saveButton.addEventListener("click", async () => {
      const shortcutString = shortcutInput.value.trim();
      const validation = this.validateShortcut(shortcutString);

      if (!validation.valid) {
        validationMessage.textContent = validation.error;
        validationMessage.className = "validation-message error";
        return;
      }

      // 更新快捷键设置
      const newShortcuts = {
        ...this.currentShortcuts,
        "toggle-chat": {
          ...this.currentShortcuts["toggle-chat"],
          default: shortcutString,
        },
      };

      const success = await this.saveShortcutSettings(newShortcuts);

      if (success) {
        validationMessage.textContent = "快捷键已保存";
        validationMessage.className = "validation-message success";

        // 2秒后关闭对话框
        setTimeout(() => {
          closeModal();
        }, 2000);
      } else {
        validationMessage.textContent = "保存失败，请重试";
        validationMessage.className = "validation-message error";
      }
    });
  }

  /**
   * 隐藏快捷键对话框
   */
  hideShortcutDialog() {
    const modal = document.getElementById("shortcutModal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => modal.remove(), 300);
    }
  }
}
