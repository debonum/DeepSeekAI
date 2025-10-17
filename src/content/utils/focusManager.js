import { popupStateManager } from './popupStateManager';

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
  const targetPopup = popup || document.getElementById('ai-popup');

  if (document.visibilityState !== 'visible') return;
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return;
  if (!isPopupRenderable(targetPopup)) return;
  if (popupStateManager && typeof popupStateManager.isMinimized === 'function' && popupStateManager.isMinimized()) return;

  const active = document.activeElement;
  if (isElementEditable(active)) return;

  const textarea = targetPopup && targetPopup.querySelector && targetPopup.querySelector('.expandable-textarea');
  if (!textarea) return;

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


