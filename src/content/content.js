import './styles/style.css';
import { createSvgIcon, createIcon } from "./components/IconManager";
import { createQuickActionButtons } from "./components/QuickActionButtons";
import { createPopup } from "./popup";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import { popupStateManager } from './utils/popupStateManager';

let currentIcon = null;
let currentQuickActions = null;
let isHandlingIconClick = false;
let isSelectionEnabled = true; // 默认启用
let selectedText = "";
let currentPopup = null; // 新增：跟踪当前弹窗
let isRememberWindowSize = false; // 默认不记住窗口大小
let currentUnderlines = []; // 使用数组保存所有下划线元素的引用

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = chrome.runtime.getURL("style.css");
document.head.appendChild(link);

// 加载设置
chrome.storage.sync.get(['selectionEnabled', 'rememberWindowSize', 'windowSize'], function(data) {
  if (typeof data.selectionEnabled !== 'undefined') {
    isSelectionEnabled = data.selectionEnabled;
  }
  if (typeof data.rememberWindowSize !== 'undefined') {
    isRememberWindowSize = data.rememberWindowSize;
  }
});

// 监听设置变化
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync') {
    if (changes.selectionEnabled) {
      isSelectionEnabled = changes.selectionEnabled.newValue;
      if (!isSelectionEnabled) {
        removeIcon();
      }
    }
    if (changes.rememberWindowSize) {
      isRememberWindowSize = changes.rememberWindowSize.newValue;
    }
  }
});

function removeIcon() {
  // 保留这个函数是为了兼容性，但它现在什么都不做
}

