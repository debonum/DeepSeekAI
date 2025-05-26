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
    prompt: "Your task is to interpret the content input by the user.",
  },
  {
    id: "summarize",
    icon: "summarize",
    title: "Summarize",
    prompt: "Your task is to summarize the content input by the user.",
  },
  {
    id: "email",
    icon: "email",
    title: "Email",
    prompt: "Your task is to write an email based on the user's input.",
  },
  {
    id: "analyze",
    icon: "analyze",
    title: "Analyze",
    prompt: "Your task is to analyze the content entered by the user.",
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

  // 获取上次选择的语言
  const lastLanguage = await getLastLanguage();

  // 修改翻译按钮的默认 prompt
  const actions = [...QUICK_ACTIONS];
  const translateAction = actions.find((action) => action.id === "translate");
  if (translateAction) {
    translateAction.prompt = `You are a professional multilingual translation engine that provides the ${lastLanguage}：version of user-given content, supporting dynamic context understanding and cross-round memory.Core Functions:Automatically identify the language of input content (if not explicitly specified by the user).Support mutual translation between mainstream languages while preserving the original format (such as poetry, code, glossaries).Record previous translation content, allowing users to make corrections through vague instructions (e.g., "translate the last sentence into French" or "adjust the formality of the last paragraph").Multi-Round Processing Mechanism If no target language is specified by the user, proactively inquire about theirneeds.When users refer to previous text (e.g., "modify wording in the third translation"), accurately locate historical records for precise positioning. Provide differentiated translation suggestions for different styles such as technical documents and colloquial texts.The translation MUST be accurate and natural in ${lastLanguage},You only need to provide the translated text directly, clearly and without any additional explanation or clarification.`;
  }

  // 添加Shadow DOM所需样式
  const style = document.createElement('style');
  style.textContent = `
    .quick-action-buttons {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 8px 8px;
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 0.95);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      position: absolute;
      z-index: 2147483647;
      isolation: isolate;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      font-size: 14px;
      line-height: 1;
      box-sizing: content-box;
      min-width: 320px;
      pointer-events: auto;
      user-select: none;
    }
    .quick-action-buttons-container {
      display: flex;
      align-items: center;
      gap: 4px;
      width: calc(100% - 8px);
      justify-content: center;
      user-select: none;
    }
    .quick-action-button {
      box-sizing: border-box;
      width: 32px;
      height: 32px;
      padding: 4px;
      margin: 0;
      border-radius: 6px;
      background-color: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      opacity: 0.7;
      position: relative;
      outline: none;
      user-select: none;
      border: none;
    }
    .quick-action-button:hover {
      opacity: 1;
      transform: scale(1.1);
      background-color: rgba(0, 0, 0, 0.05);
    }
    .language-select {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      min-width: 120px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 2px;
      padding: 2px;
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      display: none;
      grid-template-columns: 1fr;
      gap: 2px;
      user-select: none;
    }
    .language-option {
      width: 100%;
      padding: 8px 16px;
      cursor: pointer;
      background-color: transparent;
      border: none;
      text-align: center;
      color: #000000;
      white-space: nowrap;
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.4;
      border-radius: 6px;
      user-select: none;
    }
    .language-option:hover {
      background-color: rgba(0, 0, 0, 0.05);
      transform: scale(1.02);
    }
    .custom-input-wrapper {
      display: flex;
      align-items: center;
      width: calc(100% - 8px);
    }
    .custom-prompt-input {
      flex: 1;
      padding: 8px 10px;
      border-radius: 8px;
      background-color: rgba(242, 242, 247, 0.9);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #000000;
      font-size: 13px;
      line-height: 1.4;
      width: 100%;
      min-height: 36px;
      max-height: 80px;
      outline: none;
      transition: all 0.2s ease;
      overflow-y: auto;
      resize: vertical;
      user-select: text;
    }
    .custom-prompt-input:focus {
      border-color: #0066cc;
      box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
    }
    .custom-prompt-send {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background-color: transparent;
      margin-left: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      user-select: none;
    }
    .custom-prompt-send:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    .shake {
      animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
    /* 暗色模式支持 */
    @media (prefers-color-scheme: dark) {
      .quick-action-buttons {
        background-color: rgba(32, 33, 35, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .quick-action-button:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .quick-action-button {
        filter: invert(1) brightness(1.5);
      }
      .custom-prompt-input {
        background-color: rgba(58, 58, 60, 0.8);
        color: #ffffff;
      }
      .language-select {
        background-color: rgba(32, 33, 35, 0.95);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .language-option {
        color: #ffffff;
      }
      .language-option:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .custom-prompt-send svg {
        color: #ffffff;
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
      const logo = document.createElement("img");
      logo.src = chrome.runtime.getURL("icons/icon24.png");
      logo.className = "quick-action-logo";
      logo.style.width = "32px";
      logo.style.height = "32px";
      logo.style.opacity = "1";
      logo.style.cursor = "default";
      buttonsContainer.appendChild(logo);
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

      button.addEventListener("mouseenter", () => {
        button.style.opacity = "1";
        button.style.transform = "scale(1.1)";
        button.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
      });

      button.addEventListener("mouseleave", () => {
        button.style.opacity = "0.7";
        button.style.transform = "scale(1)";
        button.style.backgroundColor = "transparent";
      });

      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const range = window.getSelection().getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 直接调用传入的处理函数
        handleMainClick(e, selectedText, rect);
      };

      // 阻止所有鼠标事件传播
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      buttonsContainer.appendChild(button);
    } else if (action.id === "translate") {
      const wrapper = document.createElement("div");
      wrapper.className = "quick-action-translate";
      wrapper.style.position = "relative";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";

      const button = createSvgIcon(action.icon, action.title);
      button.className = "quick-action-button";

      const menu = document.createElement("div");
      menu.className = "language-select";

      // 直接点击翻译按钮时使用上次选择的语言
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 执行操作
        handleActionClick(action, selectedText);
      };

      action.languages.forEach((lang) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "language-option";
        option.textContent = lang.native;

        // 如果是上次选择的语言，添加高亮样式
        if (lang.native === lastLanguage) {
          option.style.fontWeight = "600";
          option.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
        }

        option.addEventListener("mouseenter", () => {
          option.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
          option.style.transform = "scale(1.02)";
        });

        option.addEventListener("mouseleave", () => {
          if (lang.native !== lastLanguage) {
            option.style.backgroundColor = "transparent";
          }
          option.style.transform = "scale(1)";
        });

        option.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          // 保存用户选择的语言
          await chrome.storage.sync.set({ lastLanguage: lang.native });

          // 修改prompt中的语言
          action.prompt = `You are a professional multilingual translation engine that provides the ${lang.native}：version of user-given content, supporting dynamic context understanding and cross-round memory.Core Functions:Automatically identify the language of input content (if not explicitly specified by the user).Support mutual translation between mainstream languages while preserving the original format (such as poetry, code, glossaries).Record previous translation content, allowing users to make corrections through vague instructions (e.g., "translate the last sentence into French" or "adjust the formality of the last paragraph").Multi-Round Processing Mechanism If no target language is specified by the user, proactively inquire about theirneeds.When users refer to previous text (e.g., "modify wording in the third translation"), accurately locate historical records for precise positioning. Provide differentiated translation suggestions for different styles such as technical documents and colloquial texts.The translation MUST be accurate and natural in ${lang.native},You only need to provide the translated text directly, clearly and without any additional explanation or clarification.`;

          // 处理动作
          handleActionClick(action, selectedText);

          // 隐藏菜单
          menu.style.display = "none";
        });

        menu.appendChild(option);
      });

      wrapper.addEventListener("mouseenter", (e) => {
        menu.style.display = "grid";
        button.style.opacity = "1";
        button.style.transform = "scale(1.1)";
        button.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
      });

      wrapper.addEventListener("mouseleave", (e) => {
        menu.style.display = "none";
        button.style.opacity = "0.7";
        button.style.transform = "scale(1)";
        button.style.backgroundColor = "transparent";
      });

      wrapper.appendChild(button);
      wrapper.appendChild(menu);
      buttonsContainer.appendChild(wrapper);
    } else {
      const button = createSvgIcon(action.icon, action.title);
      button.className = "quick-action-button";

      button.addEventListener("mouseenter", (e) => {
        button.style.opacity = "1";
        button.style.transform = "scale(1.1)";
        button.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
      });

      button.addEventListener("mouseleave", (e) => {
        button.style.opacity = "0.7";
        button.style.transform = "scale(1)";
        button.style.backgroundColor = "transparent";
      });

      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 执行操作
        handleActionClick(action, selectedText);
      };

      // 阻止所有鼠标事件传播
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

  customInput.addEventListener("focus", () => {
    customInput.style.borderColor = "#0066cc";
    customInput.style.boxShadow = "0 0 0 2px rgba(0, 102, 204, 0.2)";
  });

  customInput.addEventListener("blur", () => {
    customInput.style.borderColor = "rgba(0, 0, 0, 0.1)";
    customInput.style.boxShadow = "none";
  });

  // 为输入框添加事件处理
  customInput.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  }, true);

  // 添加click事件确保可以正常获得焦点
  customInput.addEventListener('click', (e) => {
    e.stopPropagation();
    // 确保点击时强制获得焦点
    customInput.focus();
  }, true);

  // 自动聚焦
  setTimeout(() => customInput.focus(), 50);

  // 添加键盘事件处理
  customInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const customPrompt = customInput.value.trim();
      if (customPrompt) {
        // 创建自定义操作
        const customAction = {
          id: "custom",
          title: "问答",
          prompt: customPrompt
        };

        // 执行操作
        handleActionClick(customAction, selectedText);
      } else {
        // 输入为空时轻微抖动输入框并添加红色边框提示
        customInput.style.borderColor = "rgba(255, 0, 0, 0.5)";
        customInput.style.boxShadow = "0 0 0 2px rgba(255, 0, 0, 0.2)";
        customInput.classList.add('shake');
        setTimeout(() => {
          customInput.style.borderColor = "rgba(0, 0, 0, 0.1)";
          customInput.style.boxShadow = "none";
          customInput.classList.remove('shake');
        }, 820);
      }
    }
  });

  // 创建发送按钮
  const sendButton = document.createElement("button");
  sendButton.className = "custom-prompt-send";
  sendButton.title = "发送";

  // 发送按钮图标
  const sendIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sendIcon.setAttribute("viewBox", "0 0 24 24");
  sendIcon.setAttribute("fill", "none");
  sendIcon.setAttribute("width", "16");
  sendIcon.setAttribute("height", "16");
  sendIcon.style.color = "#000000";
  sendIcon.style.opacity = "0.7";

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

  sendButton.addEventListener("mouseenter", () => {
    sendButton.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
    sendIcon.style.opacity = "1";
    sendIcon.style.transform = "scale(1.1)";
  });

  sendButton.addEventListener("mouseleave", () => {
    sendButton.style.backgroundColor = "transparent";
    sendIcon.style.opacity = "0.7";
    sendIcon.style.transform = "scale(1)";
  });

  // 修改发送按钮的点击事件
  sendButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  sendButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const customPrompt = customInput.value.trim();
    if (customPrompt) {
      // 创建自定义操作
      const customAction = {
        id: "custom",
        title: "问答",
        prompt: customPrompt
      };

      // 使用当前选中文本
      const textToUse = selectedText;

      // 执行操作
      try {
        handleActionClick(customAction, textToUse);
      } catch (err) {
        console.error("处理自定义操作时出错:", err);
      }
    } else {
      // 输入为空时轻微抖动输入框并添加红色边框提示
      customInput.style.borderColor = "rgba(255, 0, 0, 0.5)";
      customInput.style.boxShadow = "0 0 0 2px rgba(255, 0, 0, 0.2)";
      customInput.classList.add('shake');
      setTimeout(() => {
        customInput.style.borderColor = "rgba(0, 0, 0, 0.1)";
        customInput.style.boxShadow = "none";
        customInput.classList.remove('shake');
      }, 820);
    }
  }, true);

  customInputWrapper.appendChild(customInput);
  customInputWrapper.appendChild(sendButton);
  container.appendChild(customInputWrapper);

  return container;
}
