import { createSvgIcon } from "./IconManager";
import { watchThemeChanges } from "../utils/themeManager";

const QUICK_ACTIONS = [
  {
    id: "logo",
    icon: "icon24",
    title: "DeepSeek AI",
  },
  {
    id: "main",
    icon: "icon24",
    title: "Chat",
    prompt: "Please respond in the same language as the user's input. If the user's input is in Chinese, respond in Chinese. If the user's input is in English, respond in English, etc.",
  },
  {
    id: "copy",
    icon: "icon_copy",
    title: "copy",
  },
  {
    id: "translate",
    icon: "translate",
    title: "Translate",
    prompt: "Please translate the following content into Simplified Chinese",
    languages: [
      { code: "zh", name: "中文", native: "简体中文" },
      { code: "en", name: "English", native: "English" },
      { code: "ja", name: "Japanese", native: "日本語" },
      { code: "ko", name: "Korean", native: "한국어" },
      { code: "fr", name: "French", native: "Français" },
      { code: "de", name: "German", native: "Deutsch" },
      { code: "es", name: "Spanish", native: "Español" },
      { code: "it", name: "Italian", native: "Italiano" },
      { code: "pt", name: "Portuguese", native: "Português" },
      { code: "ru", name: "Russian", native: "Русский" },
      { code: "ar", name: "Arabic", native: "العربية" },
      { code: "hi", name: "Hindi", native: "हिन्दी" },
      { code: "tr", name: "Turkish", native: "Türkçe" },
      { code: "nl", name: "Dutch", native: "Nederlands" },
      { code: "pl", name: "Polish", native: "Polski" },
      { code: "vi", name: "Vietnamese", native: "Tiếng Việt" },
      { code: "th", name: "Thai", native: "ไทย" },
      { code: "id", name: "Indonesian", native: "Bahasa Indonesia" },
    ],
  },
  {
    id: "explain",
    icon: "explain",
    title: "Explain",
    prompt: "Act as an AI assistant with MBTI persona INTJ-INFJ. Explain the following content clearly and directly, focusing on key points and practical clarity. Output only the final explanation; do not include analysis or chain-of-thought unless explicitly requested.",
  },
  {
    id: "summarize",
    icon: "summarize",
    title: "Summarize",
    prompt: "Act as an AI assistant with MBTI persona ISTJ-INTJ. Summarize the content concisely, keep critical information, use a clear structure (bullets if suitable). Output only the summary; no reasoning unless asked.",
  },
  {
    id: "email",
    icon: "email",
    title: "Email",
    prompt: "Act as an AI assistant with MBTI persona ISTJ-ENFJ. Write an email based on the user's input. Include a clear subject, proper greeting, concise body, actionable points, and a polite closing. Output only the email content with no extra commentary.",
  },
  {
    id: "analyze",
    icon: "analyze",
    title: "Analyze",
    prompt: "Act as an AI assistant with MBTI persona ISTP-ENTP. Analyze the content and highlight key issues, insights, and actionable suggestions. Provide only the final analysis without exposing intermediate reasoning.",
  },
];

// 获取上次选择的语言
const getLastLanguage = async () => {
  const result = await chrome.storage.sync.get("lastLanguage");
  return result.lastLanguage || "简体中文";
};

// 保存选择的语言
const saveLastLanguage = (language) => {
  chrome.storage.sync.set({ lastLanguage: language });
};