// 添加下划线到选中文本
function addUnderlineToSelection(selection) {
  // 先移除已有的下划线
  removeUnderlines();

  // 遍历所有选区范围
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);

    // 获取范围的客户端矩形集合
    const rects = range.getClientRects();

    // 为每个矩形创建下划线
    for (let j = 0; j < rects.length; j++) {
      const rect = rects[j];

      // 创建下划线元素
      const underline = document.createElement('div');
      underline.className = 'ds-selection-underline';

      // 设置样式
      Object.assign(underline.style, {
        position: 'absolute',
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.bottom + window.scrollY}px`,
        width: `${rect.width}px`,
        height: '2px',
        backgroundColor: '#4285f4',
        zIndex: '2147483646', // 比按钮容器低一级
        pointerEvents: 'none', // 避免影响鼠标事件
      });

      // 添加到DOM
      document.body.appendChild(underline);

      // 保存引用
      currentUnderlines.push(underline);
    }
  }
}

// 移除所有下划线
function removeUnderlines() {
  currentUnderlines.forEach(underline => {
    if (underline && document.body.contains(underline)) {
      document.body.removeChild(underline);
    }
  });
  currentUnderlines = [];
}

// 更新安全的弹窗移除函数
function safeRemovePopup() {
  // 移除下划线
  removeUnderlines();

  // 立即重置所有状态
  popupStateManager.reset();

  if (!currentPopup) {
    window.aiResponseContainer = null;
    return;
  }

  try {
    // 中止正在进行的 AI 响应
    if (window.currentAbortController) {
      window.currentAbortController.abort();
      window.currentAbortController = null;
    }

    // 如果正在生成回答但被中断，清理最后一条不完整的消息
    if (window.aiResponseContainer && window.aiResponseContainer.isGenerating) {
      // 通过消息传递来清理消息历史
      window.dispatchEvent(new CustomEvent('cleanupIncompleteMessage'));
    }

    // 移除所有事件监听器和引用
    if (window.aiResponseContainer) {
      // 清理滚动相关实例
      if (window.aiResponseContainer.perfectScrollbar) {
        window.aiResponseContainer.perfectScrollbar.destroy();
        delete window.aiResponseContainer.perfectScrollbar;
      }

      if (window.aiResponseContainer.scrollStateManager?.cleanup) {
        window.aiResponseContainer.scrollStateManager.cleanup();
        delete window.aiResponseContainer.scrollStateManager;
      }

      if (window.aiResponseContainer.cleanup) {
        window.aiResponseContainer.cleanup();
        delete window.aiResponseContainer.cleanup;
      }

      // 移除所有事件监听器
      const clone = window.aiResponseContainer.cloneNode(true);
      window.aiResponseContainer.parentNode.replaceChild(clone, window.aiResponseContainer);
      window.aiResponseContainer = clone;
    }

    // 保存窗口大小
    if (isRememberWindowSize && currentPopup.offsetWidth > 100 && currentPopup.offsetHeight > 100) {
      const width = currentPopup.offsetWidth;
      const height = currentPopup.offsetHeight;
      chrome.storage.sync.set({ windowSize: { width, height } });
    }

    // 清理所有观察者和事件监听器
    if (currentPopup._resizeObserver) {
      currentPopup._resizeObserver.disconnect();
      delete currentPopup._resizeObserver;
    }
    if (currentPopup._mutationObserver) {
      currentPopup._mutationObserver.disconnect();
      delete currentPopup._mutationObserver;
    }
    if (currentPopup._removeThemeListener) {
      currentPopup._removeThemeListener();
      delete currentPopup._removeThemeListener;
    }

    // 使用 try-catch 包装 DOM 操作
    try {
      if (document.body.contains(currentPopup)) {
        // 在移除之前先将内容清空，避免触发不必要的事件
        currentPopup.innerHTML = '';
        document.body.removeChild(currentPopup);
      }
    } catch (e) {
      console.warn('Error removing popup from DOM:', e);
    }

    // 确保状态被重置
    window.aiResponseContainer = null;
    currentPopup = null;
  } catch (error) {
    console.warn('Failed to remove popup:', error);
    // 确保在出错时也能重置所有状态
    if (document.body.contains(currentPopup)) {
      try {
        currentPopup.innerHTML = '';
        document.body.removeChild(currentPopup);
      } catch (e) {
        console.warn('Error removing popup in catch block:', e);
      }
    }
    // 重置所有状态
    window.aiResponseContainer = null;
    currentPopup = null;
  }

  // 最后再次确保所有状态都被重置
  popupStateManager.reset();
}

function handlePopupCreation(selectedText, rect, hideQuestion = false, messages = null, quickActionPrompt = null) {
  if (popupStateManager.isCreating()) return;

  popupStateManager.setCreating(true);

  try {
    // 先移除快捷按钮
    removeIcon();
    removeQuickActions();

    safeRemovePopup();
    currentPopup = createPopup(selectedText, rect, hideQuestion, safeRemovePopup, messages, quickActionPrompt);
    currentPopup.style.minWidth = '300px';
    currentPopup.style.minHeight = '200px';

    if (isRememberWindowSize) {
      chrome.storage.sync.get(['windowSize'], function(data) {
        if (data.windowSize &&
            data.windowSize.width >= 300 &&
            data.windowSize.height >= 200 &&
            currentPopup) {
          requestAnimationFrame(() => {
            currentPopup.style.width = `${data.windowSize.width}px`;
            currentPopup.style.height = `${data.windowSize.height}px`;
          });
        }
      });
    }

    document.body.appendChild(currentPopup);
    popupStateManager.setVisible(true);  // 更新状态

    // 设置窗口大小监听
    if (isRememberWindowSize && currentPopup) {
      setupResizeObserver(currentPopup);
    }
  } catch (error) {
    console.error('Error in handlePopupCreation:', error);
    safeRemovePopup();
  } finally {
    setTimeout(() => {
      popupStateManager.setCreating(false);
    }, 100);
  }
}

function handleIconClick(e, selectedText, rect) {
  e.stopPropagation();
  e.preventDefault();

  isHandlingIconClick = true;

  try {
    // 移除按钮容器
    removeQuickActions();

    // 如果没有传入rect,则使用默认位置
    if (!rect) {
      rect = {
        left: window.innerWidth / 2,
        top: window.innerHeight / 2 - 190,
        width: 0,
        height: 0
      };
    }

    // 显示弹窗
    handlePopupCreation(selectedText || "", rect);
  } catch (error) {
    console.warn('Error in handleIconClick:', error);
    safeRemovePopup();
  } finally {
    setTimeout(() => {
      isHandlingIconClick = false;
    }, 100);
  }
}

document.addEventListener("mouseup", function (event) {
  if (!isSelectionEnabled || popupStateManager.isCreating() || isHandlingIconClick) return;

  const selection = window.getSelection();

  // 使用updateSelectionUI来处理所有UI更新
  if (selection && selection.rangeCount > 0 && event.button === 0) {
    const text = selection.toString().trim();
    if (text) {
      // 保存选择状态，以便后续恢复
      const savedRange = selection.getRangeAt(0).cloneRange();

      updateSelectionUI(selection).catch(error => {
        console.error('Error updating selection UI:', error);
      }).finally(() => {
        // 无论成功或失败，都尝试恢复选择状态
        if (savedRange) {
          setTimeout(() => {
            try {
              // 重新获取选择对象，防止引用已经变更
              const currentSelection = window.getSelection();
              currentSelection.removeAllRanges();
              currentSelection.addRange(savedRange);
            } catch (err) {
              console.error("Error restoring selection after mouseup:", err);
            }
          }, 0);
        }
      });
    }
  }
}, { passive: false }); // 改为非被动模式

// 修改捕获阶段为true，确保在事件冒泡前处理
document.addEventListener("mousedown", function(e) {
  if (isHandlingIconClick) return;

  // 检查点击是否在快捷按钮容器或其子元素上
  const isClickOnButtons = currentQuickActions && (
    currentQuickActions.contains(e.target) ||
    e.target.closest('.custom-prompt-input') ||
    e.target.closest('.custom-prompt-send')
  );

  // 如果点击在快捷按钮容器或其子元素上
  if (isClickOnButtons) {
    // 如果点击的是输入框，不要阻止默认行为，让它能获得焦点
    const isClickOnInput = e.target.closest('.custom-prompt-input');
    if (!isClickOnInput) {
      e.preventDefault(); // 只有不是点击输入框时才阻止默认行为
    }

    e.stopPropagation(); // 阻止冒泡

    // 保存当前选择状态，以便能在事件处理后恢复
    const selection = window.getSelection();
    let savedRange = null;
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    // 如果有已保存的范围，在事件执行后尝试恢复
    if (savedRange) {
      // 使用setTimeout确保在浏览器处理完mousedown默认行为后执行
      setTimeout(() => {
        try {
          // 只有不是点击输入框时才恢复选择状态
          if (!isClickOnInput) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(savedRange);
          }
        } catch (err) {
          console.error("恢复选择状态时出错:", err);
        }
      }, 0);
    }
    return;
  }

  // 只有点击在快捷按钮容器外时才移除快捷按钮和清除选择
  if (!isClickOnButtons) {
    removeIcon();
    removeQuickActions(); // 这里会调用removeUnderlines
  }
}, { capture: true, passive: false }); // 使用capture确保在冒泡前捕获，非被动模式允许preventDefault

// 添加全局点击事件监听
document.addEventListener('mousedown', async (event) => {
  // 如果没有当前弹窗，直接返回
  if (!currentPopup) return;

  // 检查是否启用了固定窗口
  const isPinned = await chrome.storage.sync.get('pinWindow').then(result => result.pinWindow || false);

  // 如果启用了固定窗口，直接返回
  if (isPinned) return;

  // 检查点击区域
  const isClickInside = event.target.closest('#ai-popup') ||
                       event.target.closest('.icon-wrapper') ||
                       event.target.closest('.icon-container') ||
                       event.target.closest('.regenerate-icon');

  // 如果点击在弹窗内部或相关元素上，不关闭
  if (isClickInside) return;

  // 关闭弹窗
  safeRemovePopup();
});

// 添加事件委托处理reasoning content的点击
document.addEventListener('click', (event) => {
  const reasoningHeader = event.target.closest('.reasoning-header');
  if (reasoningHeader) {
    const container = reasoningHeader.closest('.reasoning-content');
    if (container) {
      container.classList.toggle('collapsed');
      container.classList.toggle('expanded');
    }
  }
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleChat") {
    try {
      // 如果弹窗已经存在，直接关闭它并返回
      if (popupStateManager.isVisible() && currentPopup) {
        safeRemovePopup();
        return;
      }

      // 获取当前页面的选中内容
      const selection = window.getSelection();
      const selectedTextContent = selection.toString().trim();
      let rect;

      // 确定矩形区域
      if (selection.rangeCount > 0 && selectedTextContent) {
        // 如果有选中内容，使用选中内容的区域
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        // 无选中内容，使用默认位置
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      // 确定要使用的文本和是否隐藏问题
      const textToUse = selectedTextContent || request.useGreeting;
      // 如果没有选中文本，则使用问候语模式（隐藏问题框）
      const hideQuestion = !selectedTextContent;

      console.log("处理toggleChat消息:", {
        selectedTextContent,
        textToUse,
        hideQuestion
      });

      // 显示弹窗
      handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling toggleChat:', error);
      // 确保在出错时重置状态
      safeRemovePopup();
    }
  } else if (request.action === "createPopup") {
    // 处理从background.js传来的右键菜单和快捷键消息
    try {
      // 如果没有提供selectedText，尝试获取当前选中的文本
      let selectedTextContent = request.selectedText;
      if (!selectedTextContent) {
        const selection = window.getSelection();
        selectedTextContent = selection.toString().trim();
      }

      console.log("处理createPopup消息:", {
        selectedText: selectedTextContent,
        message: request.message
      });

      // 准备弹窗位置
      let rect;
      const selection = window.getSelection();
      if (selection.rangeCount > 0 && selectedTextContent) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      // 使用selectedText或message，并根据是否有选中文本决定是否隐藏问题
      const textToUse = selectedTextContent || request.message;
      const hideQuestion = !selectedTextContent;

      // 显示弹窗
      handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling createPopup:', error);
      safeRemovePopup();
    }
  } else if (request.action === "getSelectedText") {
    sendResponse({ selectedText });
  } else if (request.action === "closeChat") {
    safeRemovePopup();
  }
});

function handleQuickAction(action, text) {
  // 保存当前的选中范围，以备后用
  const selection = window.getSelection();
  let range;

  if (selection && selection.rangeCount > 0) {
    range = selection.getRangeAt(0);
  }

  const rect = range ? range.getBoundingClientRect() : {
    left: window.innerWidth / 2,
    top: window.innerHeight / 2 - 190,
    width: 0,
    height: 0
  };

  const messages = [
    {
      role: "user",
      content: text,
    }
  ];

  // 移除按钮容器
  removeQuickActions();

  // 对于翻译操作，如果没有指定语言，默认使用中文
  let prompt = action.prompt;
  if (action.id === 'translate' && !prompt.includes('简体中文')) {
    prompt = action.prompt.replace('{language}', '简体中文');
  }

  // 对于自定义操作，确保提示信息正确
  if (action.id === 'custom') {
    const userQuestion = action.prompt;

    // 将用户问题和选中内容合并为一条消息，但记录用户问题以便在UI上区分显示
    messages[0].content = text;
    messages[0].userQuestion = userQuestion; // 添加用户问题，但保持单条消息

    // 使用通用提示引导AI理解用户在针对选中内容提问
    prompt = "你是一个帮助用户理解和分析内容的AI助手。用户会提供一段内容以及他们的问题。请基于用户提供的内容回答用户问题。";
  }

  // 显示弹窗
  handlePopupCreation(text, rect, false, messages, prompt);
}

async function updateSelectionUI(selection) {
  if (!isSelectionEnabled || !selection || selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  selectedText = selection.toString().trim();

  if (!selectedText) {
    return;
  }

  // 添加下划线到所有选中文本
  addUnderlineToSelection(selection);

  // 计算按钮容器位置 - 在选中文本下方
  const containerX = rect.left + window.scrollX;
  const containerY = rect.bottom + window.scrollY + 5; // 在文本下方5px的位置

  // 如果已经存在快捷按钮容器，则只更新位置
  if (currentQuickActions) {
    Object.assign(currentQuickActions.style, {
      position: 'absolute',
      left: `${containerX}px`,
      top: `${containerY}px`,
    });
    return;
  }

  // 创建按钮容器
  currentQuickActions = await createQuickActionButtons(
    selectedText,
    handleQuickAction,
    handleIconClick
  );

  // 设置容器位置
  Object.assign(currentQuickActions.style, {
    position: 'absolute',
    left: `${containerX}px`,
    top: `${containerY}px`,
    zIndex: '2147483647',
  });

  // 直接添加到DOM
  document.body.appendChild(currentQuickActions);
}

function removeQuickActions() {
  // 移除下划线
  removeUnderlines();

  // 移除按钮容器
  if (currentQuickActions && document.body.contains(currentQuickActions)) {
    document.body.removeChild(currentQuickActions);
    currentQuickActions = null;
  }
}

// 添加全局点击事件监听，用于关闭语言选择菜单
document.addEventListener('click', (e) => {
  const languageSelect = document.querySelector('.language-select');
  if (languageSelect && languageSelect.style.display === 'block') {
    const isClickInside = e.target.closest('.quick-action-translate');
    if (!isClickInside) {
      languageSelect.style.display = 'none';
    }
  }
});

// 添加全局键盘事件监听，用于ESC键关闭弹窗
document.addEventListener('keydown', (e) => {
  // 如果没有当前弹窗，直接返回
  if (!currentPopup) return;

  // 如果按下的是ESC键
  if (e.key === 'Escape') {
    // 直接调用关闭函数，不使用动画
    safeRemovePopup();
  }
});

// 添加防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 添加 ResizeObserver 设置函数
function setupResizeObserver(popup) {
  if (!popup) return;

  // 如果已存在观察者，先断开连接
  if (popup._resizeObserver) {
    popup._resizeObserver.disconnect();
  }

  // 创建防抖的保存尺寸函数
  const debouncedSaveSize = debounce((width, height) => {
    if (width >= 300 && height >= 200) {
      chrome.storage.sync.set({ windowSize: { width, height } });
    }
  }, 500);

  // 创建新的 ResizeObserver
  popup._resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      debouncedSaveSize(width, height);
    }
  });

  // 开始观察
  popup._resizeObserver.observe(popup);
}
