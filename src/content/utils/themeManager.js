import { THEME_CLASSES } from "./constants";

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
  if (userPreference !== "auto") {
    return userPreference === "dark";
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
/**
 * 分析页面颜色判断主题 (基于第一性原理：视觉上的深色才是真正的深色模式)
 * 采用"实事求是"的方法，通过采样视口中心元素的背景色来判断
 * 如果背景色透明（如背景图），则参考文字颜色
 */
function analyzePageColors() {
  // 1. 采样视口中心的元素 (抓住主要矛盾)
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;
  let element = document.elementFromPoint(x, y);

  if (!element) {
    element = document.body;
  }

  // 2. 向上遍历寻找有效的背景色和文字颜色
  let effectiveBg = null;
  let effectiveText = null;
  let currentEl = element;

  // 限制遍历深度，避免性能问题
  let depth = 0;
  const MAX_DEPTH = 10;

  while (currentEl && depth < MAX_DEPTH) {
    const styles = window.getComputedStyle(currentEl);

    // 检查背景色
    if (!effectiveBg) {
      const bgColor = parseColor(styles.backgroundColor);
      if (bgColor && !bgColor.isTransparent) {
        effectiveBg = bgColor;
      }
    }

    // 检查文字颜色 (作为重要参考)
    if (!effectiveText) {
      const textColor = parseColor(styles.color);
      if (textColor && !textColor.isTransparent) {
        effectiveText = textColor;
      }
    }

    // 如果找到了背景色，通常就可以停止了，因为背景是覆盖的
    if (effectiveBg) break;

    if (currentEl === document.documentElement) break;
    currentEl = currentEl.parentElement;
    depth++;
  }

  // 3. 决策逻辑

  // 优先依据：背景色
  if (effectiveBg) {
    // 亮度 < 0.5 为暗色
    // 考虑到深灰色背景，0.6 是一个比较安全的阈值
    return effectiveBg.brightness < 0.6;
  }

  // 次要依据：文字颜色 (当背景是图片或渐变导致背景色为透明时)
  if (effectiveText) {
    // 文字是浅色 (亮度 > 0.6) -> 推断背景是深色 -> 暗色模式
    if (effectiveText.brightness > 0.6) return true;
    // 文字是深色 (亮度 < 0.4) -> 推断背景是浅色 -> 亮色模式
    if (effectiveText.brightness < 0.4) return false;
  }

  // 兜底：系统偏好
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function parseColor(colorStr) {
  if (!colorStr) return null;

  // 修复：使用 [\d.]+ 匹配小数 (例如 rgba(0, 0, 0, 0.5))
  const match = colorStr.match(/[\d.]+/g);
  if (!match || match.length < 3) return null;

  const r = parseFloat(match[0]);
  const g = parseFloat(match[1]);
  const b = parseFloat(match[2]);
  const a = match.length >= 4 ? parseFloat(match[3]) : 1;

  // 认为是透明的标准：alpha < 0.05
  const isTransparent = a < 0.05;

  // 相对亮度公式
  const brightness = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return {
    r,
    g,
    b,
    a,
    isTransparent,
    brightness,
  };
}

/**
 * 检测特定网站的主题实现
 * @returns {boolean|null} - true表示暗色，false表示亮色，null表示无法判断
 */
/**
 * 检测特定网站的主题实现
 * @returns {boolean|null} - true表示暗色，false表示亮色，null表示无法判断
 */
function detectSpecificSiteTheme() {
  // 0. 标准化元数据和CSS属性检查 (最优先)

  // 0.1 CSS color-scheme 属性 (现代浏览器标准)
  // https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
  const htmlStyle = window.getComputedStyle(document.documentElement);
  if (htmlStyle.colorScheme === "dark") return true;
  // 注意：color-scheme: 'light dark' 表示支持两者，不能单纯据此判断当前是哪一个，
  // 但如果明确只有 'dark'，那肯定是暗色。

  // 0.2 meta name="color-scheme"
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) {
    const content = colorSchemeMeta.getAttribute("content").toLowerCase();
    // 如果只包含 dark，或者是 dark light 且系统是 dark
    if (content === "dark") return true;
  }

  // 0.3 meta name="theme-color"
  // 注意：theme-color 只是浏览器地址栏/系统UI颜色提示，不能作为页面主题的决定性依据
  // 很多网站设置 theme-color 为白色是为了配合品牌色，但页面本身可能是暗色的
  // 因此仅当 theme-color 明确是深色时才判定为暗色模式，亮色则继续检测
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    const content = themeColorMeta.getAttribute("content");
    if (content) {
      const color = parseColor(content);
      if (color && !color.isTransparent && color.brightness < 0.4) {
        // 只有明确深色 (brightness < 0.4) 才返回暗色模式
        return true;
      }
      // 亮色 theme-color 不作为决定性依据，继续后续检测
    }
  }

  // 1. 知名框架和库的特定标记

  // Bootstrap 5.3+
  if (
    document.documentElement.getAttribute("data-bs-theme") === "dark" ||
    document.body.getAttribute("data-bs-theme") === "dark"
  ) {
    return true;
  }

  // Vuetify
  if (
    document.documentElement.classList.contains("v-theme--dark") ||
    document.body.classList.contains("v-theme--dark")
  ) {
    return true;
  }

  // Atlassian (Jira, Confluence)
  if (document.documentElement.getAttribute("data-color-mode") === "dark") {
    return true;
  }

  const host = window.location.hostname;

  // GitHub
  if (host.includes("github.com")) {
    const theme = document.documentElement.getAttribute("data-color-mode");
    if (theme) {
      return (
        theme === "dark" ||
        (theme === "auto" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
  }

  // Google系产品
  if (host.includes("google.com") || host.includes("youtube.com")) {
    if (
      document.documentElement.hasAttribute("dark") ||
      document.documentElement.hasAttribute("darktheme")
    ) {
      return true;
    }
  }

  // Twitter/X
  if (host.includes("twitter.com") || host.includes("x.com")) {
    return (
      document.documentElement.classList.contains("dark") ||
      document.querySelector('html[data-theme="dark"]') !== null
    );
  }

  // 检查常见数据属性
  const dataTheme =
    document.documentElement.getAttribute("data-theme") ||
    document.body.getAttribute("data-theme") ||
    document.documentElement.getAttribute("data-color-mode") ||
    document.body.getAttribute("data-color-mode") ||
    document.documentElement.getAttribute("data-mode") ||
    document.body.getAttribute("data-mode");

  if (dataTheme) {
    return dataTheme.includes("dark");
  }

  // 检查常见类名
  if (
    document.documentElement.classList.contains("dark") ||
    document.documentElement.classList.contains("darkTheme") ||
    document.documentElement.classList.contains("dark-theme") ||
    document.body.classList.contains("dark") ||
    document.body.classList.contains("darkTheme") ||
    document.body.classList.contains("dark-theme")
  ) {
    return true;
  }

  if (
    document.documentElement.classList.contains("light") ||
    document.documentElement.classList.contains("lightTheme") ||
    document.documentElement.classList.contains("light-theme") ||
    document.body.classList.contains("light") ||
    document.body.classList.contains("lightTheme") ||
    document.body.classList.contains("light-theme")
  ) {
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

    // 检查常见的背景色CSS变量
    const bgVarNames = [
      "--background-color",
      "--bg-color",
      "--theme-background",
      "--color-background",
      "--color-bg",
      "--surface",
      "--bg-primary",
      "--color-canvas-default", // GitHub
    ];

    for (const name of bgVarNames) {
      const value = styles.getPropertyValue(name).trim();
      if (value) {
        const bgColor = parseSimpleColor(value);
        if (bgColor) return bgColor.isDark;
      }
    }

    // 检查常见的文字颜色CSS变量
    const textVarNames = [
      "--text-color",
      "--color-text",
      "--theme-text",
      "--color-fg",
      "--color-foreground",
      "--foreground",
      "--text-primary",
      "--color-fg-default", // GitHub
    ];

    for (const name of textVarNames) {
      const value = styles.getPropertyValue(name).trim();
      if (value) {
        const textColor = parseSimpleColor(value);
        if (textColor) return !textColor.isDark; // 文字深色表示浅色主题
      }
    }
  } catch (e) {
    console.debug("CSS变量分析出错", e);
  }

  return null;
}

/**
 * 简单解析颜色值
 */
function parseSimpleColor(color) {
  // 处理十六进制颜色
  if (color.startsWith("#")) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
      return {
        isDark: brightness < 0.5,
      };
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
      return {
        isDark: brightness < 0.5,
      };
    }
  }

  // 处理rgb/rgba颜色
  const rgbMatch = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/,
  );
  if (rgbMatch) {
    const [_, r, g, b] = rgbMatch.map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000 / 255;
    return {
      isDark: brightness < 0.5,
    };
  }

  return null;
}

