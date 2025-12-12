
import "./publicPath";
import { createSvgIcon, createIcon } from "./components/IconManager";
import { createQuickActionButtons } from "./components/QuickActionButtons";
import { createPopup } from "./popup";
import { popupStateManager } from './utils/popupStateManager';
import { ensureShadowContainer, getShadowContainer, destroyShadowContainer } from './components/ShadowContainer';
// CSS 作为字符串导入，用于注入到 Shadow DOM
import popupStyles from './styles/style.css?raw';
import katexStyles from 'katex/dist/katex.min.css?raw';

const shadowStyles = `${katexStyles}\n${popupStyles}`;

// 选区保持管理器
class SelectionPreservationManager {
  constructor() {
    this.savedRange = null;
    this.savedText = "";
    this.isPreserving = false;
    this.restoreTimeout = null;
  }

  // 保存当前选区
  saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
      this.savedText = selection.toString().trim();
      this.isPreserving = true;
      return true;
    }
    return false;
  }

  // 恢复选区
  restoreSelection(force = false) {
    const activeElement = document.activeElement;
    if (activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
        activeElement.closest && activeElement.closest('.quick-action-buttons')) {
      if (!force) { // 非强制恢复时，如果焦点在QAB输入框，则不打扰
        return false;
      }
      // 如果是强制恢复(force=true)，目前逻辑会继续。这在某些情况是必要的（如QAB初次显示后）
      // 但在其他强制恢复场景下，如果焦点恰好在输入框，仍可能产生冲突。需要调用处谨慎使用force=true。
    }

    if (!this.savedRange) return false; // 如果没有保存的range，直接返回
    // isPreserving的检查移到后面，因为force=true时也可能需要恢复一个不再isPreserving的选区

    try {
      const selection = window.getSelection();
      if (!this.isRangeValid(this.savedRange)) {
        this.clear();
        return false;
      }

      // 只有在force=true，或者当前没有选区，或者当前选区和保存的选区文本不同时，才进行恢复
      // 目的是减少不必要的DOM操作和事件触发
      let shouldRestore = force;
      if (!shouldRestore) {
          if (selection.rangeCount === 0 || selection.isCollapsed) {
              shouldRestore = true;
          } else if (selection.toString().trim() !== this.savedText) {
              shouldRestore = true;
          }
      }
      // 如果isPreserving为false，但force为true，也应该恢复
      if(!this.isPreserving && !force && !shouldRestore) return false;


      if (shouldRestore || force) {
          selection.removeAllRanges();
          selection.addRange(this.savedRange.cloneRange());
      }
      return true;
    } catch (error) {
      console.error("恢复选区失败:", error);
      this.clear(); // 出错时清理，避免后续使用无效选区
      return false;
    }
  }

  // 验证 range 是否有效
  isRangeValid(range) {
    try {
      if (!range || !range.startContainer || !range.endContainer) return false;
      return document.contains(range.startContainer) &&
             document.contains(range.endContainer);
    } catch (error) {
      return false;
    }
  }

  // 延迟恢复选区
  scheduleRestore(delay = 10, force = false) {
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
    }

    this.restoreTimeout = setTimeout(() => {
      this.restoreSelection(force);
      this.restoreTimeout = null;
    }, delay);
  }

  // 获取保存的文本
  getSavedText() {
    return this.savedText;
  }

  // 检查是否有保存的选区
  hasSelection() {
    return this.savedRange !== null && this.savedText.length > 0;
  }

  // 清除保存的选区
  clear() {
    this.savedRange = null;
    this.savedText = "";
    this.isPreserving = false;
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
      this.restoreTimeout = null;
    }
  }

  // 设置保持状态
  setPreserving(state) {
    this.isPreserving = state;
  }
}

// 判断点击是否发生在已保存选区矩形内（允许微小边距）
function isPointInSavedSelection(e, padding = 12) {
  try {
    if (!selectionManager.savedRange) return false;
    const rect = selectionManager.savedRange.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    return x >= rect.left - padding && x <= rect.right + padding &&
           y >= rect.top - padding && y <= rect.bottom + padding;
  } catch (_) {
    return false;
  }
}

// 创建全局实例
const selectionManager = new SelectionPreservationManager();

let currentIcon = null;
let currentQuickActions = null;
let isHandlingIconClick = false;
let isSelectionEnabled = true; // 默认启用
let selectedText = "";
let currentPopup = null; // 新增：跟踪当前弹窗
let minimizeIcon = null; // 保存最小化图标引用
let isRememberWindowSize = false; // 默认不记住窗口大小
let lastSelectionText = "";
let lastSelectionTime = 0;
const SELECTION_TIMEOUT = 1000; // 1秒超时

// 添加跟踪鼠标状态的变量
let isMouseDown = false;
let mouseDownPosition = { x: 0, y: 0 };
let hasMovedEnough = false;
let selectionChangeTimeout = null;
let lastSelectionLength = 0;

