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
  const container = document.createElement("div");
  container.className = "quick-action-buttons";

  // 关闭快捷栏的小工具，避免与会话窗口并存
  const closeQAB = () => {
    try {
      const wrapper = document.getElementById('quick-actions-wrapper');
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
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

  // 添加Shadow DOM所需样式
  const style = document.createElement('style');
  style.textContent = `
    /* 主容器 - 紧凑卡片式设计 */
    .quick-action-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.92);
      box-shadow:
        0 16px 40px rgba(0, 0, 0, 0.14),
        0 4px 12px rgba(0, 0, 0, 0.08),
        inset 0 0 0 0.5px rgba(255, 255, 255, 0.6);
      border: 0.5px solid rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(40px) saturate(200%);
      -webkit-backdrop-filter: blur(40px) saturate(200%);
      position: absolute;
      z-index: 2147483647;
      isolation: isolate;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      font-size: 14px;
      line-height: 1.2;
      box-sizing: border-box;
      width: 320px;
      max-width: 90vw;
      pointer-events: auto;
      user-select: none;
      animation: quickActionsAppear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      transform-origin: top center;
      will-change: transform, opacity;
    }

    /* 入场动画 - 更有弹性 */
    @keyframes quickActionsAppear {
      0% {
        opacity: 0;
        transform: scale(0.85) translateY(-12px);
        filter: blur(4px);
      }
      60% {
        opacity: 1;
        transform: scale(1.03) translateY(2px);
        filter: blur(0px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
        filter: blur(0px);
      }
    }

    /* 按钮容器 - 简洁网格 */
    .quick-action-buttons-container {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      width: 100%;
      user-select: none;
    }

    /* 按钮基础样式 - 简单方形 */
    .quick-action-button {
      box-sizing: border-box;
      aspect-ratio: 1 / 1;
      width: 100%;
      padding: 0;
      margin: 0;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(242, 242, 247, 0.4), rgba(242, 242, 247, 0.8));
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      outline: none;
      user-select: none;
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    /* 按钮图标 */
    .quick-action-button img,
    .quick-action-button svg {
      width: 24px !important;
      height: 24px !important;
      opacity: 0.85;
      transition: all 0.3s ease;
      flex-shrink: 0;
    }

    /* 悬停效果 */
    .quick-action-button:hover {
      background: linear-gradient(135deg, rgba(0, 122, 255, 0.08), rgba(0, 122, 255, 0.12));
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 122, 255, 0.2);
      border-color: rgba(0, 122, 255, 0.2);
    }

    .quick-action-button:hover img,
    .quick-action-button:hover svg {
      opacity: 1;
      transform: scale(1.15);
    }

    /* 按下效果 */
    .quick-action-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(0, 122, 255, 0.15);
      background: linear-gradient(135deg, rgba(0, 122, 255, 0.12), rgba(0, 122, 255, 0.18));
    }
    /* 语言选择菜单 - 优雅下拉 */
    .language-select {
      position: absolute;
      top: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      min-width: 140px;
      max-height: 320px;
      overflow-y: auto;
      padding: 6px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.92);
      border: 0.5px solid rgba(0, 0, 0, 0.08);
      box-shadow:
        0 12px 28px rgba(0, 0, 0, 0.15),
        0 2px 8px rgba(0, 0, 0, 0.08);
      backdrop-filter: blur(30px) saturate(180%);
      -webkit-backdrop-filter: blur(30px) saturate(180%);
      z-index: 2147483648;
      display: none;
      grid-template-columns: 1fr;
      gap: 2px;
      user-select: none;
      animation: menuSlideIn 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes menuSlideIn {
      0% {
        opacity: 0;
        transform: translateX(-50%) translateY(-8px);
      }
      100% {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    /* 语言选项 - 精致按钮 */
    .language-option {
      width: 100%;
      padding: 10px 18px;
      cursor: pointer;
      background-color: transparent;
      border: none;
      text-align: center;
      color: #1d1d1f;
      white-space: nowrap;
      transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      font-size: 15px;
      font-weight: 400;
      line-height: 1.2;
      border-radius: 10px;
      user-select: none;
    }

    .language-option:hover {
      background-color: rgba(0, 122, 255, 0.08);
      transform: scale(1.02);
    }

    .language-option:active {
      background-color: rgba(0, 122, 255, 0.15);
      transform: scale(0.98);
    }
    /* 输入框容器 - 底部固定 */
    .custom-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      order: 10; /* 确保在底部 */
      padding-top: 6px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }

    /* 输入框 - 精致设计 */
    .custom-prompt-input {
      flex: 1;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(242, 242, 247, 0.6);
      border: 1.5px solid rgba(0, 0, 0, 0.04);
      color: #1d1d1f;
      font-size: 14px;
      line-height: 1.4;
      font-weight: 400;
      width: 100%;
      min-height: 38px;
      max-height: 80px;
      outline: none;
      transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      overflow-y: auto;
      resize: none;
      user-select: text;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .custom-prompt-input::placeholder {
      color: rgba(60, 60, 67, 0.5);
      font-weight: 400;
    }

    /* 输入框聚焦 */
    .custom-prompt-input:focus {
      border-color: rgba(0, 122, 255, 0.5);
      background: rgba(255, 255, 255, 0.9);
      box-shadow:
        0 0 0 3px rgba(0, 122, 255, 0.12),
        inset 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    /* 发送按钮 - 精致圆形 */
    .custom-prompt-send {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      min-width: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #007aff, #0a84ff);
      box-shadow:
        0 3px 10px rgba(0, 122, 255, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      user-select: none;
      border: none;
      opacity: 1;
    }

    .custom-prompt-send:hover {
      transform: scale(1.1);
      box-shadow:
        0 5px 16px rgba(0, 122, 255, 0.45),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .custom-prompt-send:active {
      transform: scale(0.95);
      box-shadow:
        0 2px 6px rgba(0, 122, 255, 0.3),
        inset 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    .custom-prompt-send svg {
      color: white;
      opacity: 1;
      transition: transform 0.25s ease;
    }

    .custom-prompt-send:hover svg {
      transform: scale(1.08) translateX(1px);
    }
    /* 抖动动画 - 错误提示 */
    .shake {
      animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }

    /* Logo容器 - 跨2列 */
    .quick-action-logo {
      grid-column: span 2;
      aspect-ratio: 2 / 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      box-sizing: border-box;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(242, 242, 247, 0.6), rgba(255, 255, 255, 0.8));
      border: 1px solid rgba(0, 0, 0, 0.04);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      cursor: default;
    }

    .quick-action-logo img {
      max-width: 100%;
      max-height: 100%;
      width: auto !important;
      height: auto !important;
      opacity: 0.95;
      transition: all 0.3s ease;
    }

    .quick-action-logo:hover {
      transform: scale(1.02);
    }

    .quick-action-logo:hover img {
      opacity: 1;
    }

    /* 翻译按钮包装器 */
    .quick-action-translate {
      position: relative;
      display: contents; /* 让子元素继承grid布局 */
    }

    .quick-action-translate .quick-action-button {
      /* 继承正常按钮样式 */
    }

    /* 暗色模式适配 */
    @media (prefers-color-scheme: dark) {
      .quick-action-buttons {
        background: rgba(28, 28, 30, 0.92);
        border-color: rgba(255, 255, 255, 0.06);
        box-shadow:
          0 16px 40px rgba(0, 0, 0, 0.5),
          0 4px 12px rgba(0, 0, 0, 0.3),
          inset 0 0 0 0.5px rgba(255, 255, 255, 0.08);
      }

      .quick-action-button {
        background: linear-gradient(135deg, rgba(58, 58, 60, 0.4), rgba(58, 58, 60, 0.7));
        border-color: rgba(255, 255, 255, 0.06);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }

      .quick-action-button:hover {
        background: linear-gradient(135deg, rgba(10, 132, 255, 0.15), rgba(10, 132, 255, 0.2));
        box-shadow: 0 6px 16px rgba(10, 132, 255, 0.3);
        border-color: rgba(10, 132, 255, 0.3);
      }

      .quick-action-button:active {
        background: linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(10, 132, 255, 0.3));
      }

      .custom-prompt-input {
        background: rgba(58, 58, 60, 0.6);
        color: rgba(255, 255, 255, 0.95);
        border-color: rgba(255, 255, 255, 0.06);
      }

      .custom-prompt-input::placeholder {
        color: rgba(235, 235, 245, 0.5);
      }

      .custom-prompt-input:focus {
        background: rgba(68, 68, 70, 0.9);
        border-color: rgba(10, 132, 255, 0.6);
      }

      .custom-input-wrapper {
        border-top-color: rgba(255, 255, 255, 0.06);
      }

      .language-select {
        background: rgba(28, 28, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.06);
      }

      .language-option {
        color: rgba(255, 255, 255, 0.95);
      }

      .language-option:hover {
        background-color: rgba(10, 132, 255, 0.15);
      }

      .quick-action-logo {
        background: linear-gradient(135deg, rgba(58, 58, 60, 0.6), rgba(68, 68, 70, 0.8));
        border-color: rgba(255, 255, 255, 0.06);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
    }
  `;

  // 将样式添加到容器中，确保在Shadow DOM中生效
  container.appendChild(style);

  // 创建快捷按钮容器
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "quick-action-buttons-container";
  container.appendChild(buttonsContainer);

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

      logoContainer.appendChild(logo);
      buttonsContainer.appendChild(logoContainer);
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

      wrapper.addEventListener("mouseenter", () => {
        menu.style.display = "grid";
      });

      wrapper.addEventListener("mouseleave", () => {
        menu.style.display = "none";
      });

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
  container.appendChild(customInputWrapper);

  return container;
}
