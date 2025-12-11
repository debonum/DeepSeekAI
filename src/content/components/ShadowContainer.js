/**
 * Shadow DOM 容器组件
 * 用于创建样式隔离的弹窗容器，防止宿主网页样式污染扩展 UI
 */

// 全局 Shadow 容器引用
let shadowContainerInstance = null;

/**
 * 检测页面是否使用了 filter: invert() 实现深色模式
 * @returns {boolean}
 */
function detectPageInvertFilter() {
  const checkElement = (el) => {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    const filter = style.filter || style.webkitFilter || '';
    return filter.includes('invert');
  };
  
  return checkElement(document.documentElement) || checkElement(document.body);
}

/**
 * 创建 Shadow DOM 容器
 * @param {string} cssText - 要注入到 Shadow DOM 的 CSS 样式文本
 * @returns {{ host: HTMLElement, shadow: ShadowRoot, container: HTMLElement }}
 */
export function createShadowContainer(cssText) {
  // 如果已存在，先销毁
  if (shadowContainerInstance) {
    destroyShadowContainer();
  }

  // 创建宿主元素
  const host = document.createElement('div');
  host.id = 'deepseek-shadow-host';

  // 检测页面是否使用了 invert filter
  const pageUsesInvert = detectPageInvertFilter();

  // 设置宿主元素的样式，确保它不被宿主网页影响
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    overflow: 'visible',
    zIndex: '2147483647',
    pointerEvents: 'none', // 宿主元素不拦截事件
    // 如果页面使用了 invert，我们也应用 invert 来抵消效果
    filter: pageUsesInvert ? 'invert(1) hue-rotate(180deg)' : 'none',
    isolation: 'isolate',  // 创建新的层叠上下文，隔离混合模式
  });

  // 创建 Shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  // 注入样式
  const style = document.createElement('style');
  style.textContent = `
    /* Shadow DOM 根容器重置样式 */
    :host {
      all: initial !important;
      display: block !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif !important;
      font-size: 15px !important;
      line-height: 1.4 !important;
      /* 不设置 color，让具体元素自己控制颜色 */
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      /* filter 由 JS 动态设置，用于抵消页面的 invert 效果 */
      isolation: isolate !important;
    }

    /* 内容容器 - 不使用 all: initial 避免重置颜色等属性 */
    #deepseek-popup-root {
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      /* 不设置 color，让子元素通过 CSS 类控制 */
    }

    /* 确保弹窗元素可以接收事件 */
    #deepseek-popup-root > * {
      pointer-events: auto;
    }

    /* 注入的外部样式 */
    ${cssText}
  `;
  shadow.appendChild(style);

  // 创建内容容器
  const container = document.createElement('div');
  container.id = 'deepseek-popup-root';
  shadow.appendChild(container);

  // 保存实例引用
  shadowContainerInstance = { host, shadow, container };

  return shadowContainerInstance;
}

/**
 * 获取当前的 Shadow DOM 容器
 * @returns {{ host: HTMLElement, shadow: ShadowRoot, container: HTMLElement } | null}
 */
export function getShadowContainer() {
  return shadowContainerInstance;
}

/**
 * 销毁 Shadow DOM 容器
 */
export function destroyShadowContainer() {
  if (shadowContainerInstance) {
    const { host } = shadowContainerInstance;
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    shadowContainerInstance = null;
  }
}

/**
 * 确保 Shadow DOM 容器存在并挂载到 document.body
 * @param {string} cssText - CSS 样式文本
 * @returns {{ host: HTMLElement, shadow: ShadowRoot, container: HTMLElement }}
 */
export function ensureShadowContainer(cssText) {
  let container = getShadowContainer();

  // 检查容器是否存在且仍在 DOM 中
  if (container && container.host && document.body.contains(container.host)) {
    return container;
  }

  // 创建新容器
  container = createShadowContainer(cssText);
  document.body.appendChild(container.host);

  return container;
}

/**
 * 在 Shadow DOM 中查询元素（用于替代 document.querySelector）
 * @param {string} selector - CSS 选择器
 * @returns {Element | null}
 */
export function shadowQuerySelector(selector) {
  const container = getShadowContainer();
  if (container && container.shadow) {
    return container.shadow.querySelector(selector);
  }
  return null;
}

/**
 * 在 Shadow DOM 中查询所有元素（用于替代 document.querySelectorAll）
 * @param {string} selector - CSS 选择器
 * @returns {NodeList}
 */
export function shadowQuerySelectorAll(selector) {
  const container = getShadowContainer();
  if (container && container.shadow) {
    return container.shadow.querySelectorAll(selector);
  }
  return document.createDocumentFragment().querySelectorAll('*'); // 返回空 NodeList
}

/**
 * 获取 ai-popup 元素（支持 Shadow DOM）
 * @returns {Element | null}
 */
export function getPopupElement() {
  const container = getShadowContainer();
  if (container && container.shadow) {
    return container.shadow.querySelector('#ai-popup');
  }
  return document.getElementById('ai-popup');
}

/**
 * 获取 ai-response 元素（支持 Shadow DOM）
 * @returns {Element | null}
 */
export function getAiResponseElement() {
  const container = getShadowContainer();
  if (container && container.shadow) {
    return container.shadow.querySelector('#ai-response');
  }
  return document.getElementById('ai-response');
}

/**
 * 获取 ai-response-container 元素（支持 Shadow DOM）
 * @returns {Element | null}
 */
export function getAiResponseContainer() {
  // 优先使用 window.aiResponseContainer
  if (window.aiResponseContainer) {
    return window.aiResponseContainer;
  }
  const container = getShadowContainer();
  if (container && container.shadow) {
    return container.shadow.querySelector('#ai-response-container');
  }
  return document.getElementById('ai-response-container');
}
