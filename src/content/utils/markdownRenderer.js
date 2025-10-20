import { marked } from "marked";
// Use the common language bundle so tokens are actually highlighted
// This avoids needing to manually register languages and keeps size reasonable
import hljs from "highlight.js/lib/common";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

const isBrowserEnvironment = typeof window !== "undefined" && typeof document !== "undefined";
const MATH_PLACEHOLDER_PREFIX = "__MATH_PLACEHOLDER_";

let activeMathPlaceholders = null;

const escapeHtml = (input) => {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const isEscaped = (source, index) => {
  let escapeCount = 0;
  for (let position = index - 1; position >= 0; position -= 1) {
    if (source[position] === "\\") {
      escapeCount += 1;
    } else {
      break;
    }
  }
  return escapeCount % 2 === 1;
};

const findFirstUnescapedSequence = (source, sequence) => {
  let searchStart = 0;
  while (searchStart < source.length) {
    const index = source.indexOf(sequence, searchStart);
    if (index === -1) return -1;
    if (!isEscaped(source, index)) {
      return index;
    }
    searchStart = index + 1;
  }
  return -1;
};

const findClosingSequence = (source, sequence, startIndex) => {
  let searchStart = startIndex;
  while (searchStart < source.length) {
    const index = source.indexOf(sequence, searchStart);
    if (index === -1) return -1;
    if (!isEscaped(source, index)) {
      return index;
    }
    searchStart = index + 1;
  }
  return -1;
};

const registerMathPlaceholder = (content, displayMode) => {
  if (!activeMathPlaceholders) return content;
  const placeholderIndex = activeMathPlaceholders.push({
    content: content.trim(),
    displayMode
  }) - 1;
  return `${MATH_PLACEHOLDER_PREFIX}${placeholderIndex}__`;
};

const renderMathWithKatex = (expression, displayMode) => {
  if (!expression) return "";
  try {
    const rendered = katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: "warn",
      output: "html",
      trust: false
    });
    if (displayMode) {
      return `<div class="math-block">${rendered}</div>`;
    }
    return `<span class="math-inline">${rendered}</span>`;
  } catch (error) {
    console.warn("KaTeX rendering failed:", error);
    const fallback = escapeHtml(expression);
    return displayMode
      ? `<div class="math-block">${fallback}</div>`
      : `<span class="math-inline">${fallback}</span>`;
  }
};

const restoreMathPlaceholders = (html, placeholders) => {
  if (!placeholders?.length) return html;
  const placeholderRegex = new RegExp(`${MATH_PLACEHOLDER_PREFIX}(\\d+)__`, "g");
  return html.replace(placeholderRegex, (match, indexString) => {
    const index = Number.parseInt(indexString, 10);
    const entry = Number.isNaN(index) ? null : placeholders[index];
    if (!entry) {
      return match;
    }
    return renderMathWithKatex(entry.content, entry.displayMode);
  });
};

marked.setOptions({
  breaks: true,
  gfm: true,
  highlight(code, language) {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch (error) {
      console.warn("highlight.js failed to highlight code block:", error);
      return code;
    }
  }
});

const mathBlockExtension = {
  name: "mathBlock",
  level: "block",
  start(src) {
    const dollarIndex = src.indexOf("$$");
    const bracketIndex = src.indexOf("\\[");
    if (dollarIndex === -1 && bracketIndex === -1) return undefined;
    const indices = [dollarIndex, bracketIndex].filter((index) => index >= 0);
    return indices.length ? Math.min(...indices) : undefined;
  },
  tokenizer(src) {
    const dollarMatch = /^ {0,3}\$\$([\s\S]+?)\$\$(?:\s*\n+|$)/.exec(src);
    if (dollarMatch) {
      return {
        type: "mathBlock",
        raw: dollarMatch[0],
        text: dollarMatch[1],
        displayMode: true
      };
    }

    const bracketMatch = /^ {0,3}\\\[([\s\S]+?)\\\](?:\s*\n+|$)/.exec(src);
    if (bracketMatch) {
      return {
        type: "mathBlock",
        raw: bracketMatch[0],
        text: bracketMatch[1],
        displayMode: true
      };
    }

    return undefined;
  },
  renderer(token) {
    return registerMathPlaceholder(token.text, true);
  }
};

