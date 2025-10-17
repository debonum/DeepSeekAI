import { getIsGenerating } from '../services/apiService';
import { getAIResponse } from '../services/apiService';
import { addIconsToElement } from './IconManager';
import { isDarkMode } from '../utils/themeManager';

export const createQuestionInputContainer = (aiResponseContainer) => {
  const container = document.createElement("div");
  container.className = "input-container-wrapper";

  container.innerHTML = `
    <div class="input-container">
      <textarea class="expandable-textarea" placeholder="Ask me anything..."></textarea>
      <svg class="send-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="loading-icon-wrapper tooltip">
        <svg class="loading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" stroke-width="2" fill="none" />
        </svg>
        <span class="tooltiptext">Stop</span>
      </div>
    </div>
  `;

  const textarea = container.querySelector(".expandable-textarea");
  const sendIcon = container.querySelector(".send-icon");
  const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");
  const loadingIcon = container.querySelector(".loading-icon");
  const inputContainer = container.querySelector(".input-container");

  // 立即应用正确的主题色
  const darkMode = isDarkMode();
  if (darkMode) {
    textarea.style.backgroundColor = 'rgba(58, 58, 60, 0.8)'; // 暗色模式输入框背景
    textarea.style.color = '#ffffff'; // 暗色模式文本颜色
    inputContainer.style.backgroundColor = 'rgba(44, 44, 46, 0.9)'; // 暗色模式容器背景
    container.style.backgroundColor = 'rgba(44, 44, 46, 0.9)'; // 暗色模式外部容器背景
  } else {
    textarea.style.backgroundColor = 'rgba(242, 242, 247, 0.9)'; // 亮色模式输入框背景
    textarea.style.color = '#000000'; // 亮色模式文本颜色
    inputContainer.style.backgroundColor = 'rgba(242, 242, 247, 0.9)'; // 亮色模式容器背景
    container.style.backgroundColor = 'rgba(242, 242, 247, 0.9)'; // 亮色模式外部容器背景
  }

  // 在下一帧过渡到CSS变量控制的样式，确保平滑过渡
  requestAnimationFrame(() => {
    textarea.style.transition = 'background-color 0.2s ease, color 0.2s ease';
    inputContainer.style.transition = 'background-color 0.2s ease';
    container.style.transition = 'background-color 0.2s ease';

    textarea.style.backgroundColor = '';
    textarea.style.color = '';
    inputContainer.style.backgroundColor = '';
    container.style.backgroundColor = '';
  });

  // 设置loading图标的样式并监听主题变化
  const updateLoadingIconStyle = () => {
    const isDarkMode = document.body.classList.contains('theme-adaptive dark-mode');
    loadingIcon.style.opacity = "0.8";
    loadingIcon.style.stroke = isDarkMode ? 'white' : 'var(--text-primary)';
    // 在暗色模式下不应用亮度过滤，保持原色，在亮色模式下使用brightness控制颜色深度
    loadingIcon.style.filter = isDarkMode ? 'none' : 'brightness(0.3)';
  };

  // 初始化时调用一次
  updateLoadingIconStyle();

  // 添加主题变化监听器
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'class' &&
          (mutation.target.classList.contains('theme-adaptive') ||
           mutation.target.classList.contains('dark-mode'))) {
        updateLoadingIconStyle();
      }
    });
  });

  themeObserver.observe(document.body, { attributes: true });

  setupTextarea(textarea);
  setupSendButton(sendIcon, textarea, aiResponseContainer);
  setupLoadingIcon(loadingIconWrapper);
  setupUpdateButtonState(container);

  return container;
};

