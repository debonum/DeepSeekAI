import { SCROLL_CONSTANTS } from "./constants";

class ScrollStateManager {
  constructor() {
    this.isManualScrolling = false;
    this.lastScrollTime = 0;
    this.scrollTimeout = null;
    this.scrollRAF = null;
    this.scrollAnimation = {
      isAnimating: false,
      startTime: 0,
      startPosition: 0,
      targetPosition: 0,
      duration: SCROLL_CONSTANTS.ANIMATION_DURATION,
    };
    this.scrollMomentum = {
      velocity: 0,
      timestamp: 0,
      positions: [],
      maxSamples: SCROLL_CONSTANTS.MAX_MOMENTUM_SAMPLES,
    };
    this.isInteracting = false; // 新增：跟踪用户是否正在进行物理交互（按住鼠标/触摸）
  }

  setInteracting(value) {
    this.isInteracting = value;
  }

  setManualScrolling(value) {
    this.isManualScrolling = value;
    if (value) {
      this.lastScrollTime = Date.now();
      this.scrollAnimation.isAnimating = false;
    }
  }

  updateScrollVelocity(currentPosition) {
    const now = Date.now();
    const positions = this.scrollMomentum.positions;

    positions.push({
      position: currentPosition,
      timestamp: now,
    });

    if (positions.length > this.scrollMomentum.maxSamples) {
      positions.shift();
    }

    if (positions.length >= 2) {
      const newest = positions[positions.length - 1];
      const oldest = positions[0];
      const timeDiff = newest.timestamp - oldest.timestamp;

      if (timeDiff > 0) {
        this.scrollMomentum.velocity =
          (newest.position - oldest.position) / timeDiff;
      }
    }
  }

  isRapidScrolling() {
    return Math.abs(this.scrollMomentum.velocity) > 0.5;
  }

  isInCooldown() {
    return Date.now() - this.lastScrollTime < 150 || this.isRapidScrolling();
  }

  saveScrollPosition(container) {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    this.isAtBottom = distanceFromBottom <= SCROLL_CONSTANTS.SCROLL_THRESHOLD;
    this.scrollPosition = scrollTop;
    this.updateScrollVelocity(scrollTop);
  }

  restoreScrollPosition(container) {
    if (this.isAtBottom) {
      container.scrollTop = container.scrollHeight;
    } else {
      const scrollRatio = this.scrollPosition / container.scrollHeight;
      container.scrollTop = scrollRatio * container.scrollHeight;
    }
  }

  isNearBottom(container) {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return (
      scrollHeight - (scrollTop + clientHeight) <=
      SCROLL_CONSTANTS.SCROLL_THRESHOLD
    );
  }

  cleanup() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
    this.scrollAnimation.isAnimating = false;
    this.scrollMomentum.positions = [];
    this.scrollMomentum.velocity = 0;
  }
}

let allowAutoScroll = false;

const isAtBottom = (container) => {
  if (!container) return false;
  const { scrollTop, scrollHeight, clientHeight } = container;
  // 安全检查：如果在顶部（scrollTop < 1）且内容高度超过可视高度，则肯定不在底部
  if (
    scrollTop < 1 &&
    scrollHeight > clientHeight + SCROLL_CONSTANTS.SCROLL_THRESHOLD
  )
    return false;
  return (
    scrollHeight - (scrollTop + clientHeight) <=
    SCROLL_CONSTANTS.SCROLL_THRESHOLD
  );
};

export function setAllowAutoScroll(value) {
  allowAutoScroll = value;
}

export function getAllowAutoScroll() {
  return allowAutoScroll;
}