let quickActionsVisibleBeforeContextMenu = false; // 新增全局变量跟踪状态
let quickActionsShownAt = 0; // 记录快捷按钮显示时间，避免双/三击时被立即移除
const DOUBLE_CLICK_GUARD_MS = 350; // 双击/三击保护时间窗口
let suppressQuickActionsUntil = 0; // 弹窗创建后在冷却期内禁止再次唤起快捷按钮

// 判断是否为快速的多击（双击/三击）
function isRapidMultiClick(event) {
  try {
    return event && typeof event.detail === 'number' && event.detail >= 2;
  } catch (_) {
    return false;
  }
}

// 样式不再注入到页面 head，改用 Shadow DOM 隔离
// const link = document.createElement("link");
// link.rel = "stylesheet";
// link.type = "text/css";
// link.href = chrome.runtime.getURL("style.css");
// document.head.appendChild(link);

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

// 添加下划线到选中文本 - 现在是空函数，不再添加任何下划线
function addUnderlineToSelection(selection) {
  // 功能已移除，仅保留函数供其他地方调用
  // 只保存选中文本信息，不实际添加下划线
  if (selection && selection.toString) {
    selectedText = selection.toString().trim();
    if (selectedText) {
      lastSelectionText = selectedText;
      lastSelectionTime = Date.now();
    }
  }
}

// 移除所有下划线 - 现在是空函数
function removeUnderlines() {
  // 功能已移除，仅保留函数供其他地方调用
  // 不清除selectedText变量，确保保留选中文本的引用
}