const mathInlineExtension = {
  name: "mathInline",
  level: "inline",
  start(src) {
    const dollarIndex = findFirstUnescapedSequence(src, "$");
    const parenIndex = findFirstUnescapedSequence(src, "\\(");

    if (dollarIndex === -1 && parenIndex === -1) return undefined;
    if (dollarIndex === -1) return parenIndex;
    if (parenIndex === -1) return dollarIndex;
    return Math.min(dollarIndex, parenIndex);
  },
  tokenizer(src) {
    if (src.startsWith("\\(")) {
      const closingIndex = findClosingSequence(src, "\\)", 2);
      if (closingIndex === -1) return undefined;
      const raw = src.slice(0, closingIndex + 2);
      const text = raw.slice(2, -2);
      return {
        type: "mathInline",
        raw,
        text,
        displayMode: false
      };
    }

    if (src[0] !== "$") return undefined;
    if (src.startsWith("$$")) return undefined;

    let position = 1;
    while (position < src.length) {
      if (src[position] === "$" && !isEscaped(src, position)) {
        const raw = src.slice(0, position + 1);
        const text = raw.slice(1, -1);
        if (!text.trim()) return undefined;
        return {
          type: "mathInline",
          raw,
          text,
          displayMode: false
        };
      }
      position += 1;
    }

    return undefined;
  },
  renderer(token) {
    return registerMathPlaceholder(token.text, false);
  }
};

marked.use({ extensions: [mathBlockExtension, mathInlineExtension] });

const sanitizeHtml = (html) => {
  if (!isBrowserEnvironment) return html;

  try {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel", "aria-label"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  } catch (error) {
    console.warn("DOMPurify failed to sanitize HTML:", error);
    return html;
  }
};