export function updateAllowAutoScroll(container, event) {
  if (!container) return;

  const currentIsAtBottom = isAtBottom(container);

  if (currentIsAtBottom) {
    // 如果已经在底部，强制开启自动滚动
    setAllowAutoScroll(true);
  } else {
    // 如果不在底部，只有当是用户主动操作（event.isTrusted）时，才关闭自动滚动
    // 防止系统自动扩展内容导致的高度变化（非用户操作）错误地关闭自动滚动
    if (event && event.isTrusted) {
      setAllowAutoScroll(false);
    }
    // 如果是系统事件（event.isTrusted 为 undefined 或 false），保持原状态不变
    // 这样当内容生成导致暂时不在底部时，不会错误地取消自动滚动
  }
}

// 优化后的用户滚动处理函数
export function handleUserScroll(event) {
  const container = event?.target || event;
  if (!container) return;

  updateAllowAutoScroll(container, event);
}

// 在新内容添加后更新滚动状态
export function updateScrollStateAfterContentAdd(container) {
  if (!container) return;

  // 只有当已开启自动滚动（用户滚动到底部）时才自动滚动
  if (!getAllowAutoScroll()) return;

  scrollToBottom(container);
}

// 重置所有滚动状态
export function resetScrollState() {
  allowAutoScroll = false;
}

// 检查是否可以自动滚动
export function canAutoScroll() {
  return getAllowAutoScroll();
}

export function scrollToBottom(container, shouldCheckState = false) {
  if (!container) return;

  requestAnimationFrame(() => {
    // 强力护盾：如果用户正在交互（按住滚动条/触摸屏幕），绝对禁止自动滚动
    if (
      container.scrollStateManager &&
      container.scrollStateManager.isInteracting
    )
      return;

    // JIT检查：如果要求检查状态，且当前不允许自动滚动，则取消本次滚动
    if (shouldCheckState && !getAllowAutoScroll()) return;

    container.scrollTop = container.scrollHeight;

    if (container.perfectScrollbar) {
      container.perfectScrollbar.update();
    }
  });
}

export function createScrollManager() {
  const scrollState = {
    isManualScrolling: false,
    lastScrollTime: 0,
    scrollTimeout: null,
    isAtBottom: true,
    scrollPosition: 0,
    isInteracting: false,
    scrollMomentum: {
      positions: [],
      maxSamples: 5,
      velocity: 0,
    },
  };

  return {
    ...scrollState,

    setManualScrolling(value) {
      this.isManualScrolling = value;
      if (value) {
        this.lastScrollTime = Date.now();
      }
    },

    setInteracting(value) {
      this.isInteracting = Boolean(value);
    },

    updateScrollVelocity(currentPosition) {
      const now = Date.now();
      const positions = this.scrollMomentum.positions;

      positions.push({
        position: currentPosition,
        timestamp: now,
      });

      if (positions.length > this.scrollMomentum.maxSamples) {
        positions.shift();
      }

      if (positions.length >= 2) {
        const newest = positions[positions.length - 1];
        const oldest = positions[0];
        const timeDiff = newest.timestamp - oldest.timestamp;

        if (timeDiff > 0) {
          this.scrollMomentum.velocity =
            (newest.position - oldest.position) / timeDiff;
        }
      }
    },

    isRapidScrolling() {
      return Math.abs(this.scrollMomentum.velocity) > 0.5;
    },

    isInCooldown() {
      return Date.now() - this.lastScrollTime < 150 || this.isRapidScrolling();
    },

    isNearBottom(container) {
      if (!container) return false;
      const { scrollTop, scrollHeight, clientHeight } = container;
      // 安全检查：如果在顶部（scrollTop < 1）且内容高度超过可视高度，则肯定不在底部
      if (
        scrollTop < 1 &&
        scrollHeight > clientHeight + SCROLL_CONSTANTS.SCROLL_THRESHOLD
      )
        return false;
      return (
        scrollHeight - (scrollTop + clientHeight) <=
        SCROLL_CONSTANTS.SCROLL_THRESHOLD
      );
    },

    saveScrollPosition(container) {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      // 安全检查：如果在顶部（scrollTop < 1）且内容高度超过可视高度，则肯定不在底部
      if (
        scrollTop < 1 &&
        scrollHeight > clientHeight + SCROLL_CONSTANTS.SCROLL_THRESHOLD
      ) {
        this.isAtBottom = false;
      } else {
        this.isAtBottom =
          scrollHeight - (scrollTop + clientHeight) <=
          SCROLL_CONSTANTS.SCROLL_THRESHOLD;
      }
      this.scrollPosition = scrollTop;
      this.updateScrollVelocity(scrollTop);
    },

    restoreScrollPosition(container) {
      if (!container) return;
      if (this.isAtBottom) {
        scrollToBottom(container);
      } else {
        container.scrollTop = this.scrollPosition;
        if (container.perfectScrollbar) {
          container.perfectScrollbar.update();
        }
      }
    },

    scrollToBottom(container, shouldCheckState = false) {
      scrollToBottom(container, shouldCheckState);
    },

    cleanup() {
      if (this.scrollTimeout) {
        clearTimeout(this.scrollTimeout);
      }
      this.isManualScrolling = false;
      this.lastScrollTime = 0;
      this.scrollTimeout = null;
      this.scrollMomentum.positions = [];
      this.scrollMomentum.velocity = 0;
      this.isInteracting = false;
    },
  };
}