// 更新安全的弹窗移除函数
function safeRemovePopup(forceRemove = false) {
  // 如果窗口已最小化，不要移除它（除非强制移除）
  if (popupStateManager.isMinimized() && !forceRemove) {
    console.log('窗口已最小化，跳过移除操作');
    return;
  }

  // 不再调用 removeUnderlines()，避免影响选中状态

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

    // 使用 try-catch 包装 DOM 操作 - 从 Shadow DOM 容器移除
    try {
      const shadowContainer = getShadowContainer();
      const popupParent = shadowContainer?.container || document.body;
      if (popupParent.contains(currentPopup)) {
        // 在移除之前先将内容清空，避免触发不必要的事件
        currentPopup.innerHTML = '';
        popupParent.removeChild(currentPopup);
      }
    } catch (e) {
      console.warn('Error removing popup from DOM:', e);
    }

    // 确保状态被重置
    window.aiResponseContainer = null;
    currentPopup = null;
  } catch (error) {
    console.warn('Failed to remove popup:', error);
    // 确保在出错时也能重置所有状态 - 从 Shadow DOM 容器移除
    const shadowContainer = getShadowContainer();
    const popupParent = shadowContainer?.container || document.body;
    if (popupParent.contains(currentPopup)) {
      try {
        currentPopup.innerHTML = '';
        popupParent.removeChild(currentPopup);
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

// 最小化弹窗
async function minimizePopup() {
  console.log('尝试最小化窗口...', { hasPopup: !!currentPopup });

  if (!currentPopup) {
    console.error('无法最小化：currentPopup 不存在');
    return;
  }

  // 隐藏窗口（带动画）
  currentPopup.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  currentPopup.style.opacity = '0';
  currentPopup.style.transform = 'scale(0.9)';

  setTimeout(async () => {
    if (currentPopup) {
      currentPopup.style.display = 'none';
      popupStateManager.setVisible(false);
      popupStateManager.setMinimized(true);

      console.log('窗口已隐藏，创建小图标...');

      // 创建并显示小图标
      const position = await popupStateManager.loadIconPosition();
      const { createMinimizeIcon } = await import('./components/IconManager');

      minimizeIcon = createMinimizeIcon(() => {
        restorePopup();
      }, position);

      document.body.appendChild(minimizeIcon);

      console.log('小图标已创建', { position });

      // 触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate(8);
      }
    }
  }, 200);
}

// 恢复弹窗
function restorePopup() {
  console.log('尝试恢复窗口...', {
    hasPopup: !!currentPopup,
    hasIcon: !!minimizeIcon,
    isMinimized: popupStateManager.isMinimized()
  });

  if (!currentPopup) {
    console.error('无法恢复窗口：currentPopup 不存在');
    // 清理小图标
    if (minimizeIcon && document.body.contains(minimizeIcon)) {
      document.body.removeChild(minimizeIcon);
      minimizeIcon = null;
    }
    popupStateManager.setMinimized(false);
    return;
  }

  // 移除小图标
  if (minimizeIcon) {
    minimizeIcon.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    minimizeIcon.style.opacity = '0';
    minimizeIcon.style.transform = 'scale(0.5)';

    setTimeout(() => {
      if (minimizeIcon) {
        if (minimizeIcon.cleanup) {
          minimizeIcon.cleanup();
        }
        if (document.body.contains(minimizeIcon)) {
          document.body.removeChild(minimizeIcon);
        }
        minimizeIcon = null;
      }
    }, 200);
  }

  // 显示窗口（带动画）
  currentPopup.style.display = 'block';
  requestAnimationFrame(() => {
    if (currentPopup) {
      currentPopup.style.transition = 'opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
      currentPopup.style.opacity = '1';
      currentPopup.style.transform = 'scale(1)';
    }
  });

  popupStateManager.setVisible(true);
  popupStateManager.setMinimized(false);

  console.log('窗口已恢复');

  // 触觉反馈
  if ('vibrate' in navigator) {
    navigator.vibrate(8);
  }

  // 自动聚焦到输入框
  setTimeout(() => {
    if (currentPopup) {
      const textarea = currentPopup.querySelector('.expandable-textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  }, 350); // 等待动画完成后聚焦
}

function handlePopupCreation(selectedText, rect, hideQuestion = false, messages = null, quickActionPrompt = null) {
  if (popupStateManager.isCreating()) return;

  popupStateManager.setCreating(true);

  try {
    // 先移除快捷按钮
    removeIcon();
    removeQuickActions();
    // 再兜底清理任何遗留
    try {
      const wrapper = document.getElementById('quick-actions-wrapper');
      if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      const legacy = document.getElementById('fixed-quick-actions-container');
      if (legacy) { legacy.style.opacity = '0'; legacy.style.pointerEvents = 'none'; legacy.innerHTML = ''; }
      document.querySelectorAll('.quick-action-buttons').forEach(n => n.parentNode && n.parentNode.removeChild(n));
    } catch(_) {}

    // 清理最小化图标（如果存在）
    if (minimizeIcon && document.body.contains(minimizeIcon)) {
      if (minimizeIcon.cleanup) {
        minimizeIcon.cleanup();
      }
      document.body.removeChild(minimizeIcon);
      minimizeIcon = null;
      popupStateManager.setMinimized(false);
    }

    safeRemovePopup();
    currentPopup = createPopup(selectedText, rect, hideQuestion, safeRemovePopup, messages, quickActionPrompt, minimizePopup);
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

    // 使用 Shadow DOM 容器挂载弹窗，实现样式隔离
    const shadowContainer = ensureShadowContainer(shadowStyles);
    shadowContainer.container.appendChild(currentPopup);
    popupStateManager.setVisible(true);  // 更新状态
    // 打开弹窗后，短时间抑制快捷按钮再次唤起
    suppressQuickActionsUntil = Date.now() + 500;

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

// 当鼠标按下时记录状态
document.addEventListener("mousedown", function(e) {
  // 只处理左键点击
  if (e.button !== 0) return;

  isMouseDown = true;
  hasMovedEnough = false;
  mouseDownPosition = { x: e.clientX, y: e.clientY };

  // 清除可能存在的超时
  if (selectionChangeTimeout) {
    clearTimeout(selectionChangeTimeout);
    selectionChangeTimeout = null;
  }

  // 清除现有快捷按钮：不移除已显示的按钮，除非明确点击在非选区且超过保护时间
  if (!e.target.closest('.quick-action-buttons') &&
      !e.target.closest('.custom-prompt-input')) {
    const withinGuardWindow = quickActionsShownAt && (Date.now() - quickActionsShownAt < DOUBLE_CLICK_GUARD_MS);
    if (!isPointInSavedSelection(e) && !withinGuardWindow) {
      removeQuickActions();
    }
  }
}, { passive: true });

// 使用mousemove来检测用户是否正在选择文本
document.addEventListener("mousemove", function(e) {
  if (!isMouseDown || !isSelectionEnabled || popupStateManager.isCreating()) return;

  // 计算鼠标移动距离，确保不是意外抖动
  const dx = e.clientX - mouseDownPosition.x;
  const dy = e.clientY - mouseDownPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 移动距离足够大，可能是正在选择文本
  if (distance > 5) {
    hasMovedEnough = true;

    // 获取当前选择
    const selection = window.getSelection();
    const selectionLength = selection ? selection.toString().trim().length : 0;

    // 只有在选择长度变化且大于0时才更新UI
    if (selectionLength > 0 && selectionLength !== lastSelectionLength) {
      lastSelectionLength = selectionLength;

      // 使用延迟更新UI，避免频繁更新
      if (selectionChangeTimeout) {
        clearTimeout(selectionChangeTimeout);
      }

      // 延迟50ms更新UI，在用户仍在选择过程中不显示UI
      selectionChangeTimeout = setTimeout(() => {
        // 仍在按下状态且有选中内容时准备UI
        if (isMouseDown && selectionLength > 0) {
          // 准备UI但不显示，等待mouseup事件
          prepareSelectionUI(selection);
        }
      }, 50);
    }
  }
}, { passive: true });

// 只准备UI但不显示
function prepareSelectionUI(selection) {
  if (!selection || selection.isCollapsed) return;

  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  // 保存文本信息
  lastSelectionText = selectedText;
  lastSelectionTime = Date.now();
}

// 等待点击型选区（双击/三击）稳定：文本在一段时间内不再变化
function getStableSelection(maxWait = 500, settle = 140) {
  return new Promise((resolve) => {
    const start = Date.now();
    let lastText = '';
    let lastChange = Date.now();

    const tick = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        if (Date.now() - start >= maxWait) return resolve(null);
        return setTimeout(tick, 40);
      }

      const text = sel.toString().trim();
      if (text !== lastText) {
        lastText = text;
        lastChange = Date.now();
      }

      if (text && Date.now() - lastChange >= settle) {
        return resolve(sel);
      }

      if (Date.now() - start >= maxWait) {
        return resolve(sel);
      }
      setTimeout(tick, 40);
    };
    tick();
  });
}

// 修改mouseup事件处理函数
document.addEventListener("mouseup", function(e) {
  isMouseDown = false;
  if (e.button === 2) return;
  if (!isSelectionEnabled || popupStateManager.isCreating() || isHandlingIconClick) return;

  // 核心修复：如果点击释放发生在工具栏内部（例如拖拽结束），则忽略，避免重置位置
  if (e.target.closest && e.target.closest('.quick-action-buttons')) return;

  const anchorPoint = { x: e.clientX, y: e.clientY };
  // 对点击型选中（双击/三击）等待“稳定”后再读取，确保拿到最终扩展的选区
  if (!hasMovedEnough && e.detail >= 2) {
    getStableSelection(550, 160).then((sel) => {
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      const textNow = sel.toString().trim();
      if (!textNow) return;
      selectionManager.saveSelection();
      selectedText = textNow;
      lastSelectionText = textNow;
      lastSelectionTime = Date.now();
      if (!selectionManager.hasSelection()) return;
      showQuickActionsForSelection(sel, anchorPoint);
    });
    return;
  }

  // 拖拽型或单击扩展型，轻量延迟
  const delay = hasMovedEnough ? 10 : 180;
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const textNow = sel.toString().trim();
    if (!textNow) return;
    selectionManager.saveSelection();
    selectedText = textNow;
    lastSelectionText = textNow;
    lastSelectionTime = Date.now();
    if (!selectionManager.hasSelection()) return;
    showQuickActionsForSelection(sel, anchorPoint);
  }, delay);
}, { passive: true });

function findRangeRectNearPoint(range, anchorPoint) {
  if (!range || !anchorPoint) return null;

  const rects = Array.from(range.getClientRects()).filter(rect => rect.width || rect.height);
  if (!rects.length) return null;

  const contains = (rect) =>
    anchorPoint.x >= rect.left &&
    anchorPoint.x <= rect.right &&
    anchorPoint.y >= rect.top &&
    anchorPoint.y <= rect.bottom;

  const containingRect = rects.find(contains);
  if (containingRect) return containingRect;

  const closest = rects.reduce((acc, rect) => {
    const dx =
      anchorPoint.x < rect.left
        ? rect.left - anchorPoint.x
        : anchorPoint.x > rect.right
          ? anchorPoint.x - rect.right
          : 0;
    const dy =
      anchorPoint.y < rect.top
        ? rect.top - anchorPoint.y
        : anchorPoint.y > rect.bottom
          ? anchorPoint.y - rect.bottom
          : 0;
    const distance = Math.hypot(dx, dy);
    if (!acc || distance < acc.distance) {
      return { rect, distance };
    }
    return acc;
  }, null);

  return closest ? closest.rect : rects[0];
}

// 修改showQuickActionsForSelection函数
function showQuickActionsForSelection(selection, anchorPoint) {
  try {
    // 若在弹窗冷却时间内，禁止唤起快捷栏，避免与弹窗并存/抖动
    if (Date.now() < suppressQuickActionsUntil) {
      return;
    }
    // 若已有一个实例，先移除，确保同一时刻仅存在一个快捷栏
    const existed = document.getElementById('quick-actions-wrapper');
    if (existed && existed.parentNode) {
      try { existed.parentNode.removeChild(existed); } catch (_) {}
    }
    selectionManager.saveSelection();
    // 使用精确定位的小容器，避免全屏遮罩干扰浏览器三击选区逻辑
    let wrapper = document.getElementById('quick-actions-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'quick-actions-wrapper';
      Object.assign(wrapper.style, {
        position: 'fixed',
        zIndex: '2147483647',
        pointerEvents: 'auto',
        opacity: '0',
        transition: 'opacity 0.15s ease',
      });
      document.body.appendChild(wrapper);
      currentQuickActions = wrapper;
    }
    const range = selectionManager.savedRange;
    if (!range) return;
    const boundingRect = range.getBoundingClientRect();
    const anchorRect = anchorPoint ? findRangeRectNearPoint(range, anchorPoint) : null;
    const rect = anchorRect || boundingRect;
    const text = selectionManager.getSavedText();
    wrapper.innerHTML = '';
    wrapper.dataset.manualPosition = 'false';

    createQuickActionButtons(text, handleQuickAction, handleIconClick, handleCopyAction)
      .then(buttonsContainer => {
        if (!buttonsContainer) return;

        // 保存初始位置信息
        const initialRect = {
          left: rect.left,
          top: rect.top,
          bottom: rect.bottom
        };
        const initialScroll = {
          x: window.pageXOffset || document.documentElement.scrollLeft,
          y: window.pageYOffset || document.documentElement.scrollTop
        };

        // 将小容器移动到选区处，仅包裹按钮本身，并确保层级低于弹窗
        Object.assign(wrapper.style, {
          left: `${rect.left}px`,
          top: `${rect.bottom + 5}px`,
          zIndex: '2147483646'
        });

	        // 挂载按钮
	        buttonsContainer.style.position = 'static';
	        wrapper.appendChild(buttonsContainer);
	        
	        // 水平防溢出：加宽后仍保持在视口内
	        requestAnimationFrame(() => {
	          try {
	            const containerRect = buttonsContainer.getBoundingClientRect();
	            const padding = 8;
	            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
	            let clampedLeft = initialRect.left;
	            const maxLeft = viewportWidth - containerRect.width - padding;
	            if (clampedLeft > maxLeft) clampedLeft = Math.max(padding, maxLeft);
	            if (clampedLeft < padding) clampedLeft = padding;
	
	            if (clampedLeft !== initialRect.left) {
	              initialRect.left = clampedLeft;
	              wrapper.style.left = `${clampedLeft}px`;
	            }
	          } catch (_) {}
	
	          // 显示
	          wrapper.style.opacity = '1';
	        });
	
	        // 记录显示时间，防止双击/三击的下一次 mousedown 立即移除
	        quickActionsShownAt = Date.now();

        // 🎯 添加滚动监听器，更新工具栏和高亮层位置
        const handleScroll = () => {
          if (!wrapper || wrapper.dataset.manualPosition === 'true') {
            return;
          }
          const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;

          const deltaX = currentScrollX - initialScroll.x;
          const deltaY = currentScrollY - initialScroll.y;

          // 更新工具栏位置
          if (wrapper && wrapper.parentNode) {
            wrapper.style.left = `${initialRect.left - deltaX}px`;
            wrapper.style.top = `${initialRect.bottom + 5 - deltaY}px`;
          }

        };

        // 保存滚动处理器引用，以便后续清理
        wrapper._scrollHandler = handleScroll;
        window.addEventListener('scroll', handleScroll, true);

        // 初始化拖拽功能
        if (buttonsContainer.initDrag) {
          buttonsContainer.initDrag();
        }
        // 自动聚焦输入框（延迟执行以保留选区）
        if (buttonsContainer.initFocus) {
          buttonsContainer.initFocus();
        }
        // 不再主动恢复选区，严格不干预浏览器的选择状态
      })
      .catch(err => {
        console.error('创建快捷按钮出错:', err);
        // 不做选区恢复，避免影响浏览器三击逻辑
      });
  } catch (error) {
    console.error('显示快捷按钮时出错:', error);
    // 不做选区恢复
  }
}

// 修改handleQuickAction函数
function handleQuickAction(action, text) {
  selectionManager.saveSelection();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const messages = [ { role: "user", content: text, } ];
  removeQuickActions();
  let prompt = action.prompt;
  if (action.id === 'translate' && !prompt.includes('简体中文')) {
    prompt = action.prompt.replace('{language}', '简体中文');
  }
  if (action.id === 'custom') {
    messages[0].userQuestion = action.prompt;
    prompt = "你是一个帮助用户理解和分析内容的AI助手。用户会提供一段内容以及他们的问题。请基于用户提供的内容回答用户问题。";
  }
  handlePopupCreation(text, rect, false, messages, prompt);
  selectionManager.scheduleRestore(50, false);
}

// 修改原有的updateSelectionUI为空函数，因为我们不再使用它
function updateSelectionUI() {
  // 这个函数被替换，不再使用
}

// 专门处理右键菜单事件
document.addEventListener("contextmenu", function(event) {
  const targetElement = event.target;
  const isOnQuickActions = targetElement.closest && targetElement.closest('.quick-action-buttons');
  if (isOnQuickActions) {
    return; // QAB内部右键，由浏览器处理
  }

  // 核心修复：右键菜单显示前，恢复浏览器原生选区
  // 确保复制选项可用
  if (selectionManager.hasSelection()) {
    selectionManager.restoreSelection(true);
  }
}, { capture: true });

// 修改捕获阶段的mousedown事件处理
document.addEventListener("mousedown", function(e) {
  if (isHandlingIconClick) return;
  const targetElement = e.target;
  const isOnQuickActions = targetElement.closest && targetElement.closest('.quick-action-buttons');
  const isOnInput = targetElement.closest && (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') && isOnQuickActions;

  if (isOnQuickActions) {
    if (e.button === 2) { return; } // QAB内部右键，浏览器处理
    // 左键点击QAB内部
    if (isOnInput) {
      selectionManager.saveSelection(); // 保存页面选区，以防用户改变主意
    } else {
      // 对于其他按钮（包括新的复制按钮），其自身的click事件会处理主要逻辑。
      // 这里可以保存选区，并阻止冒泡。
      selectionManager.saveSelection();
    }
    // e.stopPropagation (); // 允许冒泡，以便内部组件（如拖拽手柄）能接收到事件
    return;
  }

  // 点击在QAB外部
  if (e.button === 2) { // 右键外部
    // 不再尝试恢复选区来影响原生菜单
    return; // 交给浏览器和contextmenu事件处理
  }

  if (e.button === 0) { // 左键外部
    // 若点击在已保存选区内，不移除快捷按钮，支持双击/三击
    if (isPointInSavedSelection(e)) {
      return;
    }
    const withinGuardWindow = quickActionsShownAt && (Date.now() - quickActionsShownAt < DOUBLE_CLICK_GUARD_MS);
    if (!withinGuardWindow) {
      removeQuickActions();
      if (selectionManager.hasSelection()) {
        selectionManager.clear();
        try { window.getSelection().removeAllRanges(); } catch (err) { /* मौन */ }
      }
    }
  }

  // 仅在右键（上下文菜单）时使用临时聚焦黑客，避免干扰左键双/三击的点击计数与选区扩展
  if (e.button === 2 && selectionManager.savedRange) {
    const commonAncestor = selectionManager.savedRange.commonAncestorContainer;
    let focusableElement = commonAncestor;
    if (commonAncestor.nodeType === Node.TEXT_NODE) {
        focusableElement = commonAncestor.parentElement;
    }
    if (focusableElement && typeof focusableElement.focus === 'function') {
        // 保存当前焦点
        const currentActiveElement = document.activeElement;
        // 赋予临时焦点
        focusableElement.setAttribute('tabindex', '-1'); // 确保它可以被聚焦
        focusableElement.focus();
        // 计划在contextmenu之后或极短延迟后恢复焦点
        setTimeout(() => {
            if (currentActiveElement && typeof currentActiveElement.focus === 'function') {
                currentActiveElement.focus();
            }
            focusableElement.removeAttribute('tabindex');
        }, 50); // 延迟要非常小心
    }
  }
}, { capture: true, passive: false });

// 添加全局点击事件监听
document.addEventListener('mousedown', async (event) => {
  // 如果没有当前弹窗，直接返回
  if (!currentPopup) return;

  // 检查是否启用了临时固定（窗口固定按钮）
  const isTempPinned = currentPopup._isTempPinned || false;

  // 如果启用了固定，直接返回
  if (isTempPinned) return;

  // 检查点击区域 - 支持 Shadow DOM
  // 首先检查是否点击在 Shadow DOM 宿主元素上
  const shadowHost = document.getElementById('deepseek-shadow-host');
  if (shadowHost && (event.target === shadowHost || shadowHost.contains(event.target))) {
    // 点击在 Shadow DOM 宿主元素上，不关闭
    return;
  }

  // 检查是否点击在 Shadow DOM 内部的弹窗上
  // 由于事件来自 document，我们需要使用 composedPath 来检测 Shadow DOM 内部的元素
  const composedPath = event.composedPath ? event.composedPath() : [];
  const isClickInShadow = composedPath.some(el => {
    if (el.id === 'ai-popup') return true;
    if (el.id === 'deepseek-shadow-host') return true;
    if (el.classList && (
      el.classList.contains('icon-wrapper') ||
      el.classList.contains('icon-container') ||
      el.classList.contains('regenerate-icon')
    )) return true;
    return false;
  });

  if (isClickInShadow) return;

  // 传统检查（针对非 Shadow DOM 元素）
  const isClickInside = event.target.closest('#ai-popup') ||
                       event.target.closest('.icon-wrapper') ||
                       event.target.closest('.icon-container') ||
                       event.target.closest('.regenerate-icon');

  // 如果点击在弹窗内部或相关元素上，不关闭
  if (isClickInside) return;

  // 关闭弹窗
  safeRemovePopup();
});

// reasoning content 点击事件现在直接在 apiService.js 中绑定

// 添加更可靠的选中文本获取函数
function getReliableSelectedText() {
  // 首先尝试使用当前选中状态
  const selection = window.getSelection();
  if (selection && selection.toString && selection.toString().trim()) {
    const text = selection.toString().trim();
    // 更新最后选中的文本和时间
    lastSelectionText = text;
    lastSelectionTime = Date.now();
    return text;
  }

  // 如果当前没有选中文本，但是最近有选中过（5秒内），使用上一次选中的文本
  if (lastSelectionText && (Date.now() - lastSelectionTime) < SELECTION_TIMEOUT) {
    return lastSelectionText;
  }

  // 如果都没有，返回空字符串
  return "";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleChat") {
    try {
      // 如果弹窗已经存在或已最小化,关闭它(销毁会话)
      if (currentPopup || popupStateManager.isMinimized()) {
        // 清理最小化图标
        if (minimizeIcon && document.body.contains(minimizeIcon)) {
          if (minimizeIcon.cleanup) {
            minimizeIcon.cleanup();
          }
          document.body.removeChild(minimizeIcon);
          minimizeIcon = null;
        }

        // 强制清理弹窗（即使已最小化）
        safeRemovePopup(true);

        // 强制重置所有状态（包括最小化状态）
        popupStateManager.setMinimized(false);
        popupStateManager.setVisible(false);
        return;
      }

      // 如果窗口不存在,创建新窗口
      // 优先级：1. selectionManager 保存的选中文本  2. background.js 传递的 selectedText  3. 兜底获取
      // 因为 selectionManager 在用户选中时已经保存了选区，background.js 的 executeScript 可能因时序/焦点问题获取失败
      let selectedTextContent = "";

      // 第一优先级：使用 selectionManager 保存的选中文本
      if (selectionManager.hasSelection()) {
        selectedTextContent = selectionManager.getSavedText();
        lastSelectionText = selectedTextContent;
        lastSelectionTime = Date.now();
      }
      // 第二优先级：如果 selectionManager 没有保存，使用 background.js 传递的文本
      else if (request.selectedText) {
        selectedTextContent = request.selectedText;
        lastSelectionText = selectedTextContent;
        lastSelectionTime = Date.now();
      }
      // 第三优先级：兜底尝试从本地获取
      else {
        selectedTextContent = getReliableSelectedText();
      }

      const finalSelectedText = selectedTextContent;
      let rect;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      const textToUse = finalSelectedText || request.useGreeting;
      const hideQuestion = !finalSelectedText;

      handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling toggleChat:', error);
      safeRemovePopup();
    }
  } else if (request.action === "showHideChat") {
    try {
      // 首先检查是否已最小化（即使 currentPopup 可能为 null）
      if (popupStateManager.isMinimized() && minimizeIcon) {
        // 如果已最小化，恢复窗口
        restorePopup();
        return;
      }

      // 显示/隐藏窗口(保留会话状态)
      if (currentPopup) {
        const isCurrentlyVisible = currentPopup.style.display !== 'none';

        if (isCurrentlyVisible) {
          // 最小化窗口（而不是简单隐藏）
          minimizePopup();
        } else {
          // 显示窗口(添加动画)
          currentPopup.style.display = 'block';
          requestAnimationFrame(() => {
            currentPopup.style.opacity = '1';
            currentPopup.style.transform = 'translateY(0) scale(1)';
          });
          popupStateManager.setVisible(true);

          // 自动聚焦到输入框
          setTimeout(() => {
            if (currentPopup) {
              const textarea = currentPopup.querySelector('.expandable-textarea');
              if (textarea) {
                textarea.focus();
              }
            }
          }, 100);
        }
        return;
      }

      // 如果窗口不存在,创建新窗口
      // 优先级：1. selectionManager 保存的选中文本  2. background.js 传递的 selectedText  3. 兜底获取
      // 因为 selectionManager 在用户选中时已经保存了选区，background.js 的 executeScript 可能因时序/焦点问题获取失败
      let selectedTextContent = "";

      // 第一优先级：使用 selectionManager 保存的选中文本
      if (selectionManager.hasSelection()) {
        selectedTextContent = selectionManager.getSavedText();
        lastSelectionText = selectedTextContent;
        lastSelectionTime = Date.now();
      }
      // 第二优先级：如果 selectionManager 没有保存，使用 background.js 传递的文本
      else if (request.selectedText) {
        selectedTextContent = request.selectedText;
        lastSelectionText = selectedTextContent;
        lastSelectionTime = Date.now();
      }
      // 第三优先级：兜底尝试从本地获取
      else {
        selectedTextContent = getReliableSelectedText();
      }

      const finalSelectedText = selectedTextContent;
      let rect;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        rect = {
          left: window.innerWidth / 2,
          top: window.innerHeight / 2 - 190,
          width: 0,
          height: 0
        };
      }

      const textToUse = finalSelectedText || request.useGreeting;
      const hideQuestion = !finalSelectedText;

      handlePopupCreation(textToUse, rect, hideQuestion);
    } catch (error) {
      console.warn('Error handling showHideChat:', error);
      safeRemovePopup();
    }
  } else if (request.action === "createPopup") {
    // 处理从background.js传来的右键菜单和快捷键消息
    try {
      // 如果没有提供selectedText，尝试获取当前选中的文本
      let selectedTextContent = request.selectedText;
      if (!selectedTextContent) {
        const selection = window.getSelection();
        selectedTextContent = selection && selection.toString ? selection.toString().trim() : "";
      }



      // 准备弹窗位置
      let rect;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        // 只有当页面上有选中内容时，才使用选中区域
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        // 无选中内容或选中为空，使用默认位置
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
    // 使用更可靠的方法获取选中文本
    sendResponse({ selectedText: getReliableSelectedText() });
  } else if (request.action === "closeChat") {
    // 清理最小化图标
    if (minimizeIcon && document.body.contains(minimizeIcon)) {
      if (minimizeIcon.cleanup) {
        minimizeIcon.cleanup();
      }
      document.body.removeChild(minimizeIcon);
      minimizeIcon = null;
    }

    // 强制移除弹窗
    safeRemovePopup(true);
    popupStateManager.setMinimized(false);
    popupStateManager.setVisible(false);
  }
});

// 隐藏快捷按钮
function hideQuickActions() {
  // 兼容旧容器（全屏遮罩）
  const container = document.getElementById('fixed-quick-actions-container');
  if (container) {
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    setTimeout(() => { container.innerHTML = ''; }, 200);
  }

  // 新容器：精确定位的小包裹器，出现会优先移除
  const wrapper = document.getElementById('quick-actions-wrapper');
  if (wrapper) {
    // 🎯 清理滚动监听器
    if (wrapper._scrollHandler) {
      window.removeEventListener('scroll', wrapper._scrollHandler, true);
      delete wrapper._scrollHandler;
    }

    if (wrapper.parentNode) {
      try { wrapper.parentNode.removeChild(wrapper); } catch (_) {}
    }
    if (currentQuickActions === wrapper) currentQuickActions = null;
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

// 在快捷按钮栏显示后，点击其外部则关闭（不影响三击选区，因为发生在显示之后）
document.addEventListener('mousedown', (e) => {
  const wrapper = document.getElementById('quick-actions-wrapper');
  if (!wrapper) return;
  // 点击在按钮内部：忽略
  if (e.target.closest && e.target.closest('.quick-action-buttons')) return;
  // 其他任意点击：关闭快捷栏
  hideQuickActions();
}, { passive: true });

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

// 立即初始化固定容器
document.addEventListener('DOMContentLoaded', () => {
  // 检查容器是否已存在
  if (!document.getElementById('fixed-quick-actions-container')) {
    const container = document.createElement('div');
    container.id = 'fixed-quick-actions-container';
    Object.assign(container.style, {
      position: 'absolute',
      pointerEvents: 'none',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '2147483646',
      opacity: '0',
      transition: 'opacity 0.2s ease'
    });
    document.body.appendChild(container);
    currentQuickActions = container;
  }
});

// 如果DOMContentLoaded已触发，立即初始化
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  if (!document.getElementById('fixed-quick-actions-container')) {
    const container = document.createElement('div');
    container.id = 'fixed-quick-actions-container';
    Object.assign(container.style, {
      position: 'absolute',
      pointerEvents: 'none',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '2147483646',
      opacity: '0',
      transition: 'opacity 0.2s ease'
    });
    document.body.appendChild(container);
    currentQuickActions = container;
  }
}

// 修改原始的removeQuickActions函数实现
function removeQuickActions() {
  hideQuickActions();
}

async function handleCopyAction() {
  if (selectionManager.hasSelection()) {
    const textToCopy = selectionManager.getSavedText();
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        removeQuickActions();
        selectionManager.clear();
        try {
          window.getSelection().removeAllRanges();
        } catch (err) { /* मौन त्रुटि */ }
      } catch (err) {
        console.error("复制文本失败:", err);
      }
    }
  } else {
    console.log("没有选中的文本可以复制");
  }
}

// 🎯 核心修复：全局 copy 事件监听
// 在任何复制操作前恢复选区，确保 Ctrl+C 和右键复制都能工作
document.addEventListener('copy', function(event) {
  if (selectionManager.hasSelection()) {
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.isCollapsed || !currentSelection.toString().trim()) {
      // 当前没有选区或选区为空，恢复保存的选区
      selectionManager.restoreSelection(true);
    }
  }
}, { capture: true });

// 🎯 核心修复：监听 Ctrl/Cmd+C 组合键
// 在按键触发时立即恢复选区，确保后续的 copy 事件能正确执行
document.addEventListener('keydown', function(event) {
  // 检测 Ctrl+C (Windows/Linux) 或 Cmd+C (Mac)
  const isCopyShortcut = (event.ctrlKey || event.metaKey) && event.key === 'c';

  if (isCopyShortcut && selectionManager.hasSelection()) {
    const currentSelection = window.getSelection();
    if (!currentSelection || currentSelection.isCollapsed || !currentSelection.toString().trim()) {
      // 当前没有有效选区，恢复保存的选区
      selectionManager.restoreSelection(true);
    }
  }
}, { capture: true });
