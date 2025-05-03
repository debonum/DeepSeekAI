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
  handleMainClick
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

  // 监听主题变化
  watchThemeChanges((isDark) => {
    const themeVars = {
      "--quick-action-bg": isDark
        ? "rgba(32, 33, 35, 0.95)"
        : "rgba(255, 255, 255, 0.95)",
      "--quick-action-text": isDark ? "#ffffff" : "#000000",
      "--quick-action-border": isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.1)",
      "--quick-action-shadow": isDark
        ? "0 2px 8px rgba(0, 0, 0, 0.3)"
        : "0 2px 8px rgba(0, 0, 0, 0.1)",
      "--quick-action-hover": isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(0, 0, 0, 0.05)",
      "--quick-action-icon-filter": isDark
        ? "invert(1) brightness(1.5)"
        : "none",
      "--accent-color": "#0066cc",
    };

    Object.entries(themeVars).forEach(([key, value]) => {
      container.style.setProperty(key, value);
    });

    // 同时更新自定义输入框的样式
    const customInput = container.querySelector('.custom-prompt-input');
    if (customInput) {
      customInput.style.backgroundColor = isDark ? "rgba(58, 58, 60, 0.8)" : "rgba(242, 242, 247, 0.9)";
      customInput.style.color = isDark ? "#ffffff" : "#000000";
    }

    // 更新发送按钮颜色
    const sendIcon = container.querySelector('.custom-prompt-send svg');
    if (sendIcon) {
      sendIcon.style.color = isDark ? "#ffffff" : "#000000";
    }
  });

  // 基础样式重置
  const resetStyles = {
    boxSizing: "border-box",
    margin: "0",
    padding: "0",
    border: "none",
    font: "inherit",
    verticalAlign: "baseline",
    lineHeight: "1",
    color: "inherit",
  };

  // 容器样式
  Object.assign(container.style, {
    ...resetStyles,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "8px 8px",
    borderRadius: "12px",
    backgroundColor: "var(--quick-action-bg, rgba(255, 255, 255, 0.95))",
    boxShadow: "var(--quick-action-shadow, 0 2px 8px rgba(0, 0, 0, 0.1))",
    border: "1px solid var(--quick-action-border, rgba(0, 0, 0, 0.1))",
    backdropFilter: "blur(8px)",
    "-webkit-backdrop-filter": "blur(8px)",
    position: "absolute",
    zIndex: "2147483647",
    isolation: "isolate",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
    fontSize: "14px",
    lineHeight: "1",
    boxSizing: "content-box",
    minWidth: "320px",
  });

  // 创建快捷按钮容器
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "quick-action-buttons-container";
  Object.assign(buttonsContainer.style, {
    ...resetStyles,
    display: "flex",
    alignItems: "center",
    gap: "4px",
    width: "calc(100% - 8px)",
    justifyContent: "center"
  });
  container.appendChild(buttonsContainer);

  // 按钮基础样式
  const buttonBaseStyles = {
    boxSizing: "border-box",
    width: "32px",
    height: "32px",
    padding: "4px",
    margin: "0",
    borderRadius: "6px",
    backgroundColor: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    opacity: "0.7",
    position: "relative",
    outline: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    flexShrink: "0",
    flexGrow: "0",
    border: "none",
  };

  actions.forEach((action) => {
    if (action.id === "logo") {
      const logo = document.createElement("img");
      logo.src = chrome.runtime.getURL("icons/icon24.png");
      logo.className = "quick-action-logo";
      Object.assign(logo.style, {
        ...buttonBaseStyles,
        opacity: "1",
        cursor: "default",
      });
      buttonsContainer.appendChild(logo);
    } else if (action.id === "main") {
      const button = createSvgIcon("icon24", action.title);
      button.className = "quick-action-button";
      Object.assign(button.style, {
        ...buttonBaseStyles,
        filter: "var(--quick-action-icon-filter, none)",
      });

      button.addEventListener("mouseenter", () => {
        button.style.opacity = "1";
        button.style.transform = "scale(1.1)";
        button.style.backgroundColor =
          "var(--quick-action-hover, rgba(0, 0, 0, 0.05))";
      });

      button.addEventListener("mouseleave", () => {
        button.style.opacity = "0.7";
        button.style.transform = "scale(1)";
        button.style.backgroundColor = "transparent";
      });

      button.onclick = (e) => {
        const selection = window.getSelection();
        // 保存选中状态以便恢复
        let storedRange = null;
        if (selection && selection.rangeCount > 0) {
          storedRange = selection.getRangeAt(0).cloneRange();
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // 处理前先阻止事件传播
        e.preventDefault();
        e.stopPropagation();

        // 调用处理函数
        handleMainClick(e, selectedText, rect); // 直接传递选中文本的位置

        // 尝试恢复选中状态（虽然此时可能已经打开弹窗，恢复选中状态可能没有意义）
        if (storedRange) {
          setTimeout(() => {
            try {
              selection.removeAllRanges();
              selection.addRange(storedRange);
            } catch(err) {
              console.error("恢复选中状态出错:", err);
            }
          }, 0);
        }
      };

      // 在点击时保留选中状态
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      buttonsContainer.appendChild(button);
    } else if (action.id === "translate") {
      const wrapper = document.createElement("div");
      wrapper.className = "quick-action-translate";
      Object.assign(wrapper.style, {
        position: "relative",
        display: "flex",
        alignItems: "center",
      });

      const button = createSvgIcon(action.icon, action.title);
      button.className = "quick-action-button";
      Object.assign(button.style, {
        ...buttonBaseStyles,
        filter: "var(--quick-action-icon-filter, none)",
      });

      const menu = document.createElement("div");
      menu.className = "language-select";
      Object.assign(menu.style, {
        position: "absolute",
        top: "100%",
        left: "50%",
        transform: "translateX(-50%)",
        display: "none",
        marginTop: "2px",
        padding: "2px",
        borderRadius: "12px",
        backgroundColor: "var(--quick-action-bg, rgba(255, 255, 255, 0.95))",
        border: "1px solid var(--quick-action-border, rgba(0, 0, 0, 0.1))",
        boxShadow: "var(--quick-action-shadow, 0 2px 8px rgba(0, 0, 0, 0.1))",
        zIndex: "2147483647",
        width: "auto",
        maxHeight: "400px",
        overflowY: "auto",
        backdropFilter: "blur(8px)",
        "-webkit-backdrop-filter": "blur(8px)",
        display: "none",
        gridTemplateColumns: "1fr",
        gap: "2px",
      });

      // 直接点击翻译按钮时使用上次选择的语言
      button.onclick = (e) => {
        // 保存选中状态
        const selection = window.getSelection();
        let storedRange = null;
        if (selection && selection.rangeCount > 0) {
          storedRange = selection.getRangeAt(0).cloneRange();
        }

        // 阻止事件
        e.preventDefault();
        e.stopPropagation();

        // 执行操作
        handleActionClick(action, selectedText);

        // 尝试恢复选中状态
        if (storedRange) {
          setTimeout(() => {
            try {
              selection.removeAllRanges();
              selection.addRange(storedRange);
            } catch(err) {
              console.error("恢复选中状态出错:", err);
            }
          }, 0);
        }
      };

      action.languages.forEach((lang) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "language-option";
        option.textContent = lang.native;

        // 如果是上次选择的语言，添加高亮样式
        if (lang.native === lastLanguage) {
          Object.assign(option.style, {
            ...resetStyles,
            width: "100%",
            padding: "8px 16px",
            cursor: "pointer",
            backgroundColor: "var(--quick-action-hover, rgba(0, 0, 0, 0.05))",
            border: "none",
            textAlign: "center",
            color: "var(--quick-action-text, #000000)",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
            fontSize: "14px",
            fontWeight: "600",
            lineHeight: "1.4",
            borderRadius: "6px",
          });
        } else {
          Object.assign(option.style, {
            ...resetStyles,
            width: "100%",
            padding: "8px 16px",
            cursor: "pointer",
            backgroundColor: "transparent",
            border: "none",
            textAlign: "center",
            color: "var(--quick-action-text, #000000)",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
            fontSize: "14px",
            fontWeight: "400",
            lineHeight: "1.4",
            borderRadius: "6px",
          });
        }

        option.addEventListener("mouseenter", () => {
          option.style.backgroundColor =
            "var(--quick-action-hover, rgba(0, 0, 0, 0.05))";
          option.style.transform = "scale(1.02)";
        });

        option.addEventListener("mouseleave", () => {
          if (lang.native !== lastLanguage) {
            option.style.backgroundColor = "transparent";
          }
          option.style.transform = "scale(1)";
        });

        option.addEventListener("click", async () => {
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

      wrapper.addEventListener("mouseenter", () => {
        menu.style.display = "grid";
        button.style.opacity = "1";
        button.style.transform = "scale(1.1)";
        button.style.backgroundColor =
          "var(--quick-action-hover, rgba(0, 0, 0, 0.05))";
      });

      wrapper.addEventListener("mouseleave", () => {
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
      Object.assign(button.style, {
        ...buttonBaseStyles,
        filter: "var(--quick-action-icon-filter, none)",
      });

      button.addEventListener("mouseenter", () => {
        button.style.opacity = "1";
        button.style.transform = "scale(1.1)";
        button.style.backgroundColor =
          "var(--quick-action-hover, rgba(0, 0, 0, 0.05))";
      });

      button.addEventListener("mouseleave", () => {
        button.style.opacity = "0.7";
        button.style.transform = "scale(1)";
        button.style.backgroundColor = "transparent";
      });

      button.onclick = (e) => {
        // 保存选中状态
        const selection = window.getSelection();
        let storedRange = null;
        if (selection && selection.rangeCount > 0) {
          storedRange = selection.getRangeAt(0).cloneRange();
        }

        // 阻止事件
        e.preventDefault();
        e.stopPropagation();

        // 执行操作
        handleActionClick(action, selectedText);

        // 尝试恢复选中状态
        if (storedRange) {
          setTimeout(() => {
            try {
              selection.removeAllRanges();
              selection.addRange(storedRange);
            } catch(err) {
              console.error("恢复选中状态出错:", err);
            }
          }, 0);
        }
      };
      buttonsContainer.appendChild(button);
    }
  });

  // 为容器本身添加事件处理器，阻止事件冒泡，防止选中文本消失
  buttonsContainer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  }, true);

  // 创建自定义输入框
  const customInputWrapper = document.createElement("div");
  customInputWrapper.className = "custom-input-wrapper";
  Object.assign(customInputWrapper.style, {
    ...resetStyles,
    display: "flex",
    alignItems: "center",
    width: "calc(100% - 8px)",
  });

  // 创建输入框
  const customInput = document.createElement("textarea");
  customInput.className = "custom-prompt-input";
  customInput.placeholder = "Ask questions about the selected content...";
  Object.assign(customInput.style, {
    ...resetStyles,
    flex: "1",
    padding: "8px 10px",
    borderRadius: "8px",
    backgroundColor: "var(--quick-action-bg)",
    border: "1px solid var(--quick-action-border, rgba(0, 0, 0, 0.1))",
    color: "var(--quick-action-text, #000000)",
    fontSize: "13px",
    lineHeight: "1.4",
    width: "100%",
    minHeight: "36px",
    maxHeight: "80px",
    outline: "none",
    transition: "all 0.2s ease",
    overflowY: "auto",
    resize: "vertical"
  });

  customInput.addEventListener("focus", () => {
    customInput.style.borderColor = "var(--accent-color, #0066cc)";
    customInput.style.boxShadow = "0 0 0 2px rgba(0, 102, 204, 0.2)";
  });

  customInput.addEventListener("blur", () => {
    customInput.style.borderColor = "var(--quick-action-border, rgba(0, 0, 0, 0.1))";
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

      // 保存选择状态
      const selection = window.getSelection();
      let storedRange = null;
      if (selection && selection.rangeCount > 0) {
        storedRange = selection.getRangeAt(0).cloneRange();
      }

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

        // 尝试恢复选中状态（可能已经打开弹窗，恢复可能没有意义）
        if (storedRange) {
          setTimeout(() => {
            try {
              selection.removeAllRanges();
              selection.addRange(storedRange);
            } catch(err) {
              console.error("恢复选中状态出错:", err);
            }
          }, 0);
        }
      } else {
        // 输入为空时轻微抖动输入框并添加红色边框提示
        customInput.style.borderColor = "rgba(255, 0, 0, 0.5)";
        customInput.style.boxShadow = "0 0 0 2px rgba(255, 0, 0, 0.2)";
        customInput.classList.add('shake');
        setTimeout(() => {
          customInput.style.borderColor = "var(--quick-action-border, rgba(0, 0, 0, 0.1))";
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
  Object.assign(sendButton.style, {
    ...resetStyles,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    backgroundColor: "transparent",
    marginLeft: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  // 发送按钮图标
  const sendIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  sendIcon.setAttribute("viewBox", "0 0 24 24");
  sendIcon.setAttribute("fill", "none");
  sendIcon.setAttribute("width", "16");
  sendIcon.setAttribute("height", "16");
  Object.assign(sendIcon.style, {
    color: "var(--quick-action-text, #000000)",
    opacity: "0.7",
  });

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
    sendButton.style.backgroundColor = "var(--quick-action-hover, rgba(0, 0, 0, 0.05))";
    sendIcon.style.opacity = "1";
    sendIcon.style.transform = "scale(1.1)";
  });

  sendButton.addEventListener("mouseleave", () => {
    sendButton.style.backgroundColor = "transparent";
    sendIcon.style.opacity = "0.7";
    sendIcon.style.transform = "scale(1)";
  });

  // 修改发送按钮的点击事件，阻止冒泡并检查内容非空
  sendButton.addEventListener("mousedown", (e) => {
    // 阻止事件冒泡，防止容器被隐藏
    e.stopPropagation();
    e.preventDefault();
  });

  sendButton.addEventListener("click", (e) => {
    // 阻止事件冒泡，防止容器被隐藏
    e.stopPropagation();
    e.preventDefault();

    // 保存选中状态
    const selection = window.getSelection();
    let storedRange = null;
    if (selection && selection.rangeCount > 0) {
      storedRange = selection.getRangeAt(0).cloneRange();
    }

    const customPrompt = customInput.value.trim();
    if (customPrompt) {
      console.log("发送按钮点击，执行自定义操作：", customPrompt);

      // 创建自定义操作
      const customAction = {
        id: "custom",
        title: "问答",
        prompt: customPrompt
      };

      // 调用处理函数前存储当前选中内容，确保不会因为事件处理而丢失
      const savedSelection = window.getSelection().toString().trim();
      const textToUse = savedSelection || selectedText;

      // 立即执行，不要延迟
      try {
        handleActionClick(customAction, textToUse);

        // 尝试恢复选中状态（可能已经打开弹窗，恢复可能没有意义）
        if (storedRange) {
          setTimeout(() => {
            try {
              selection.removeAllRanges();
              selection.addRange(storedRange);
            } catch(err) {
              console.error("恢复选中状态出错:", err);
            }
          }, 0);
        }
      } catch (err) {
        console.error("处理自定义操作时出错:", err);
      }
    } else {
      // 输入为空时轻微抖动输入框并添加红色边框提示
      customInput.style.borderColor = "rgba(255, 0, 0, 0.5)";
      customInput.style.boxShadow = "0 0 0 2px rgba(255, 0, 0, 0.2)";
      customInput.classList.add('shake');
      setTimeout(() => {
        customInput.style.borderColor = "var(--quick-action-border, rgba(0, 0, 0, 0.1))";
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