const setupTextarea = (textarea) => {
  const textareaState = new WeakMap();

  const initTextareaState = (element) => ({
    isComposing: false,
    lastHeight: 40,
    compositionText: '',
    originalValue: '',
    lock: false
  });

  const getState = (element) => {
    return textareaState.get(element) || initTextareaState(element);
  };

  const updateHasContent = (element) => {
    if (element.value.trim()) {
      element.classList.add('has-content');
    } else {
      element.classList.remove('has-content');
    }
  };

  const performHeightUpdate = (element) => {
    // 保存光标位置
    const cursorPos = element.selectionStart;

    if (!element.value.trim()) {
      // 对于空内容，恢复单行样式
      element.style.transition = 'none';
      element.style.height = '48px';
      element.style.lineHeight = '48px';
      element.style.padding = '0 52px 0 16px';

      // 恢复过渡效果
      setTimeout(() => {
        element.style.transition = 'height 0.2s ease, line-height 0.2s ease';
      }, 0);

      // 确保父容器也调整高度
      const inputContainer = element.closest('.input-container');
      if (inputContainer) {
        inputContainer.style.height = 'auto';
      }

      // 添加轻微的视觉反馈
      element.style.backgroundColor = 'var(--input-bg)';
    } else {
      // 检查是否真正需要多行
      const lines = element.value.split('\n');
      const hasMultipleLines = lines.length > 1 || (lines.length === 1 && lines[0].length > 30);
      
      if (hasMultipleLines) {
        // 多行文本时切换到正常的 line-height 和 padding
        element.style.lineHeight = '1.3';
        element.style.padding = '8px 52px 8px 16px'; // 减小padding

        // 清除之前设置的高度以获得准确的scrollHeight
        element.style.height = '0px';
        // 然后设置为scrollHeight，降低最小高度
        const newHeight = Math.min(Math.max(40, element.scrollHeight), 100); // 降低最小和最大高度
        element.style.height = `${newHeight}px`;
      } else {
        // 单行文本保持单行样式，但允许高度稍微扩展以容纳长文本
        element.style.lineHeight = '48px';
        element.style.padding = '0 52px 0 16px';
        
        // 对于单行长文本，计算是否需要稍微增加高度
        const textWidth = element.value.length * 8; // 估算字符宽度
        const availableWidth = element.offsetWidth - 68; // 减去padding
        
        if (textWidth > availableWidth) {
          // 文本太长，需要稍微增加高度
          element.style.height = '48px';
        } else {
          // 正常单行高度
          element.style.height = '48px';
        }
      }

      // 确保父容器也调整高度
      const inputContainer = element.closest('.input-container');
      if (inputContainer) {
        inputContainer.style.height = 'auto';
      }

      // 添加轻微的视觉反馈，让用户感知到内容变化
      element.style.backgroundColor = 'var(--input-bg-active, var(--input-bg))';
    }

    // 恢复光标位置
    element.setSelectionRange(cursorPos, cursorPos);
  };

  let lastLineCount = 1;

  // 添加compositionstart和compositionend事件处理程序（解决输入法问题）
  textarea.addEventListener("compositionstart", (event) => {
    const state = getState(event.target);
    state.isComposing = true;
    textareaState.set(event.target, state);
  });

  textarea.addEventListener("compositionend", (event) => {
    const state = getState(event.target);
    state.isComposing = false;
    textareaState.set(event.target, state);
    // 在输入法完成后立即更新高度
    performHeightUpdate(event.target);
  });

  textarea.addEventListener("input", (event) => {
    // 无论任何情况下，在内容变化时都更新高度
    performHeightUpdate(event.target);
    updateHasContent(event.target);

    // 内容变化时提供轻微的输入反馈
    const sendIcon = event.target.parentElement.querySelector('.send-icon');
    if (event.target.value.trim()) {
      // 有内容时高亮发送按钮
      if (sendIcon) {
        sendIcon.style.opacity = '0.8';
        sendIcon.style.color = 'var(--accent-color)';
      }
    } else {
      // 无内容时恢复默认状态
      if (sendIcon) {
        sendIcon.style.opacity = '0.6';
        sendIcon.style.color = 'var(--text-secondary)';
      }
    }

    // 更新行数计数器
    lastLineCount = event.target.value.split('\n').length;
  });

  textarea.addEventListener("keydown", (event) => {
    const state = getState(event.target);

    // 按键反馈 - 使用更自然、更微妙的背景变化
    if (event.key !== 'Tab' && event.key !== 'Meta' && event.key !== 'Alt' && event.key !== 'Control' && event.key !== 'Shift') {
      // 用更微妙的变化替代明显的背景色改变
      event.target.style.backgroundColor = 'var(--input-bg-active-subtle-minimal, var(--input-bg))';
      setTimeout(() => {
        event.target.style.backgroundColor = 'var(--input-bg)';
      }, 120); // 延长恢复时间，使过渡更自然
    }

    if (event.key === "Enter") {
      if (!event.shiftKey && !state.isComposing) {
        event.preventDefault();
        if (!getIsGenerating()) {
          // 回车发送时提供明确的视觉反馈
          const sendIcon = event.target.parentElement.querySelector('.send-icon');
          if (sendIcon) {
            sendIcon.style.transform = 'translateY(-50%) scale(0.9)';
            sendIcon.style.opacity = '1';

            // 添加200ms的延迟，让用户感知到按钮被点击
            setTimeout(() => {
              sendQuestion(textarea, aiResponseContainer);
            }, 50);
            return;
          }

          sendQuestion(textarea, aiResponseContainer);
        } else {
          // 当AI正在生成时，Enter键提供"无法发送"的反馈
          event.target.style.animation = 'shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both';
          setTimeout(() => {
            event.target.style.animation = '';
          }, 400);
        }
      } else {
        requestAnimationFrame(() => {
          performHeightUpdate(event.target);
        });
      }
    }
  });

  textarea.addEventListener("focus", () => {
    // 添加聚焦状态样式，提供明确的视觉反馈
    textarea.style.boxShadow = '0 0 0 2px var(--accent-color-alpha, rgba(0, 122, 255, 0.2))';
    textarea.style.borderColor = 'var(--accent-color)';

    // 确保当前高度正确
    performHeightUpdate(textarea);
  });

  textarea.addEventListener("blur", (event) => {
    // 移除聚焦状态样式
    textarea.style.boxShadow = 'none';
    textarea.style.borderColor = 'var(--border-color)';

    if (!event.target.value) {
      event.target.style.height = '48px';
      event.target.style.lineHeight = '48px';
      event.target.style.padding = '0 52px 0 16px';
    }
  });

  // 添加窗口大小改变事件监听器，确保输入框高度适应窗口尺寸变化
  const resizeHandler = () => {
    performHeightUpdate(textarea);
  };
  window.addEventListener('resize', resizeHandler);

  // 初始化时执行一次高度调整
  textarea.style.height = "48px";
  textarea.style.minHeight = "48px";
  textarea.style.maxHeight = "120px";

  // 为cleanup添加事件移除
  textarea._cleanupEvents = () => {
    window.removeEventListener('resize', resizeHandler);
  };

  // 添加输入框动画样式到document
  if (!document.getElementById('input-feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'input-feedback-styles';
    style.textContent = `
      @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(1px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-2px, 0, 0); }
        40%, 60% { transform: translate3d(2px, 0, 0); }
      }

      @keyframes sendFeedbackText {
        0% {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        30% {
          opacity: 0.9;
          transform: translateX(-50%) translateY(-40px);
        }
        100% {
          opacity: 0;
          transform: translateX(-50%) translateY(-120px);
        }
      }

      @keyframes sendFeedbackRight {
        0% {
          opacity: 1;
          transform: translateY(0) translateX(0);
        }
        30% {
          opacity: 0.9;
          transform: translateY(-30px) translateX(30px);
        }
        100% {
          opacity: 0;
          transform: translateY(-100px) translateX(60px);
          scale: 0.8;
        }
      }

      @keyframes pulseAnimation {
        0% {
          transform: translateY(-50%) scale(1);
        }
        50% {
          transform: translateY(-50%) scale(1.15);
        }
        100% {
          transform: translateY(-50%) scale(1.1);
        }
      }

      .pulse-animation {
        animation: pulseAnimation 0.7s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }
};

const setupSendButton = (sendIcon, textarea, aiResponseContainer) => {
  const addButtonFeedback = () => {
    // 光标悬停时的视觉反馈
    if (!getIsGenerating()) {
      sendIcon.classList.add('pulse-animation');
      sendIcon.style.color = 'var(--accent-color)';
      sendIcon.style.opacity = '1';
      sendIcon.style.transform = 'translateY(-50%) scale(1.1)';
    }
  };

  const removeButtonFeedback = () => {
    // 移除光标悬停效果
    sendIcon.classList.remove('pulse-animation');
    sendIcon.style.color = 'var(--text-secondary)';
    sendIcon.style.opacity = '0.6';
    sendIcon.style.transform = 'translateY(-50%)';
  };

  // 鼠标悬停效果
  sendIcon.addEventListener("mouseenter", addButtonFeedback);
  sendIcon.addEventListener("mouseleave", removeButtonFeedback);

  // 点击反馈动画
  sendIcon.addEventListener("mousedown", () => {
    if (!getIsGenerating()) {
      sendIcon.style.transform = 'translateY(-50%) scale(0.95)';
    }
  });

  sendIcon.addEventListener("mouseup", () => {
    if (!getIsGenerating()) {
      sendIcon.style.transform = 'translateY(-50%) scale(1.1)';
    }
  });

  // 原有的点击处理
  sendIcon.addEventListener("click", () => {
    if (!getIsGenerating()) {
      // 添加点击反馈
      sendIcon.style.transform = 'translateY(-50%) scale(0.9)';
      setTimeout(() => {
        sendIcon.style.transform = 'translateY(-50%)';
      }, 150);

      sendQuestion(textarea, aiResponseContainer);
    }
  });
};

const setupLoadingIcon = (loadingIconWrapper) => {
  // 获取loading图标元素
  const loadingIcon = loadingIconWrapper.querySelector(".loading-icon");

  // 确保loadingIcon样式与当前主题匹配
  const updateIconStyle = () => {
    if (loadingIcon) {
      const isDarkMode = document.body.classList.contains('dark-mode') ||
                         document.documentElement.classList.contains('dark-mode') ||
                         document.querySelector('.theme-adaptive.dark-mode') ||
                         document.body.classList.contains('theme-adaptive dark-mode');

      // 在暗色模式下使用白色，确保可见性
      loadingIcon.style.stroke = isDarkMode ? '#fff' : 'var(--text-primary)';
      loadingIcon.style.fill = 'none';
      loadingIcon.style.filter = isDarkMode ? 'brightness(1)' : 'brightness(0.3)';

      // 添加日志用于调试
      console.debug('[DeepSeek] Loading icon theme:', isDarkMode ? 'dark' : 'light');
    }
  };

  // 初始设置
  updateIconStyle();

  // 监听主题变化，更新图标颜色
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
        updateIconStyle();
      }
    });
  });

  // 监听document.body和documentElement的class变化
  observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  loadingIconWrapper.addEventListener("click", () => {
    if (getIsGenerating() && window.currentAbortController) {
      window.currentAbortController.abort();
    }
  });

  // 为加载图标添加一个悬停效果
  loadingIconWrapper.addEventListener("mouseenter", () => {
    if (loadingIcon && getIsGenerating()) {
      loadingIcon.style.opacity = "1";
    }
  });

  loadingIconWrapper.addEventListener("mouseleave", () => {
    if (loadingIcon && getIsGenerating()) {
      loadingIcon.style.opacity = "0.8";
    }
  });

  // 清理函数，防止内存泄漏
  return () => {
    observer.disconnect();
  };
};

const setupUpdateButtonState = (container) => {
  let currentState = !getIsGenerating(); // 用于记录当前状态，避免重复设置

  const updateSendButtonState = () => {
    const isGenerating = getIsGenerating();

    // 如果状态未变化，则不更新UI
    if ((isGenerating && !currentState) || (!isGenerating && currentState)) {
      return;
    }

    currentState = !isGenerating;

    const sendIcon = container.querySelector(".send-icon");
    const loadingIconWrapper = container.querySelector(".loading-icon-wrapper");
    const loadingIcon = container.querySelector(".loading-icon");
    const textarea = container.querySelector(".expandable-textarea");

    if (isGenerating) {
      // 切换到生成状态时增加过渡效果
      sendIcon.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      sendIcon.style.transform = 'translateY(-50%) scale(0.8)';
      sendIcon.style.opacity = '0';

      setTimeout(() => {
        sendIcon.style.display = "none";
        loadingIconWrapper.style.display = "block";
        loadingIconWrapper.style.opacity = '0';
        loadingIconWrapper.style.transform = 'translateY(-50%) scale(0.8)';

        // 强制重绘以应用初始状态
        void loadingIconWrapper.offsetWidth;

        // 应用过渡动画
        loadingIconWrapper.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        loadingIconWrapper.style.opacity = '1';
        loadingIconWrapper.style.transform = 'translateY(-50%) scale(1)';
        loadingIcon.classList.add("active");

        // 更新loading图标样式，确保在暗色模式下可见
        const isDarkMode = document.body.classList.contains('dark-mode') ||
                           document.documentElement.classList.contains('dark-mode') ||
                           document.querySelector('.theme-adaptive.dark-mode') ||
                           document.body.classList.contains('theme-adaptive dark-mode');

        loadingIcon.style.stroke = isDarkMode ? '#fff' : 'var(--text-primary)';
        loadingIcon.style.fill = 'none';
        loadingIcon.style.filter = isDarkMode ? 'brightness(1)' : 'brightness(0.3)';
      }, 150);

      // 禁用输入框
      textarea.style.cursor = "not-allowed";
      textarea.setAttribute("disabled", "disabled");
      textarea.setAttribute("placeholder", "AI 正在回复...");
      textarea.style.opacity = '0.8';
    } else {
      // 切换回正常状态
      loadingIconWrapper.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      loadingIconWrapper.style.transform = 'translateY(-50%) scale(0.8)';
      loadingIconWrapper.style.opacity = '0';

      setTimeout(() => {
        loadingIconWrapper.style.display = "none";
        loadingIcon.classList.remove("active");

        sendIcon.style.display = "block";
        sendIcon.style.opacity = '0';
        sendIcon.style.transform = 'translateY(-50%) scale(0.8)';

        // 强制重绘以应用初始状态
        void sendIcon.offsetWidth;

        // 应用过渡动画
        sendIcon.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        sendIcon.style.opacity = '0.6';
        sendIcon.style.transform = 'translateY(-50%) scale(1)';

        if (textarea.value.trim()) {
          sendIcon.style.opacity = '0.8';
          sendIcon.style.color = 'var(--accent-color)';
        }
      }, 150);

      // 启用输入框
      textarea.style.cursor = "text";
      textarea.removeAttribute("disabled");
      textarea.setAttribute("placeholder", "Ask me anything...");
      textarea.style.opacity = '1';
    }
  };

  // 降低检查频率，减少性能开销
  setInterval(updateSendButtonState, 200);
};

const sendQuestion = (textarea, aiResponseContainer) => {
  const question = textarea.value.trim();
  if (question) {
    // 添加发送反馈动画，纯文本飞出到右侧
    const inputContainerWrapper = textarea.closest('.input-container-wrapper');
    if (inputContainerWrapper) {
      // 创建一个纯文本反馈元素
      const feedbackEl = document.createElement('div');
      feedbackEl.className = 'send-feedback';
      feedbackEl.textContent = question;

      // 计算合适的padding，基于内容长度
      const textLength = question.length;
      let paddingSize = '8px 12px'; // 默认较小padding
      if (textLength > 50) {
        paddingSize = '10px 14px'; // 中等长度文本
      }
      if (textLength > 100) {
        paddingSize = '12px 16px'; // 长文本
      }

      // 设置初始样式（纯文本，无背景）
      feedbackEl.style.position = 'absolute';
      feedbackEl.style.right = '20px'; // 从右侧开始
      feedbackEl.style.top = `${textarea.offsetTop}px`;
      feedbackEl.style.width = 'auto';
      feedbackEl.style.maxWidth = '70%';
      feedbackEl.style.backgroundColor = 'var(--user-question-bg)'; // 添加与user-question相同的背景色
      feedbackEl.style.color = 'white'; // 修改文字颜色为白色，与user-question一致
      feedbackEl.style.padding = paddingSize; // 动态调整padding
      feedbackEl.style.fontFamily = 'var(--font-family)';
      feedbackEl.style.fontSize = 'var(--font-size-base)';
      feedbackEl.style.lineHeight = '1.47'; // 与user-question保持一致
      feedbackEl.style.opacity = '1';
      feedbackEl.style.pointerEvents = 'none';
      feedbackEl.style.zIndex = '3';
      feedbackEl.style.overflow = 'hidden';
      feedbackEl.style.whiteSpace = 'pre-wrap';
      feedbackEl.style.textOverflow = 'ellipsis';
      feedbackEl.style.textAlign = 'right'; // 右对齐
      feedbackEl.style.boxSizing = 'border-box';
      feedbackEl.style.borderRadius = '14px'; // 添加圆角，与user-question一致
      feedbackEl.style.borderBottomRightRadius = '4px'; // 右下角特殊处理，与user-question一致

      // 使用CSS动画而不是JavaScript计算的转换
      feedbackEl.style.animation = 'none'; // 初始化时不应用动画

      inputContainerWrapper.appendChild(feedbackEl);

      // 延迟一帧，确保元素已渲染，然后应用动画
      requestAnimationFrame(() => {
        // 给予更多时间让用户感知到初始状态
        setTimeout(() => {
          // 使用CSS关键帧动画，简化代码并提供更平滑的效果
          feedbackEl.style.animation = 'sendFeedbackRight 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        }, 50); // 短暂延迟，让用户能感知到初始状态

        // 动画结束后移除元素
        setTimeout(() => {
          if (inputContainerWrapper.contains(feedbackEl)) {
            inputContainerWrapper.removeChild(feedbackEl);
          }
        }, 1200); // 动画持续时间
      });
    }

    // 清空文本域并重置高度时增加过渡效果，使用更缓和的曲线
    textarea.style.transition = 'height 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease';

    // 模拟短信发送效果，先创建用户问题再清空输入框
    const aiResponseElement = document.getElementById("ai-response");

    const userQuestionDiv = document.createElement('div');
    userQuestionDiv.className = 'user-question';
    const userQuestionP = document.createElement('p');
    userQuestionP.textContent = question;
    userQuestionDiv.appendChild(userQuestionP);
    addIconsToElement(userQuestionDiv);

    // 先添加样式但不立即添加到DOM
    userQuestionDiv.style.opacity = '0';
    userQuestionDiv.style.transform = 'translateY(10px)';
    userQuestionDiv.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    // 在动画进行一段时间后添加实际问题到聊天区域，延长时间
    setTimeout(() => {
      aiResponseElement.appendChild(userQuestionDiv);
      // 触发一次重排
      void userQuestionDiv.offsetHeight;
      // 显示动画
      userQuestionDiv.style.opacity = '1';
      userQuestionDiv.style.transform = 'translateY(0)';
    }, 300); // 调整延迟时间，配合飞出动画

    // 延迟创建答案元素和触发API调用
    setTimeout(() => {
      const answerElement = document.createElement("div");
      answerElement.className = "ai-answer";
      answerElement.textContent = "";
      // 添加生成中类，显示进度动画
      answerElement.classList.add('generating');
      addIconsToElement(answerElement);
      aiResponseElement.appendChild(answerElement);

      aiResponseContainer.scrollTop = aiResponseContainer.scrollHeight;

      const ps = aiResponseContainer.perfectScrollbar;
      if (ps) {
        ps.update();
      }

      const abortController = new AbortController();

      // 添加回调函数处理生成完成和错误情况
      const onGenerationComplete = () => {
        if (answerElement) {
          answerElement.classList.remove('generating');
          // 添加一个短暂的高亮效果，表示生成完成
          answerElement.style.transition = 'background-color 0.5s ease';
          const originalColor = getComputedStyle(answerElement).backgroundColor;
          answerElement.style.backgroundColor = 'var(--success-color-alpha, rgba(52, 199, 89, 0.1))';
          setTimeout(() => {
            answerElement.style.backgroundColor = originalColor;
          }, 1000);
        }
      };

      const onGenerationError = () => {
        if (answerElement) {
          answerElement.classList.remove('generating');
          answerElement.classList.add('error');
        }
      };

      getAIResponse(
        question,
        answerElement,
        { controller: abortController },
        ps,
        null,
        aiResponseContainer,
        false,
        null,
        false,
        '',
        onGenerationComplete,
        onGenerationError
      );
    }, 600); // 调整延迟时间，让整个过程更自然

    // 在消息飞出的同时清空输入框，但给予一些延迟
    setTimeout(() => {
      textarea.value = "";
      textarea.style.height = "48px";
      textarea.style.lineHeight = "48px";
      textarea.style.padding = "0 52px 0 16px";

      // 重置父容器高度
      const containerElement = textarea.closest('.input-container');
      if (containerElement) {
        containerElement.style.height = 'auto';
      }

      textarea.classList.remove('has-content');

      // 增加一个轻微的视觉反馈
      textarea.style.backgroundColor = 'var(--input-bg)';
    }, 80); // 稍微延迟清空，让用户感知到发送过程
  }
};