// 优化的滚动处理函数
export function setupScrollHandlers(container, perfectScrollbar) {
  if (!container) return;

  const scrollManager = container.scrollStateManager;

  const handleScroll = (event) => {
    if (!scrollManager) return;

    // 只有用户触发的滚动才算手动滚动
    if (event.isTrusted) {
      scrollManager.setManualScrolling(true);
    }
    scrollManager.saveScrollPosition(container);

    // 无论是否冷却，状态必须实时、同步更新 (零延迟)
    updateAllowAutoScroll(container, event);

    handleUserScroll(event);

    requestAnimationFrame(() => {
      if (perfectScrollbar) {
        perfectScrollbar.update();
      }

      if (!scrollManager.isInCooldown()) {
        const isAtBottom = scrollManager.isNearBottom(container);

        if (isAtBottom && getAllowAutoScroll()) {
          scrollManager.scrollToBottom(container, true);
        }
      }
    });

    // 重置手动滚动状态
    if (scrollManager.scrollTimeout) {
      clearTimeout(scrollManager.scrollTimeout);
    }
    scrollManager.scrollTimeout = setTimeout(() => {
      scrollManager.setManualScrolling(false);
    }, 150);
  };

  // 使用 passive 选项优化性能
  container.addEventListener("wheel", handleScroll, { passive: true });
  container.addEventListener("touchstart", handleScroll, { passive: true });
  container.addEventListener("touchmove", handleScroll, { passive: true });
  container.addEventListener("scroll", handleScroll, { passive: true });

  // 交互状态监听（护盾机制）
  const handleInteractionStart = () => scrollManager.setInteracting(true);
  const handleInteractionEnd = () => scrollManager.setInteracting(false);

  container.addEventListener("mousedown", handleInteractionStart, {
    passive: true,
  });
  container.addEventListener("mouseup", handleInteractionEnd, {
    passive: true,
  });
  container.addEventListener("mouseleave", handleInteractionEnd, {
    passive: true,
  }); // 鼠标移出也视为结束
  container.addEventListener("touchstart", handleInteractionStart, {
    passive: true,
  });
  container.addEventListener("touchend", handleInteractionEnd, {
    passive: true,
  });

  // 返回清理函数
  return () => {
    container.removeEventListener("wheel", handleScroll);
    container.removeEventListener("touchstart", handleScroll);
    container.removeEventListener("touchmove", handleScroll);
    container.removeEventListener("scroll", handleScroll);

    container.removeEventListener("mousedown", handleInteractionStart);
    container.removeEventListener("mouseup", handleInteractionEnd);
    container.removeEventListener("mouseleave", handleInteractionEnd);
    container.removeEventListener("touchstart", handleInteractionStart);
    container.removeEventListener("touchend", handleInteractionEnd);
  };
}