export function render(text) {
  if (!text) return "";

  activeMathPlaceholders = [];
  let html = "";

  try {
    // 预处理：宽容修复常见的“类中文 Markdown”输入瑕疵
    // - 将行内出现的 "*   xxx" 规范为换行后的列表项
    // - 将常见标签样式 "**关键：" / "业务**：" 补全为 "**关键：** " / "**业务：** "
    // - 清理无意义的多星号前缀，如 "****："
    const normalizeMarkdown = (input) => {
      if (!input) return "";
      let s = String(input).replace(/\r\n?/g, "\n");

      // 0) 去除不可见/异常空白，避免数学/高亮渲染异常
      //    - ZERO WIDTH: \u200B-\u200D, \uFEFF
      //    - WORD JOINER: \u2060
      //    - NBSP & NNBSP: \u00A0, \u202F
      //    - En/Em/Thin/Hair spaces: \u2000-\u200A
      //    - Line/Paragraph separators: \u2028, \u2029
      s = s.replace(/[\u200B-\u200D\uFEFF\u2060\u00A0\u202F\u2000-\u200A\u2028\u2029]/g, " ");
      // 注意：不要折叠行尾的两个空格（Markdown 的显式换行），也不要折叠前导缩进
      // 因而不进行全局空白折叠，保留作者意图

      // 0.1) 在规范化前暂时屏蔽数学片段，避免对数学内容误改
      const MATH_TOKEN = "__MDNORM_MATH_";
      const mathChunks = [];
      const maskMath = (src) => {
        let out = "";
        let i = 0;
        while (i < src.length) {
          // $$...$$
          if (src.startsWith("$$", i)) {
            const end = findClosingSequence(src, "$$", i + 2);
            if (end !== -1) {
              const raw = src.slice(i, end + 2);
              const token = `${MATH_TOKEN}${mathChunks.length}__`;
              mathChunks.push(raw);
              out += token;
              i = end + 2;
              continue;
            }
          }
          // \\[...\\]
          if (src.startsWith("\\[", i)) {
            const end = findClosingSequence(src, "\\]", i + 2);
            if (end !== -1) {
              const raw = src.slice(i, end + 2);
              const token = `${MATH_TOKEN}${mathChunks.length}__`;
              mathChunks.push(raw);
              out += token;
              i = end + 2;
              continue;
            }
          }
          // \\(...\\)
          if (src.startsWith("\\(", i)) {
            const end = findClosingSequence(src, "\\)", i + 2);
            if (end !== -1) {
              const raw = src.slice(i, end + 2);
              const token = `${MATH_TOKEN}${mathChunks.length}__`;
              mathChunks.push(raw);
              out += token;
              i = end + 2;
              continue;
            }
          }
          // $...$ (但排除 $$)
          if (src[i] === '$' && src[i + 1] !== '$' && !isEscaped(src, i)) {
            const end = findClosingSequence(src, '$', i + 1);
            if (end !== -1) {
              const raw = src.slice(i, end + 1);
              const token = `${MATH_TOKEN}${mathChunks.length}__`;
              mathChunks.push(raw);
              out += token;
              i = end + 1;
              continue;
            }
          }
          out += src[i];
          i += 1;
        }
        return out;
      };
      const unmaskMath = (src) => src.replace(new RegExp(`${MATH_TOKEN}(\\d+)__`, 'g'), (_, n) => mathChunks[Number(n)] ?? _);
      s = maskMath(s);

      // 1) 补全加粗标签（仅中文关键字，避免数字等被误命中）："**关键：" => "**关键：** "
      //    仅当其后未紧跟 ** 时进行闭合，避免重复闭合导致 "****"
      s = s.replace(/(\*\*)([\u4e00-\u9fa5]{1,10})([：:])(?!\*\*)/g, "**$2$3** ");

      // 2) 补全加粗标签（右侧起始）："业务**：" => "**业务：** "，同样避免已存在的闭合
      s = s.replace(/([\u4e00-\u9fa5]{1,10})\*\*([：:])(?!\*\*)/g, "**$1$2** ");

      // 3) 去除无效的多星号标签："****：" => "："
      s = s.replace(/\*{3,}\s*([：:])/g, "$1");

      // 3.1) 清理与中文标点挨着的星号（如 "，*"、"*，"、"，*，"）
      s = s.replace(/([，。；：、])\*+(?=[，。；：、])/g, "$1");
      s = s.replace(/([，。；：、])\*+/g, "$1");
      s = s.replace(/\*+([，。；：、])/g, "$1");

      // 3.2) 行首多个星号包裹的标题形式："****总结：" => "**总结：** "
      s = s.replace(/(^|\n)\s*\*{3,}\s*([\u4e00-\u9fa5A-Za-z0-9]{1,24})([：:])(?!\*\*)/g, "$1**$2$3** ");

      // 3.3) 纠正以单星号开头的标签行："*思考："/"* 符号说明：" => "**思考：** " 等
      const labelWords = "思考|符号说明|意义|应用|复杂性|背景";
      s = s.replace(new RegExp(`(^|\\n)\\s*\\*\\s*(${labelWords})([：:])(?!\\*\\*)`, 'g'), "$1**$2$3** ");

      // 3.4) 纠正行内紧贴或带空格的 "*思考："："…0*思考：" 或 "…0 * 思考：" => 换行并加粗
      s = s.replace(new RegExp(`(\\S)\\s*\\*\\s*(${labelWords})([：:])`, 'g'), "$1\n**$2$3** ");

      // 4) 将行内的列表标记规范到新行："… *   项" => "…\n* 项"
      s = s.replace(/([^\n])\s\*\s{2,}(?=\S)/g, "$1\n* ");

      // 5) 多个列表项黏在一行时，拆到多行："* a * b" => "* a\n* b"
      s = s.replace(/(?!^)\s\*\s+(?=\S)/gm, "\n* ");

      // 6) 去掉行尾悬空星号（无成对强调）："...**\n" 或 "...*\n" => "...\n"
      s = s.replace(/(^|\n)([^\n*]*?)\*\*\s*$/gm, "$1$2");
      s = s.replace(/(^|\n)([^\n*]*?)\*\s*$/gm, "$1$2");

      // 7) 将疑似“纯Unicode数学行”包裹为块级公式以获得更好的版式
      //    仅针对未使用 LaTeX 定界符的行，例如：∫Ω dω = ∫∂Ω ω、Rμν − 1/2 R gμν + …
      const wrapPlainMathLines = (src) => {
        const lines = src.split("\n");
        const mathHeavy = /[∫∑∏√∞≈≠≤≥±∇∂⋅·×÷→←↦≡⊂⊃∈∉πμνρσΓΖΛΘΨΦΩωαβγδεζηθικλμνξοπρστυφχψω⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/;
        const fenceOrHtml = /^(\s*```|\s*<[^>]+>)/;
        const listOrQuote = /^(\s*[\-*+]\s+|\s*\d+\.|\s*>\s*)/;
        let inDisplayBracket = false; // \[ ... \]
        let inDisplayDollar = false;  // $$ ... $$

        const startsBracket = /^\s*\\\[\s*$/;
        const endsBracket = /^\s*\\\]\s*$/;
        const lineHasDollars = /(^|[^$])\$\$([^$]|$)/; // 一行出现 $$ 即切换

        return lines.map((line) => {
          const trimmed = line.trim();

          if (fenceOrHtml.test(trimmed)) return line; // 代码/HTML

          // 处理 LaTeX 块环境 \[ ... \]
          if (startsBracket.test(trimmed)) {
            inDisplayBracket = true;
            return line;
          }
          if (inDisplayBracket) {
            if (endsBracket.test(trimmed)) inDisplayBracket = false;
            return line; // 块内不处理
          }

          // 处理 $$ ... $$
          if (lineHasDollars.test(line)) {
            inDisplayDollar = !inDisplayDollar;
            return line;
          }
          if (inDisplayDollar) return line; // 块内不处理

          // 跳过 inline LaTeX （$ ... $ / \( ... \)）的行
          if (/\$[^$].*\$/.test(line) || /\\\(.*\\\)/.test(line)) return line;

          // 只在明显“数学密集”且非列表前缀的独立行上包裹
          if (trimmed && !listOrQuote.test(trimmed) && mathHeavy.test(trimmed)) {
            return `<div class=\"math-block plain-math\">${escapeHtml(trimmed)}</div>`;
          }
          return line;
        }).join("\n");
      };

      // 恢复数学片段并处理纯Unicode数学行
       s = unmaskMath(s);
       s = wrapPlainMathLines(s);
       return s;
    };

    const normalized = normalizeMarkdown(text);
    html = marked.parse(normalized, { async: false });
  } catch (error) {
    console.warn("Markdown render failed:", error);
    activeMathPlaceholders = null;
    return sanitizeHtml(text);
  }

  const placeholders = activeMathPlaceholders;
  activeMathPlaceholders = null;

  const sanitized = sanitizeHtml(html);
  return restoreMathPlaceholders(sanitized, placeholders);
}