/**
 * 获取用户主题偏好
 * @returns {'dark'|'light'|'auto'} 用户偏好
 */
function getUserThemePreference() {
  return localStorage.getItem("deepseek-theme-preference") || "auto";
}

/**
 * 设置用户主题偏好
 * @param {'dark'|'light'|'auto'} preference 用户偏好
 */
export function setUserThemePreference(preference) {
  if (["dark", "light", "auto"].includes(preference)) {
    localStorage.setItem("deepseek-theme-preference", preference);
    // 触发重新应用主题
    const isDark = preference === "auto" ? isDarkMode() : preference === "dark";
    document.dispatchEvent(
      new CustomEvent("deepseek-theme-change", { detail: { isDark } }),
    );
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
    const shouldCheck = mutations.some((mutation) => {
      // 类和主题相关属性的变化
      if (mutation.type === "attributes") {
        const attr = mutation.attributeName;
        return (
          attr === "class" ||
          attr === "style" ||
          attr === "data-theme" ||
          attr === "data-color-mode" ||
          attr === "data-color-scheme" ||
          attr.includes("theme") ||
          attr.includes("mode") ||
          attr.includes("dark") ||
          attr.includes("light")
        );
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
    attributeFilter: [
      "style",
      "class",
      "data-theme",
      "data-color-mode",
      "data-color-scheme",
      "darktheme",
      "dark",
    ],
    subtree: false,
  };

  // 只监听HTML和BODY元素
  observer.observe(document.documentElement, observerConfig);
  observer.observe(document.body, observerConfig);

  // 监听系统主题变化
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const mediaQueryHandler = checkThemeChange;
  mediaQuery.addEventListener("change", mediaQueryHandler);

  // 监听自定义主题变化事件
  const customEventHandler = checkThemeChange;
  document.addEventListener("deepseek-theme-change", customEventHandler);

  // 初始化主题
  callback(currentTheme);

  // 返回清理函数
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener("change", mediaQueryHandler);
    document.removeEventListener("deepseek-theme-change", customEventHandler);
  };
}

/**
 * 高效防抖函数
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
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
      element.setAttribute("data-theme", "dark");
    } else {
      element.classList.remove(THEME_CLASSES.DARK);
      element.classList.add(THEME_CLASSES.LIGHT);
      element.setAttribute("data-theme", "light");
    }
  });
}

/**
 * 获取当前主题
 * @returns {'dark'|'light'} 当前主题
 */
export function getCurrentTheme() {
  return isDarkMode() ? "dark" : "light";
}
