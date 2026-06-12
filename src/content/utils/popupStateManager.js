// 管理弹窗状态的单例模块（最小而全：创建/可见/最小化 + 图标位置持久化）
class PopupStateManager {
  constructor() {
    this.isCreatingPopup = false;
    this.isPopupVisible = false;
    this.isPopupMinimized = false;
    this.DEFAULT_ICON_POSITION = { bottom: 24, right: 24 };
  }

  // 基本状态
  setCreating(value) {
    this.isCreatingPopup = Boolean(value);
  }
  setVisible(value) {
    this.isPopupVisible = Boolean(value);
  }
  isCreating() {
    return this.isCreatingPopup;
  }
  isVisible() {
    return this.isPopupVisible;
  }

  // 最小化状态
  setMinimized(value) {
    this.isPopupMinimized = Boolean(value);
  }
  isMinimized() {
    return this.isPopupMinimized;
  }

  // 图标位置持久化（同步存储，容错返回默认值）
  async saveIconPosition(bottom, right) {
    try {
      const b = Number.isFinite(bottom)
        ? bottom
        : this.DEFAULT_ICON_POSITION.bottom;
      const r = Number.isFinite(right)
        ? right
        : this.DEFAULT_ICON_POSITION.right;
      await chrome.storage.sync.set({
        minimizeIconPosition: { bottom: b, right: r },
      });
    } catch (_) {
      // 忽略存储错误，避免影响主流程
    }
  }

  async loadIconPosition() {
    try {
      const data = await chrome.storage.sync.get(["minimizeIconPosition"]);
      const pos = data && data.minimizeIconPosition;
      if (pos && Number.isFinite(pos.bottom) && Number.isFinite(pos.right)) {
        return { bottom: pos.bottom, right: pos.right };
      }
    } catch (_) {
      // 读取失败时返回默认值
    }
    return { ...this.DEFAULT_ICON_POSITION };
  }

  // 全量复位
  reset() {
    this.isCreatingPopup = false;
    this.isPopupVisible = false;
    this.isPopupMinimized = false;
  }
}

// 导出单例实例
export const popupStateManager = new PopupStateManager();