const ensureCodeBlockWrapper = (preElement) => {
  if (!isBrowserEnvironment || !preElement?.parentElement) return null;

  if (preElement.parentElement.classList.contains("code-block-wrapper")) {
    return preElement.parentElement;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "code-block-wrapper";
  preElement.parentElement.insertBefore(wrapper, preElement);
  wrapper.appendChild(preElement);

  return wrapper;
};

const getCopyIconUrl = () => {
  if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
    try {
      return chrome.runtime.getURL("icons/copy.svg");
    } catch (error) {
      console.warn("Failed to load copy icon via chrome.runtime.getURL:", error);
    }
  }
  return "";
};

const bindCopyButton = (button, codeElement) => {
  if (!button || button.dataset.bound === "true") return;

  const label = button.querySelector(".copy-label");
  const success = button.querySelector(".copy-success");

  button.dataset.bound = "true";

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const codeText = codeElement?.innerText ?? codeElement?.textContent ?? "";
    if (!codeText) return;

    const resetState = (text = "Copy") => {
      button.classList.remove("copied");
      if (label) label.textContent = text;
      if (success) success.style.visibility = "hidden";
    };

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = codeText;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      button.classList.add("copied");
      if (label) label.textContent = "Copied";
      if (success) success.style.visibility = "visible";

      setTimeout(() => resetState(), 2000);
    } catch (error) {
      console.warn("Copy to clipboard failed:", error);
      resetState("Copy failed");
      setTimeout(() => resetState(), 2000);
    }
  });
};

