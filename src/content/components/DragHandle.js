export function initDraggable(dragHandle, popup) {
  let isDragging = false;
  let startX, startY;
  let initialX, initialY;

  dragHandle.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  function startDragging(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = popup.offsetLeft;
    initialY = popup.offsetTop;
    popup.style.transition = 'none';

    // 添加拖拽状态样式，提供更好的视觉反馈
    popup.classList.add('dragging');
    // 改变光标样式
    dragHandle.style.cursor = 'grabbing';

    // 添加拖拽开始的触感反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // 添加拖拽的惯性和流畅感
    popup.style.left = `${initialX + dx}px`;
    popup.style.top = `${initialY + dy}px`;

    // 更新窗口位置时显示距离指示器（仅当移动足够距离时）
    const moveDistance = Math.sqrt(dx * dx + dy * dy);
    if (moveDistance > 50) {
      // 显示拖拽距离指示器
      showDragDistance(popup, moveDistance.toFixed(0));
    }
  }

  function stopDragging() {
    if (!isDragging) return;

    isDragging = false;
    popup.style.transition = 'transform 0.05s cubic-bezier(0.4, 0, 0.2, 1)';

    // 移除拖拽状态样式
    popup.classList.remove('dragging');
    // 恢复光标样式
    dragHandle.style.cursor = 'grab';

    // 移除拖拽距离指示器
    const distanceIndicator = popup.querySelector('.drag-distance');
    if (distanceIndicator) {
      distanceIndicator.remove();
    }

    // 添加"放置"的触感反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }

    // 添加放置动画效果
    popup.classList.add('drag-placed');
    setTimeout(() => {
      popup.classList.remove('drag-placed');
    }, 150);
  }

  // 显示拖拽距离指示器
  function showDragDistance(popup, distance) {
    let distanceIndicator = popup.querySelector('.drag-distance');

    if (!distanceIndicator) {
      distanceIndicator = document.createElement('div');
      distanceIndicator.className = 'drag-distance';
      distanceIndicator.style.position = 'absolute';
      distanceIndicator.style.bottom = '-25px';
      distanceIndicator.style.left = '50%';
      distanceIndicator.style.transform = 'translateX(-50%)';
      distanceIndicator.style.backgroundColor = 'var(--bg-secondary)';
      distanceIndicator.style.color = 'var(--text-secondary)';
      distanceIndicator.style.padding = '4px 8px';
      distanceIndicator.style.borderRadius = '4px';
      distanceIndicator.style.fontSize = '10px';
      distanceIndicator.style.pointerEvents = 'none';
      distanceIndicator.style.zIndex = '2000';
      distanceIndicator.style.opacity = '0.9';
      distanceIndicator.style.boxShadow = 'var(--shadow-sm)';
      popup.appendChild(distanceIndicator);
    }

    distanceIndicator.textContent = `已移动 ${distance}px`;
  }

  return () => {
    dragHandle.removeEventListener('mousedown', startDragging);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDragging);
  };
}

export function resizeMoveListener(event) {
  const { target, rect } = event;

  Object.assign(target.style, {
    width: `${rect.width}px`,
    height: `${rect.height}px`
  });

  if (event.edges.left) {
    target.style.left = `${rect.left}px`;
  }
  if (event.edges.top) {
    target.style.top = `${rect.top}px`;
  }
}