export async function createQuickActionButtons(
  selectedText,
  handleActionClick,
  handleMainClick,
  handleCopyAction
) {
  // 🎯 核心逻辑：运用第一性原理，将"视觉选中态"与"浏览器焦点态"解耦
  // 通过 CSS Custom Highlight API 创建独立的视觉层，确保交互时的视觉连续性
  try {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && CSS && CSS.highlights) {
      const range = selection.getRangeAt(0);
      const highlight = new Highlight(range);
      CSS.highlights.set("deepseek-active-selection", highlight);
    }
  } catch (e) {
    // 降级处理：如果不支持 Highlight API，则仅依赖默认行为
    console.debug("DeepSeek: Selection highlight not supported", e);
  }

  // 🧹 添加全局点击监听器，用于在点击任意位置时清理高亮
  // 这是为了解决"点击焦点外内容时，被选中状态一直保留"的问题
  const clearHighlightHandler = (e) => {
    // 如果点击的是工具栏内部，不清理
    if (e.target.closest('.quick-action-buttons')) return;

    if (CSS && CSS.highlights) {
      CSS.highlights.delete("deepseek-active-selection");
    }
    // 清理后移除监听器
    document.removeEventListener('mousedown', clearHighlightHandler, true);
  };
  document.addEventListener('mousedown', clearHighlightHandler, true);

  const container = document.createElement("div");
  container.className = "quick-action-buttons";
  container.style.setProperty('background', '#ffffff', 'important');
  container.style.setProperty('backdrop-filter', 'none', 'important');
  container.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
  container.style.setProperty('padding', '6px 12px 8px 12px');
  container.style.opacity = '1';
  const shadowRoot = container.attachShadow({ mode: "open" });

  // 关闭快捷栏的小工具，避免与会话窗口并存
  const closeQAB = () => {
    // 🧹 清理视觉选中态
    if (CSS && CSS.highlights) {
      CSS.highlights.delete("deepseek-active-selection");
    }

    try {
      const wrapper = document.getElementById('quick-actions-wrapper');
      if (wrapper) {
        // 🎯 清理滚动监听器
        if (wrapper._scrollHandler) {
          window.removeEventListener('scroll', wrapper._scrollHandler, true);
          delete wrapper._scrollHandler;
        }

        if (wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        }
      }

      const legacy = document.getElementById('fixed-quick-actions-container');
      if (legacy) {
        legacy.style.opacity = '0';
        legacy.style.pointerEvents = 'none';
        legacy.innerHTML = '';
      }
      // 兜底：移除任何遗留的 .quick-action-buttons 节点
      document.querySelectorAll('.quick-action-buttons').forEach(node => {
        if (node && node !== container && node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });

      // 抑制 500ms 内的再次唤起
      try { window.suppressQuickActionsUntil = Date.now() + 500; } catch(_) {}
    } catch (_) {}
  };

  // 获取上次选择的语言
  const lastLanguage = await getLastLanguage();

  // 修改翻译按钮的默认 prompt
  const actions = [...QUICK_ACTIONS];
  const translateAction = actions.find((action) => action.id === "translate");
  if (translateAction) {
    translateAction.prompt = `Act as an AI assistant with MBTI persona ISTJ-INFJ, functioning as a professional multilingual translation engine that provides the ${lastLanguage} version of user-given content while preserving the original format (e.g., poetry, code, glossaries). If no target language is specified, ask proactively. Translate accurately and naturally in ${lastLanguage}. Output only the translated text without any explanations.`;
  }

  // 添加Shadow DOM所需样式 - 苹果设计哲学
  const style = document.createElement('style');
  style.textContent = `
    /* 主容器 - 极简主义设计 */
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border-radius: 12px;
      background: #f2f2f7 !important;
      box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.15),
        0 4px 12px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.08);
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      position: absolute;
      z-index: 2147483647;
      isolation: isolate;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
      font-size: 13px;
      line-height: 1.4;
      box-sizing: border-box;
      width: 380px !important;
      min-width: 320px;
      max-width: 92vw;
      pointer-events: auto;
      user-select: none;
      animation: quickActionsAppear 0.3s cubic-bezier(0.2, 0, 0.2, 1) forwards;
      transform-origin: center;
      will-change: transform, opacity;
    }

    /* 入场动画 - 简洁优雅 */
    @keyframes quickActionsAppear {
      0% {
        opacity: 0;
        transform: scale(0.9) translateY(-8px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* 按钮容器 - 流式布局 */
    .quick-action-buttons-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      width: 100%;
      justify-content: center;
      user-select: none;
    }

    /* 按钮基础样式 - 极简圆形 */
    .quick-action-button {
      box-sizing: border-box;
      width: 44px;
      height: 44px;
      padding: 0;
      margin: 0;
      border-radius: 50%;
      background: #f5f5f7;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.2, 0, 0.2, 1);
      outline: none;
      user-select: none;
      border: none;
      position: relative;
    }

    /* icon-wrapper在按钮中完全居中 */
    .quick-action-button .icon-wrapper {
      display: flex !important;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      margin: 0;
    }

    /* 按钮图标 - 精致尺寸 */
    .quick-action-button img,
    .quick-action-button svg {
      width: 20px !important;
      height: 20px !important;
      opacity: 0.8;
      transition: all 0.2s ease;
      flex-shrink: 0;
      display: block;
    }

    /* 悬停效果 - 微妙变化 */
    .quick-action-button:hover {
      background: #e6f0ff;
      transform: scale(1.05);
    }

    .quick-action-button:hover img,
    .quick-action-button:hover svg {
      opacity: 1;
    }

    /* 按下效果 - 简洁反馈 */
    .quick-action-button:active {
      transform: scale(0.95);
      background: #d4e5ff;
    }
    /* 语言选择菜单 - 极简设计 */
    .language-select {
      position: absolute;
      top: calc(100% + 4px);
      left: 50%;
      transform: translateX(-50%);
      min-width: 120px;
      max-height: 280px;
      overflow-y: auto;
      padding: 4px;
      border-radius: 8px;
      background: #ffffff;
      border: 0.5px solid rgba(0, 0, 0, 0.06);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      z-index: 2147483648;
      display: none;
      user-select: none;
      animation: menuSlideIn 0.2s cubic-bezier(0.2, 0, 0.2, 1);
    }

    @keyframes menuSlideIn {
      0% {
        opacity: 0;
        transform: translateX(-50%) translateY(-4px);
      }
      100% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* 语言选项 - 简洁按钮 */
    .language-option {
      width: 100%;
      padding: 8px 12px;
      cursor: pointer;
      background-color: transparent;
      border: none;
      text-align: left;
      color: #1d1d1f;
      white-space: nowrap;
      transition: all 0.15s ease;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      font-size: 13px;
      font-weight: 400;
      line-height: 1.3;
      border-radius: 6px;
      user-select: none;
    }

    .language-option:hover {
      background-color: rgba(0, 122, 255, 0.08);
    }

    .language-option:active {
      background-color: rgba(0, 122, 255, 0.12);
    }

    /* 输入框容器 - 简约设计 */
    .custom-input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      border-top: 0.5px solid rgba(0, 0, 0, 0.06);
    }

    /* 输入框 - 极简风格 */
    .custom-prompt-input {
      flex: 1;
      padding: 8px 10px;
      border-radius: 8px;
      background: #f5f5f7;
      border: 0.5px solid rgba(0, 0, 0, 0.06);
      color: #1d1d1f;
      font-size: 13px;
      line-height: 1.3;
      font-weight: 400;
      width: 100%;
      min-height: 32px;
      max-height: 64px;
      outline: none;
      transition: all 0.2s ease;
      overflow-y: auto;
      resize: none;
      user-select: text;
    }

    .custom-prompt-input::placeholder {
      color: rgba(60, 60, 67, 0.6);
      font-weight: 400;
    }

    /* 输入框聚焦 */
    .custom-prompt-input:focus {
      border-color: rgba(0, 122, 255, 0.4);
      background: #ffffff;
      box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
    }

    /* 发送按钮 - 简约圆形 */
    .custom-prompt-send {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      min-width: 32px;
      border-radius: 50%;
      background: #007aff;
      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
      border: none;
    }

    .custom-prompt-send:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
    }

    .custom-prompt-send:active {
      transform: scale(0.95);
      box-shadow: 0 1px 4px rgba(0, 122, 255, 0.3);
    }

    .custom-prompt-send svg {
      color: white;
      transition: transform 0.15s ease;
    }

    .custom-prompt-send:hover svg {
      transform: translateX(1px);
    }

    /* 抖动动画 - 简洁错误提示 */
    .shake {
      animation: shake 0.3s ease-in-out;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }

    /* Logo容器 - 可拖拽的极简展示 */
    .quick-action-logo {
      width: 100%;
      height: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      box-sizing: border-box;
      background: transparent;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      transition: opacity 0.2s ease;
    }

    .quick-action-logo:active {
      cursor: grabbing;
      opacity: 0.7;
    }

    /* 拖拽状态 */
    :host(.dragging) {
      opacity: 1;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15);
      transition: none;
    }

    .quick-action-logo img {
      height: 24px;
      width: auto;
      opacity: 0.8;
      transition: opacity 0.2s ease;
    }

    .quick-action-logo:hover img {
      opacity: 1;
    }

    /* 翻译按钮包装器 */
    .quick-action-translate {
      position: relative;
    }

    .quick-action-translate .quick-action-button {
      /* 继承正常按钮样式 */
    }

    /* 暗色模式适配 */
    @media (prefers-color-scheme: dark) {
      :host {
        background: #1c1c1e !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        border: 1px solid rgba(255, 255, 255, 0.15);
        box-shadow:
          0 20px 48px rgba(0, 0, 0, 0.6),
          0 8px 24px rgba(0, 0, 0, 0.4),
          inset 0 0 0 0.5px rgba(255, 255, 255, 0.1);
      }

      .quick-action-button {
        background: #3a3a3c;
        border: 0.5px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .quick-action-button:hover {
        background: rgba(10, 132, 255, 0.35);
        box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3);
        border-color: rgba(10, 132, 255, 0.4);
      }

      .quick-action-button:active {
        background: rgba(10, 132, 255, 0.45);
        transform: scale(0.95);
      }

      /* 暗色模式下图标颜色反转，确保可见性 */
      .quick-action-button img,
      .quick-action-button svg {
        filter: brightness(0) invert(1);
        opacity: 0.9;
      }

      .quick-action-button:hover img,
      .quick-action-button:hover svg {
        opacity: 1;
        filter: brightness(0) invert(1) drop-shadow(0 0 2px rgba(10, 132, 255, 0.5));
      }

      .custom-prompt-input {
        background: #3a3a3c;
        color: rgba(255, 255, 255, 0.95);
        border-color: rgba(255, 255, 255, 0.06);
      }

      .custom-prompt-input::placeholder {
        color: rgba(235, 235, 245, 0.5);
      }

      .custom-prompt-input:focus {
        background: #2c2c2e;
        border-color: rgba(10, 132, 255, 0.6);
      }

      .custom-input-wrapper {
        border-top-color: rgba(255, 255, 255, 0.06);
      }

      .language-select {
        background: #1c1c1e;
        border-color: rgba(255, 255, 255, 0.06);
      }

      .language-option {
        color: rgba(255, 255, 255, 0.95);
      }

      .language-option:hover {
        background-color: rgba(10, 132, 255, 0.15);
      }

      /* Logo容器暗色模式 - 保持完全透明 */
      .quick-action-logo {
        background: transparent;
        border: none;
        box-shadow: none;
      }

      .quick-action-logo:active {
        opacity: 0.7;
      }
    }
  `;

  // 将样式添加到Shadow DOM，确保与宿主页面隔离
  shadowRoot.appendChild(style);

  // 创建快捷按钮容器
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "quick-action-buttons-container";
  shadowRoot.appendChild(buttonsContainer);

  // 保存选中状态的通用函数
  const saveSelectionState = () => {
    const selection = window.getSelection();
    return selection && selection.toString ? selection.toString().trim() : "";
  };

  actions.forEach((action) => {
    if (action.id === "logo") {
      const logoContainer = document.createElement("div");
      logoContainer.className = "quick-action-logo";

      const logo = document.createElement("img");
      logo.src = chrome.runtime.getURL("icons/icon24.png");
      logo.style.pointerEvents = 'none'; // 防止图片拖拽干扰
      logo.setAttribute("draggable", "false");

      logoContainer.appendChild(logo);
      buttonsContainer.appendChild(logoContainer);

      // 添加拖拽功能
      // 注意：由于container还未添加到DOM，我们需要在返回后再初始化拖拽
      container.logoContainer = logoContainer; // 保存引用
    } else if (action.id === "copy") {
      const button = createSvgIcon(action.icon, action.title);
      button.className = "quick-action-button quick-action-copy";

      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof handleCopyAction === 'function') {
          handleCopyAction();
        }
      });

      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      buttonsContainer.appendChild(button);
    } else if (action.id === "main") {
      const button = createSvgIcon("icon24", action.title);
      button.className = "quick-action-button";

      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeQAB();
        const range = window.getSelection().getRangeAt(0);
        const rect = range.getBoundingClientRect();
        handleMainClick(e, selectedText, rect);
      };

      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      buttonsContainer.appendChild(button);
    } else if (action.id === "translate") {
      const wrapper = document.createElement("div");
      wrapper.className = "quick-action-translate";
      wrapper.style.position = "relative";

      const button = createSvgIcon(action.icon, action.title);
      button.className = "quick-action-button";

      const menu = document.createElement("div");
      menu.className = "language-select";

      // 直接点击翻译按钮时使用上次选择的语言
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeQAB();
        handleActionClick(action, selectedText);
      };

      action.languages.forEach((lang) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "language-option";
        option.textContent = lang.native;

        // 高亮上次选择的语言
        if (lang.native === lastLanguage) {
          option.style.fontWeight = "600";
          option.style.backgroundColor = "rgba(0, 122, 255, 0.1)";
        }

        option.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          await chrome.storage.sync.set({ lastLanguage: lang.native });

          action.prompt = `Act as an AI assistant with MBTI persona ISTJ-INFJ, functioning as a professional multilingual translation engine that provides the ${lang.native} version of user-given content while preserving the original format (such as poetry, code, glossaries). If no target language is specified, ask proactively. The translation MUST be accurate and natural in ${lang.native}. Output only the translated text directly without any additional explanation or clarification.`;

          closeQAB();
          handleActionClick(action, selectedText);
          menu.style.display = "none";
        });

        menu.appendChild(option);
      });

      let hideTimeout = null;

      const showMenu = () => {
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        menu.style.display = "grid";
      };

      const hideMenu = () => {
        hideTimeout = setTimeout(() => {
          menu.style.display = "none";
        }, 150);
      };

      wrapper.addEventListener("mouseenter", showMenu);
      wrapper.addEventListener("mouseleave", hideMenu);
      menu.addEventListener("mouseenter", showMenu);
      menu.addEventListener("mouseleave", hideMenu);

      wrapper.appendChild(button);
      wrapper.appendChild(menu);
      buttonsContainer.appendChild(wrapper);
    } else {
      const button = createSvgIcon(action.icon, action.title);
      button.className = "quick-action-button";

      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleActionClick(action, selectedText);
      };

      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      buttonsContainer.appendChild(button);
    }
  });

  // 创建自定义输入框
  const customInputWrapper = document.createElement("div");
  customInputWrapper.className = "custom-input-wrapper";

  // 创建输入框
  const customInput = document.createElement("textarea");
  customInput.className = "custom-prompt-input";
  customInput.placeholder = "Ask questions about the selected content...";

  // 事件处理
  customInput.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  }, true);

  customInput.addEventListener('click', (e) => {
    e.stopPropagation();
    customInput.focus();
  }, true);

  // 键盘事件
  customInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const customPrompt = customInput.value.trim();
      if (customPrompt) {
        const customAction = {
          id: "custom",
          title: "问答",
          prompt: customPrompt
        };
        handleActionClick(customAction, selectedText);
      } else {
        // 错误提示
        customInput.classList.add('shake');
        setTimeout(() => customInput.classList.remove('shake'), 500);
      }
    }
  });

  // 创建发送按钮
  const sendButton = document.createElement("button");
  sendButton.className = "custom-prompt-send";
  sendButton.title = "发送";

  // 发送图标
  const sendIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sendIcon.setAttribute("viewBox", "0 0 24 24");
  sendIcon.setAttribute("fill", "none");
  sendIcon.setAttribute("width", "18");
  sendIcon.setAttribute("height", "18");

  const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path1.setAttribute("d", "M22 2L11 13");
  path1.setAttribute("stroke", "currentColor");
  path1.setAttribute("stroke-width", "2");
  path1.setAttribute("stroke-linecap", "round");
  path1.setAttribute("stroke-linejoin", "round");

  const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path2.setAttribute("d", "M22 2L15 22L11 13L2 9L22 2Z");
  path2.setAttribute("stroke", "currentColor");
  path2.setAttribute("stroke-width", "2");
  path2.setAttribute("stroke-linecap", "round");
  path2.setAttribute("stroke-linejoin", "round");

  sendIcon.appendChild(path1);
  sendIcon.appendChild(path2);
  sendButton.appendChild(sendIcon);

  // 事件处理
  sendButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  sendButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const customPrompt = customInput.value.trim();
    if (customPrompt) {
      const customAction = {
        id: "custom",
        title: "问答",
        prompt: customPrompt
      };

      try {
        closeQAB();
        handleActionClick(customAction, selectedText);
      } catch (err) {
        console.error("处理自定义操作时出错:", err);
      }
    } else {
      // 错误提示
      customInput.classList.add('shake');
      setTimeout(() => customInput.classList.remove('shake'), 500);
    }
  }, true);

  customInputWrapper.appendChild(customInput);
  customInputWrapper.appendChild(sendButton);
  shadowRoot.appendChild(customInputWrapper);

  // 自动聚焦逻辑改为 no-op，保留原生选区，不干扰复制
  container.initFocus = function noop() {};

  // 初始化拖拽功能 - 返回初始化函数而不是立即执行
  container.initDrag = function() {
    const logoContainer = container.logoContainer;
    if (!logoContainer) return;

    const DRAG_THRESHOLD_PX = 3;
    let isDragging = false;
    let hasExceededThreshold = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let activePointerId = null;

    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    const getActualTarget = (event) => {
      if (event.composedPath) {
        const path = event.composedPath();
        for (const node of path) {
          if (node instanceof Element) {
            return node;
          }
        }
      }
      return event.target;
    };

    const isInInteractiveZone = (target) => {
      if (!target || typeof target.closest !== 'function') return false;
      return !!target.closest('.quick-action-button, .custom-prompt-input, .language-select, .language-option, .custom-prompt-send');
    };

    const markWrapperManual = () => {
      const wrapper = container.parentElement;
      if (!wrapper) return;
      if (wrapper.dataset.manualPosition !== 'true') {
        wrapper.dataset.manualPosition = 'true';
      }
    };

    let pointerCaptureTarget = null;

    const onPointerDown = (e) => {
      const actualTarget = getActualTarget(e);
      // 仅处理主指针并排除交互区域
      if (e.button !== undefined && e.button !== 0) return;
      if (isInInteractiveZone(actualTarget)) return;

      const wrapper = container.parentElement;
      if (!wrapper) return;

      // 仅允许从 logo 或容器空白处开始拖拽
      const isValidHandle =
        actualTarget === logoContainer ||
        (typeof actualTarget.closest === 'function' && actualTarget.closest('.quick-action-logo')) ||
        actualTarget === container;
      if (!isValidHandle) return;

      const rect = wrapper.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      startX = e.clientX;
      startY = e.clientY;
      hasExceededThreshold = false;
      isDragging = true;
      activePointerId = e.pointerId ?? null;

      // 更流畅的视觉与手势反馈
      container.classList.add('dragging');
      logoContainer.style.cursor = 'grabbing';
      wrapper.style.transition = 'none';
      pointerCaptureTarget = actualTarget;
      try { pointerCaptureTarget && pointerCaptureTarget.setPointerCapture && pointerCaptureTarget.setPointerCapture(activePointerId); } catch(_) {}

      if ('vibrate' in navigator) { navigator.vibrate(8); }

      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;

      const wrapper = container.parentElement;
      if (!wrapper) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasExceededThreshold && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
        hasExceededThreshold = true;
        markWrapperManual();
      }
      if (!hasExceededThreshold) return;

      const nextLeft = initialLeft + dx;
      const nextTop = initialTop + dy;

      const maxLeft = window.innerWidth - wrapper.offsetWidth;
      const maxTop = window.innerHeight - wrapper.offsetHeight;

      wrapper.style.left = `${clamp(nextLeft, 0, Math.max(0, maxLeft))}px`;
      wrapper.style.top = `${clamp(nextTop, 0, Math.max(0, maxTop))}px`;

      e.preventDefault();
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      if (activePointerId !== null && e.pointerId !== activePointerId) return;

      isDragging = false;
      activePointerId = null;

      const wrapper = container.parentElement;
      if (wrapper) {
        wrapper.style.transition = 'opacity 0.15s ease';
      }
      container.classList.remove('dragging');
      logoContainer.style.cursor = 'grab';
      try {
        if (pointerCaptureTarget && pointerCaptureTarget.releasePointerCapture) {
          pointerCaptureTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}
      pointerCaptureTarget = null;

      if ('vibrate' in navigator) { navigator.vibrate(5); }
    };

    // 绑定 Pointer 事件到容器与 logo，提升可拖拽命中率
    container.addEventListener('pointerdown', onPointerDown, true);
    logoContainer.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);

    // 保存清理函数
    container.cleanupDrag = () => {
      container.removeEventListener('pointerdown', onPointerDown, true);
      logoContainer.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
    };
  };

  return container;
}
