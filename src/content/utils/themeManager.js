import { THEME_CLASSES } from './constants';

/**
 * 判断是否为暗色模式
 * 增强版色彩分析，支持网站特异性检测
 */
export function isDarkMode() {
  // 1. 检查特定网站的主题实现
  const specificTheme = detectSpecificSiteTheme();
  if (specificTheme !== null) {
    return specificTheme;
  }

  // 2. 检查用户手动设置的主题偏好
  const userPreference = getUserThemePreference();
  if (userPreference !== 'auto') {
    return userPreference === 'dark';
  }

  // 3. 检查CSS变量定义的主题
  const cssVarTheme = detectCSSVarTheme();
  if (cssVarTheme !== null) {
    return cssVarTheme;
  }

  // 4. 分析页面颜色
  return analyzePageColors();
}

/**
 * 分析页面颜色判断主题
 */
function analyzePageColors() {
  const bodyBg = window.getComputedStyle(document.body).backgroundColor;
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
  const bodyColor = window.getComputedStyle(document.body).color;
  const htmlColor = window.getComputedStyle(document.documentElement).color;

  function parseColor(color) {
    const match = color.match(/\d+/g);
    if (!match) return null;

    const [r, g, b, a = 255] = match.map(Number);
    const isTransparent = a === 0 || (r === 0 && g === 0 && b === 0 && a < 0.1);

    // 改进亮度计算，更符合人眼感知
    // 使用相对亮度公式: https://www.w3.org/TR/WCAG20/#relativeluminancedef
    const relativeLuminance =
      0.2126 * (r / 255) +
      0.7152 * (g / 255) +
      0.0722 * (b / 255);

    return {
      r, g, b, a,
      isTransparent,
      brightness: relativeLuminance
    };
  }

  const bodyBgColor = parseColor(bodyBg);
  const htmlBgColor = parseColor(htmlBg);
  const bodyTextColor = parseColor(bodyColor);
  const htmlTextColor = parseColor(htmlColor);

  // 优先使用背景色判断
  const effectiveBgColor = bodyBgColor?.isTransparent ? htmlBgColor : bodyBgColor;

  // 如果背景色无法判断，使用文字颜色
  const effectiveTextColor = bodyTextColor?.isTransparent ? htmlTextColor : bodyTextColor;

  if (effectiveBgColor && !effectiveBgColor.isTransparent) {
    return effectiveBgColor.brightness < 0.5;  // 相对亮度小于0.5认为是暗色
  }

  // 如果背景色无法判断，通过文字颜色反推
  if (effectiveTextColor && !effectiveTextColor.isTransparent) {
    return effectiveTextColor.brightness > 0.5;  // 文字亮意味着背景暗
  }

  // 如果都无法判断，使用系统主题
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 检测特定网站的主题实现
 * @returns {boolean|null} - true表示暗色，false表示亮色，null表示无法判断
 */
function detectSpecificSiteTheme() {
  const host = window.location.hostname;

  // GitHub
  if (host.includes('github.com')) {
    const theme = document.documentElement.getAttribute('data-color-mode');
    if (theme) {
      return theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }

  // Google系产品
  if (host.includes('google.com') || host.includes('youtube.com')) {
    return document.documentElement.hasAttribute('dark') || document.documentElement.hasAttribute('darktheme');
  }

  // Twitter/X
  if (host.includes('twitter.com') || host.includes('x.com')) {
    return document.documentElement.classList.contains('dark') ||
           document.querySelector('html[data-theme="dark"]') !== null;
  }

  // 检查常见数据属性
  const dataTheme = document.documentElement.getAttribute('data-theme') ||
                    document.body.getAttribute('data-theme') ||
                    document.documentElement.getAttribute('data-color-mode') ||
                    document.body.getAttribute('data-color-mode');

  if (dataTheme) {
    return dataTheme.includes('dark');
  }

  // 检查常见类名
  if (document.documentElement.classList.contains('dark') ||
      document.documentElement.classList.contains('darkTheme') ||
      document.documentElement.classList.contains('dark-theme') ||
      document.body.classList.contains('dark') ||
      document.body.classList.contains('darkTheme') ||
      document.body.classList.contains('dark-theme')) {
    return true;
  }

  if (document.documentElement.classList.contains('light') ||
      document.documentElement.classList.contains('lightTheme') ||
      document.documentElement.classList.contains('light-theme') ||
      document.body.classList.contains('light') ||
      document.body.classList.contains('lightTheme') ||
      document.body.classList.contains('light-theme')) {
    return false;
  }

  return null; // 无法确定
}

/**
 * 检测基于CSS变量的主题
 */
function detectCSSVarTheme() {
  try {
    const styles = getComputedStyle(document.documentElement);

    // 检查常见的CSS变量
    const bgVar = styles.getPropertyValue('--background-color').trim() ||
                  styles.getPropertyValue('--bg-color').trim() ||
                  styles.getPropertyValue('--theme-background').trim();

    const textVar = styles.getPropertyValue('--text-color').trim() ||
                    styles.getPropertyValue('--color-text').trim() ||
                    styles.getPropertyValue('--theme-text').trim();

    if (bgVar) {
      const bgColor = parseSimpleColor(bgVar);
      if (bgColor) {
        return bgColor.isDark;
      }
    }

    if (textVar) {
      const textColor = parseSimpleColor(textVar);
      if (textColor) {
        return !textColor.isDark; // 文字深色表示浅色主题，反之亦然
      }
    }
  } catch (e) {
    console.debug('CSS变量分析出错', e);
  }

  return null;
}

/**
 * 简单解析颜色值
 */
function parseSimpleColor(color) {
  // 处理十六进制颜色
  if (color.startsWith('#')) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
      return {
        isDark: brightness < 0.5
      };
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
      return {
        isDark: brightness < 0.5
      };
    }
  }

  // 处理rgb/rgba颜色
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbMatch) {
    const [_, r, g, b] = rgbMatch.map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
    return {
      isDark: brightness < 0.5
    };
  }

  return null;
}