export function showCodeCopyButtons(root = null) {
  if (!isBrowserEnvironment) return;

  const rootElement = root ?? document;
  if (!rootElement) return;

  const codeBlocks = rootElement.querySelectorAll("pre code");
  const iconUrl = getCopyIconUrl();

  codeBlocks.forEach((codeElement) => {
    const pre = codeElement.parentElement;
    if (!pre) return;

    // Ensure highlight.js root class for theming (light/dark)
    // Our CSS expects `.theme-adaptive pre.hljs` and `.theme-adaptive .hljs ...`
    // Adding the class to <pre> provides a stable ancestor for token rules.
    if (!pre.classList.contains("hljs")) pre.classList.add("hljs");
    // Also add to <code> to maximize compatibility with token scoping.
    if (!codeElement.classList.contains("hljs")) codeElement.classList.add("hljs");

    // Highlight in-place if not already tokenized
    try {
      const alreadyTokenized = codeElement.querySelector('[class^="hljs-"]');
      if (!alreadyTokenized && codeElement.textContent) {
        // Prefer declared language; fallback to auto-detect
        const langMatch = Array.from(codeElement.classList).find(c => c.startsWith('language-'));
        if (langMatch) {
          const lang = langMatch.replace('language-', '');
          if (hljs.getLanguage(lang)) {
            const { value } = hljs.highlight(codeElement.textContent, { language: lang, ignoreIllegals: true });
            codeElement.innerHTML = value;
          } else {
            const { value } = hljs.highlightAuto(codeElement.textContent);
            codeElement.innerHTML = value;
          }
        } else {
          const { value } = hljs.highlightAuto(codeElement.textContent);
          codeElement.innerHTML = value;
        }
      }
    } catch (err) {
      console.warn('hljs highlight failed:', err);
    }

    const wrapper = ensureCodeBlockWrapper(pre);
    if (!wrapper) return;

    let button = wrapper.querySelector(".copy-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.setAttribute("aria-label", "Copy code block");

      if (iconUrl) {
        const iconImage = document.createElement("img");
        iconImage.src = iconUrl;
        iconImage.alt = "Copy code";
        button.appendChild(iconImage);
      }

      const label = document.createElement("span");
      label.className = "copy-label";
      label.textContent = "Copy";
      button.appendChild(label);

      const success = document.createElement("span");
      success.className = "copy-success";
      success.textContent = "✓";
      success.style.visibility = "hidden";
      button.appendChild(success);

      wrapper.appendChild(button);
    }

    bindCopyButton(button, codeElement);
  });
}

export function initCopyButtonsVisibility(container) {
  if (!isBrowserEnvironment || !container) return null;
  if (container.dataset.copyButtonsInitialized === "true") return null;

  container.dataset.copyButtonsInitialized = "true";

  let scheduled = false;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      showCodeCopyButtons(container);
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
      scheduleUpdate();
    }
  });

  observer.observe(container, { childList: true, subtree: true });

  const handleInteraction = () => scheduleUpdate();
  container.addEventListener("mouseenter", handleInteraction, { passive: true });
  container.addEventListener("focusin", handleInteraction, { passive: true });
  container.addEventListener("scroll", scheduleUpdate, { passive: true });

  scheduleUpdate();

  const cleanup = () => {
    observer.disconnect();
    container.removeEventListener("mouseenter", handleInteraction);
    container.removeEventListener("focusin", handleInteraction);
    container.removeEventListener("scroll", scheduleUpdate);
    delete container.dataset.copyButtonsInitialized;
  };

  return { observer, cleanup };
}

export function isMathBalanced(text) {
  if (!text) return true;

  const tokenRegex = /\\\[|\\\]|\\\(|\\\)|\$\$|\$/g;
  let inlineDollarOpen = false;
  let blockDollarOpen = false;
  let parenDepth = 0;
  let bracketDepth = 0;

  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    const prevChar = match.index > 0 ? text[match.index - 1] : "";

    if (prevChar === "\\") {
      continue;
    }

    switch (token) {
      case "$$":
        blockDollarOpen = !blockDollarOpen;
        break;
      case "$":
        inlineDollarOpen = !inlineDollarOpen;
        break;
      case "\\(":
        parenDepth += 1;
        break;
      case "\\)":
        parenDepth -= 1;
        if (parenDepth < 0) return false;
        break;
      case "\\[":
        bracketDepth += 1;
        break;
      case "\\]":
        bracketDepth -= 1;
        if (bracketDepth < 0) return false;
        break;
      default:
        break;
    }
  }

  return !inlineDollarOpen && !blockDollarOpen && parenDepth === 0 && bracketDepth === 0;
}

export const md = { render };
