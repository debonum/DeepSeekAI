// 选区保持管理器
export class SelectionPreservationManager {
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
    if (
      activeElement &&
      (activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA") &&
      activeElement.closest &&
      activeElement.closest(
        ".deepseek-quick-action-buttons, .quick-action-buttons",
      )
    ) {
      if (!force) {
        // 非强制恢复时，如果焦点在QAB输入框，则不打扰
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
      if (!this.isPreserving && !force && !shouldRestore) return false;

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
      return (
        document.contains(range.startContainer) &&
        document.contains(range.endContainer)
      );
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

// 创建全局实例
export const selectionManager = new SelectionPreservationManager();

// 判断点击是否发生在已保存选区矩形内（允许微小边距）
export function isPointInSavedSelection(e, padding = 12) {
  try {
    if (!selectionManager.savedRange) return false;
    const rect = selectionManager.savedRange.getBoundingClientRect();
    const x = e.clientX,
      y = e.clientY;
    return (
      x >= rect.left - padding &&
      x <= rect.right + padding &&
      y >= rect.top - padding &&
      y <= rect.bottom + padding
    );
  } catch (_) {
    return false;
  }
}

// 添加下划线到选中文本 - 现在是空函数，不再添加任何下划线
export function addUnderlineToSelection(selection) {
  // 功能已移除，仅保留函数供其他地方调用
  // 只保存选中文本信息，不实际添加下划线
  // 这里的 selectedText 逻辑可能需要外部处理，或者传入 callback
}

// 移除所有下划线 - 现在是空函数
export function removeUnderlines() {
  // 功能已移除，仅保留函数供其他地方调用
}
