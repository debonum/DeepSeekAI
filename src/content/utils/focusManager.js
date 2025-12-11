import { popupStateManager } from './popupStateManager';
import { getPopupElement } from '../components/ShadowContainer';

function isElementEditable(element) {
  if (!element) return false;
  const tag = element.tagName;
  if (!tag) return false;
  const editableTags = ['INPUT', 'TEXTAREA', 'SELECT'];
  return editableTags.includes(tag) || element.isContentEditable === true;
}

function isPopupRenderable(popup) {
  if (!popup || !popup.isConnected) return false;
  const style = window.getComputedStyle(popup);
  if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) {
    return false;
  }
  const rect = popup.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function focusInputIfSafe(popup) {
  const targetPopup = popup || getPopupElement();

  if (document.visibilityState !== 'visible') return;
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
  if (!isPopupRenderable(targetPopup)) return;
  if (popupStateManager && typeof popupStateManager.isMinimized === 'function' && popupStateManager.isMinimized()) return;

  const active = document.activeElement;

  // 增强焦点保护：如果当前活跃元素就是我们想要的输入框，直接返回
  const textarea = targetPopup && targetPopup.querySelector && targetPopup.querySelector('.expandable-textarea');
  if (!textarea) return;

  if (active === textarea) return; // 如果焦点已经在目标输入框，不需要重新聚焦

  // 增强焦点保护：如果当前元素是可编辑的且用户正在输入，不要打断
  if (isElementEditable(active)) {
    // 检查用户是否在活跃输入（最近有输入事件）
    const lastInputTime = active._lastInputTime || 0;
    const now = Date.now();
    if (now - lastInputTime < 1000) { // 1秒内有输入则认为是活跃状态
      return;
    }
  }

  const tryFocus = () => {
    if (!textarea || textarea.disabled) return false;
    try {
      if (typeof textarea.focus === 'function') textarea.focus({ preventScroll: true });
      const len = typeof textarea.value === 'string' ? textarea.value.length : 0;
      if (typeof textarea.setSelectionRange === 'function') textarea.setSelectionRange(len, len);
    } catch (_) {
      if (typeof textarea.focus === 'function') textarea.focus();
    }
    return document.activeElement === textarea;
  };

  if (!tryFocus()) {
    requestAnimationFrame(() => { setTimeout(tryFocus, 120); });
  }
}