export function createDragHandle(removeCallback, minimizeCallback) {
  const dragHandle = document.createElement("div");
  Object.assign(dragHandle.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "40px",
    cursor: "grab", // 改为grab光标，更符合拖拽操作的直觉
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 10px",
    boxSizing: "border-box",
  });

  dragHandle.classList.add('drag-handle');

  const titleContainer = document.createElement("div");
  Object.assign(titleContainer.style, {
    display: "flex",
    alignItems: "center",
    userSelect: "none",
    WebkitUserSelect: "none",
    pointerEvents: "none"
  });

  const logo = document.createElement("img");
  logo.src = chrome.runtime.getURL("icons/icon24.png");
  Object.assign(logo.style, {
    height: "24px",
    marginRight: "10px",
    userSelect: "none",
    WebkitUserSelect: "none",
    pointerEvents: "none",
    WebkitUserDrag: "none",
    WebkitAppRegion: "no-drag",
    draggable: false
  });
  logo.setAttribute("draggable", "false");

  const textNode = document.createElement("span");
  Object.assign(textNode.style, {
    fontWeight: "bold",
    userSelect: "none",
    WebkitUserSelect: "none",
    pointerEvents: "none"
  });
  textNode.textContent = "DeepSeek AI";
  titleContainer.appendChild(logo);
  titleContainer.appendChild(textNode);

  // 添加拖拽提示
  const dragTooltip = document.createElement("div");
  dragTooltip.className = "tool-tip";
  dragTooltip.textContent = "Drag to move the window";
  dragTooltip.style.top = "45px";
  dragTooltip.style.left = "50%";
  dragTooltip.style.transform = "translateX(-50%)";
  dragHandle.appendChild(dragTooltip);

  const closeButton = document.createElement("button");
  closeButton.className = "close-button tooltip-trigger";
  Object.assign(closeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    margin: "0",
    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%) scale(1)",
    width: "24px",
    height: "24px",
    minWidth: "24px",
    minHeight: "24px",
    maxWidth: "24px",
    maxHeight: "24px",
    lineHeight: "1",
    outline: "none",
    boxSizing: "content-box",
    zIndex: "10",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const closeIcon = document.createElement("div");
  closeIcon.className = "close-icon";
  // 使用已有的关闭图标SVG
  closeIcon.innerHTML = `
    <img src="${chrome.runtime.getURL('icons/close.svg')}" alt="关闭" width="16" height="16" style="display: block;">
  `;

  // 简化图标样式
  Object.assign(closeIcon.style, {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "var(--text-secondary)",
    transition: "transform 0.15s ease, color 0.15s ease",
    padding: "0",
    zIndex: "10"
  });

  closeButton.appendChild(closeIcon);

  closeButton.addEventListener("mouseenter", () => {
    // 悬停时变为苹果蓝色并轻微放大
    closeIcon.style.transform = "scale(1.1)";
    const img = closeIcon.querySelector('img');
    if (img) {
      img.style.filter = "invert(48%) sepia(57%) saturate(6300%) hue-rotate(193deg) brightness(101%) contrast(101%)";
    }
  });

  closeButton.addEventListener("mouseleave", () => {
    // 恢复正常状态
    closeIcon.style.transform = "scale(1)";
    const img = closeIcon.querySelector('img');
    if (img) {
      img.style.filter = "";
    }
  });

  closeButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    // 点击时只放大图标而不是整个按钮
    closeIcon.style.transform = "scale(1.2)";

    // 强制按钮保持在原位置
    closeButton.style.transform = "translateY(-50%)";
    closeButton.style.top = "50%";

    // 触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(8);
    }
  });

  closeButton.addEventListener("mouseup", () => {
    // 恢复到悬停状态，按钮保持位置不变
    closeIcon.style.transform = "scale(1.1)";
    closeButton.style.transform = "translateY(-50%)";
  });

  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault(); // 防止默认行为

    // 强制按钮保持在原位置
    closeButton.style.transform = "translateY(-50%)";
    closeButton.style.transition = "none";

    // 确保图标不会发生变形
    closeIcon.style.transition = "none";
    closeIcon.style.transform = "scale(1)";

    // 阻止所有可能的动画或滑动
    const img = closeIcon.querySelector('img');
    if (img) {
      img.style.transition = "none";
    }

    // 立即执行关闭回调，不添加任何额外效果
    if (removeCallback) {
      removeCallback();
    }
  });

  // 最小化按钮（在关闭按钮左侧）
  const minimizeButton = document.createElement("button");
  minimizeButton.className = "minimize-button tooltip-trigger";
  Object.assign(minimizeButton.style, {
    display: "none",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px",
    margin: "0",
    transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
    position: "absolute",
    right: "42px",
    top: "50%",
    transform: "translateY(-50%) scale(1)",
    width: "24px",
    height: "24px",
    minWidth: "24px",
    minHeight: "24px",
    maxWidth: "24px",
    maxHeight: "24px",
    lineHeight: "1",
    outline: "none",
    boxSizing: "content-box",
    zIndex: "10",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  const minimizeIcon = document.createElement("div");
  minimizeIcon.className = "minimize-icon";
  minimizeIcon.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block">
      <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;
  Object.assign(minimizeIcon.style, {
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    color: "var(--text-secondary)",
    transition: "transform 0.15s ease, color 0.15s ease",
    padding: "0",
    zIndex: "10"
  });
  minimizeButton.appendChild(minimizeIcon);

  minimizeButton.addEventListener("mouseenter", () => {
    minimizeIcon.style.transform = "scale(1.1)";
    minimizeIcon.style.color = "var(--accent-color, #007aff)";
  });
  minimizeButton.addEventListener("mouseleave", () => {
    minimizeIcon.style.transform = "scale(1)";
    minimizeIcon.style.color = "var(--text-secondary)";
  });
  minimizeButton.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    minimizeIcon.style.transform = "scale(1.2)";
    minimizeButton.style.transform = "translateY(-50%)";
    minimizeButton.style.top = "50%";
    if ('vibrate' in navigator) navigator.vibrate(8);
  });
  minimizeButton.addEventListener("mouseup", () => {
    minimizeIcon.style.transform = "scale(1.1)";
    minimizeButton.style.transform = "translateY(-50%)";
  });
  minimizeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    minimizeButton.style.transform = "translateY(-50%)";
    minimizeIcon.style.transform = "scale(1)";
    if (typeof minimizeCallback === 'function') {
      minimizeCallback();
    }
  });

  dragHandle.addEventListener("mouseenter", () => {
    closeButton.style.display = "flex";
    minimizeButton.style.display = "flex";
  });

  dragHandle.addEventListener("mouseleave", () => {
    closeButton.style.display = "none";
    minimizeButton.style.display = "none";
  });

  dragHandle.appendChild(titleContainer);
  dragHandle.appendChild(closeButton);
  dragHandle.appendChild(minimizeButton);

  // 添加徽标，表示扩展的身份
  dragHandle.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    if (removeCallback) {
      // 双击标题栏也可以关闭
      removeCallback();
    }
  });

  return dragHandle;
}