/**
 * 获取用户主题偏好
 * @returns {'dark'|'light'|'auto'} 用户偏好
 */
function getUserThemePreference() {
  return localStorage.getItem('deepseek-theme-preference') || 'auto';
}

/**
 * 设置用户主题偏好
 * @param {'dark'|'light'|'auto'} preference 用户偏好
 */
export function setUserThemePreference(preference) {
  if (['dark', 'light', 'auto'].includes(preference)) {
    localStorage.setItem('deepseek-theme-preference', preference);
    // 触发重新应用主题
    const isDark = preference === 'auto' ? isDarkMode() : (preference === 'dark');
    document.dispatchEvent(new CustomEvent('deepseek-theme-change', { detail: { isDark }}));
  }
}

/**
 * 监视主题变化
 * 性能优化版本，减少不必要的检测
 */
export function watchThemeChanges(callback) {
  let currentTheme = isDarkMode();

  // 高效防抖
  const debouncedCallback = debounce((isDark) => {
    if (currentTheme !== isDark) {
      currentTheme = isDark;
      callback(isDark);
    }
  }, 50);

  // 主题变化检测函数
  const checkThemeChange = () => {
    requestAnimationFrame(() => {
      const newTheme = isDarkMode();
      debouncedCallback(newTheme);
    });
  };

  // 监听DOM变化，有选择性地过滤
  const observer = new MutationObserver((mutations) => {
    // 过滤掉不太可能影响主题的变化
    const shouldCheck = mutations.some(mutation => {
      // 类和主题相关属性的变化
      if (mutation.type === 'attributes') {
        const attr = mutation.attributeName;
        return attr === 'class' ||
               attr === 'style' ||
               attr === 'data-theme' ||
               attr === 'data-color-mode' ||
               attr === 'data-color-scheme' ||
               attr.includes('theme') ||
               attr.includes('mode') ||
               attr.includes('dark') ||
               attr.includes('light');
      }
      return false;
    });

    if (shouldCheck) {
      checkThemeChange();
    }
  });

  // 观察配置，减少不必要的触发
  const observerConfig = {
    attributes: true,
    attributeFilter: ['style', 'class', 'data-theme', 'data-color-mode', 'data-color-scheme', 'darktheme', 'dark'],
    subtree: false
  };

  // 只监听HTML和BODY元素
  observer.observe(document.documentElement, observerConfig);
  observer.observe(document.body, observerConfig);

  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const mediaQueryHandler = checkThemeChange;
  mediaQuery.addEventListener('change', mediaQueryHandler);

  // 监听自定义主题变化事件
  const customEventHandler = checkThemeChange;
  document.addEventListener('deepseek-theme-change', customEventHandler);

  // 初始化主题
  callback(currentTheme);

  // 返回清理函数
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener('change', mediaQueryHandler);
    document.removeEventListener('deepseek-theme-change', customEventHandler);
  };
}

/**
 * 高效防抖函数
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 应用主题到指定元素
 */
export function applyTheme(element, isDark) {
  if (!element) return;

  requestAnimationFrame(() => {
    if (isDark) {
      element.classList.add(THEME_CLASSES.DARK);
      element.classList.remove(THEME_CLASSES.LIGHT);
      element.setAttribute('data-theme', 'dark');
    } else {
      element.classList.remove(THEME_CLASSES.DARK);
      element.classList.add(THEME_CLASSES.LIGHT);
      element.setAttribute('data-theme', 'light');
    }
  });
}

/**
 * 获取当前主题
 * @returns {'dark'|'light'} 当前主题
 */
export function getCurrentTheme() {
  return isDarkMode() ? 'dark' : 'light';
}