import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";
import DOMPurify from "dompurify";


import katex from "katex";
import "katex/dist/katex.min.css";
import "katex/contrib/mhchem"; // Enable chemical equation rendering
import { ICONS } from "../components/Icons";

const isBrowserEnvironment = typeof window !== "undefined" && typeof document !== "undefined";

// Minimal markdown-it: default rules only (no plugins, no custom rules)
const mdIt = new MarkdownIt({ html: true, linkify: true, breaks: true });
mdIt.disable('code'); // Disable indented code blocks to prevent indented math from being treated as code

const sanitizeHtml = (html) => {
  if (!isBrowserEnvironment) return html;
  try {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel", "aria-label", "style", "open", "class"],
      ADD_TAGS: ["details", "summary", "kbd", "dl", "dt", "dd"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  } catch (error) {
    console.warn("DOMPurify failed to sanitize HTML:", error);
    return html;
  }
};

// Regex to match code blocks (fence or inline) OR math blocks
// Group 1: Code (```...``` or `...`)
// Group 2: Math ($$...$$ or \[...\] or \(...\) or \begin{...}...\end{...} or $...$)
const PROTECT_REGEX = /((?:^|\n)```[\s\S]*?```|`[^`\n]*`)|(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\s*\{([a-zA-Z]+\*?)\}[\s\S]*?\\end\s*\{\3\}|(?<!\\)\$[^$]+(?<!\\)\$)/g;

function ensureListSpacing(text) {
  const listMarkerRegex = /^[ \t]*([-*+]|\d+[.)]) +/;
  const lines = text.split('\n');
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isListItem = listMarkerRegex.test(line);

    if (i > 0) {
      const prevLine = lines[i - 1];
      const prevIsListItem = listMarkerRegex.test(prevLine);
      const prevIsBlank = /^\s*$/.test(prevLine);

      // If current is list item, and previous was NOT list item and NOT blank
      // Insert a blank line to ensure proper Markdown list rendering
      if (isListItem && !prevIsListItem && !prevIsBlank) {
        newLines.push('');
      }
    }
    newLines.push(line);
  }

  return newLines.join('\n');
}

function preprocessMarkdown(text) {
  let lastIndex = 0;
  let result = "";
  let match;

  // Reset regex state
  PROTECT_REGEX.lastIndex = 0;

  while ((match = PROTECT_REGEX.exec(text)) !== null) {
    // Process text before the match (normal text)
    const before = text.slice(lastIndex, match.index);
    result += ensureListSpacing(before);

    // Append the match (Code or Math) as is
    result += match[0];

    lastIndex = PROTECT_REGEX.lastIndex;
  }

  // Process remaining text
  result += ensureListSpacing(text.slice(lastIndex));

  return result;
}

function protectMath(text) {
  const map = new Map();
  let index = 0;

  const protectedText = text.replace(PROTECT_REGEX, (match, code, math) => {
    if (code) return code; // It's code, return as is
    if (math) {
      const key = `@@MATH_PLACEHOLDER_${index++}@@`;
      // Determine display mode
      const isDisplay = math.startsWith('$$') || math.startsWith('\\[') || math.startsWith('\\begin');
      // Strip delimiters for KaTeX
      let content = math;
      if (math.startsWith('$$')) content = math.slice(2, -2);
      else if (math.startsWith('\\[')) content = math.slice(2, -2);
      else if (math.startsWith('\\(')) content = math.slice(2, -2);
      else if (math.startsWith('$')) content = math.slice(1, -1);

      // Fix double-escaped backslashes often returned by LLMs (e.g. \\ce -> \ce, \\frac -> \frac)
      // We only touch backslashes followed by a letter, to avoid breaking \\ (newline) followed by space/end
      content = content.replace(/\\\\([a-zA-Z])/g, "\\$1");

      map.set(key, { content, isDisplay });
      return key;
    }
    return match;
  });

  return { protectedText, map };
}

function processMarkdownFeatures(text) {
  // 1. Highlight: ==text== -> <mark>text</mark>
  text = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');

  // 2. Subscript: ~text~ -> <sub>text</sub>
  text = text.replace(/~([^~]+)~/g, '<sub>$1</sub>');

  // 3. Superscript: ^text^ -> <sup>text</sup>
  text = text.replace(/\^([^\^]+)\^/g, '<sup>$1</sup>');

  // 4. Footnotes: [^1] -> <sup>[1]</sup> (simplified visual only)
  text = text.replace(/\[\^(\d+)\]/g, '<sup>[$1]</sup>');

  // 5. Task Lists: - [ ] or - [x]
  // Note: This is a simple visual replacement.
  text = text.replace(/^([\s]*)[-*+]\s+\[ \]\s+(.*)/gm, '$1<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled> $2</li></ul>');
  text = text.replace(/^([\s]*)[-*+]\s+\[x\]\s+(.*)/gim, '$1<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" checked disabled> $2</li></ul>');

  // Fix nested lists created by the regex above (naive approach)
  text = text.replace(/<\/ul>\n<ul class="contains-task-list">/g, '');

  return text;
}

function restoreMath(html, map) {
  return html.replace(/@@MATH_PLACEHOLDER_\d+@@/g, (match) => {
    const entry = map.get(match);
    if (!entry) return match;
    try {
      if (isChemfigMath(entry.content)) {
        const escaped = escapeHtml(entry.content);
        const tag = entry.isDisplay ? 'div' : 'span';
        const cls = entry.isDisplay ? 'plain-math chem-fallback chem-display' : 'plain-math chem-fallback';
        return `<${tag} class="${cls}">${escaped}</${tag}>`;
      }
      const rendered = katex.renderToString(entry.content, {
        displayMode: entry.isDisplay,
        throwOnError: false
      });
      // 用容器包裹，防止根号等元素溢出气泡
      const wrapperClass = entry.isDisplay ? 'math-block' : 'math-inline';
      return `<span class="${wrapperClass}">${rendered}</span>`;
    } catch (err) {
      console.warn("KaTeX render error:", err);
      return match;
    }
  });
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isChemfigMath(str = "") {
  return /\\chemfig|\\chemabove|\\chembelow|\\chemrel|\\lewis|\\chemup|\\chemdown/i.test(str);
}

// 在渲染阶段直接处理代码块：包裹 wrapper + 高亮，避免后续 DOM 操作导致抖动
function processCodeBlocks(html) {
  return html.replace(/<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g, (match, lang, code) => {
    const decoded = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    let highlighted = decoded;
    try {
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(decoded, { language: lang, ignoreIllegals: true }).value;
      } else {
        highlighted = hljs.highlightAuto(decoded).value;
      }
    } catch (e) { /* fallback to raw */ }
    
    const langClass = lang ? ` language-${lang}` : '';
    return `<div class="code-block-wrapper"><pre class="hljs"><code class="hljs${langClass}">${highlighted}</code></pre></div>`;
  });
}

export function render(text) {
  if (!text) return "";
  try {
    // 0. Preprocess to ensure list spacing (fix for missing newlines)
    const spacedText = preprocessMarkdown(String(text));

    // 1. Protect Math (First Principle: Protect fragile content first)
    const { protectedText, map } = protectMath(spacedText);

    // 2. Process custom Markdown features (on text with math hidden)
    const processedText = processMarkdownFeatures(protectedText);

    // 3. Render Markdown
    const html = mdIt.render(processedText);

    // 3.5 Process Admonitions (GitHub Alerts)
    let processedHtml = processAdmonitions(html);

    // 3.6 Wrap Tables
    processedHtml = processTables(processedHtml);

    // 3.7 Process Code Blocks - 渲染阶段直接包裹和高亮，避免流式渲染抖动
    processedHtml = processCodeBlocks(processedHtml);

    // 4. Sanitize
    const sanitized = sanitizeHtml(processedHtml);

    // 5. Restore Math
    return restoreMath(sanitized, map);
  } catch (error) {
    console.warn("Markdown render failed:", error);
    return sanitizeHtml(String(text));
  }
}

function processAdmonitions(html) {
  // Regex to match blockquotes starting with [!TYPE]
  // Matches: <blockquote><p>[!NOTE] or <blockquote>\n<p>[!NOTE]
  return html.replace(/<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, (match, type) => {
    const lowerType = type.toLowerCase();
    const title = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    return `<blockquote class="markdown-alert markdown-alert-${lowerType}"><p class="markdown-alert-title">${title}</p>`;
  });
}

function processTables(html) {
  // Wrap tables in a scrolling container
  return html.replace(/<table/g, '<div class="table-wrapper"><table').replace(/<\/table>/g, '</table></div>');
}

// ——— Code block copy button bindCopyButton ———
const bindCopyButton = (button, codeElement) => {
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const codeText = codeElement?.innerText ?? codeElement?.textContent ?? "";
    if (!codeText) return;

    const resetState = () => {
      button.classList.remove("copied");
      button.innerHTML = ICONS.copy;
      button.setAttribute("aria-label", "Copy code");
      button.title = "Copy";
      button.style.color = "";
      button.style.transform = "";
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

      // Apple 风格：勾选图标 + 系统绿 + 弹性动画
      button.classList.add("copied");
      button.innerHTML = ICONS.check;
      button.setAttribute("aria-label", "Copied");
      button.title = "Copied!";
      button.style.color = "var(--success-color, #34c759)";
      button.style.transform = "scale(1.15)";
      button.style.transition = "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.15s ease";

      setTimeout(() => { button.style.transform = "scale(1)"; }, 120);
      setTimeout(() => resetState(), 1500);
    } catch (error) {
      console.warn("Copy to clipboard failed:", error);
      resetState();
    }
  });
};

export function showCodeCopyButtons(root = null) {
  if (!isBrowserEnvironment) return;
  const rootElement = root ?? document;
  if (!rootElement) return;

  // 查找已经包裹好的代码块（由 render 阶段的 processCodeBlocks 生成）
  const wrappers = rootElement.querySelectorAll(".code-block-wrapper");

  wrappers.forEach((wrapper) => {
    const codeElement = wrapper.querySelector("code");
    if (!codeElement) return;

    // 只添加复制按钮，不再做包裹和高亮（已在 render 阶段完成）
    let button = wrapper.querySelector(".copy-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "copy-button";
      button.setAttribute("aria-label", "Copy code");
      button.title = "Copy";
      button.innerHTML = ICONS.copy;
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

// Math rules removed; always render immediately during streaming
// Normalize bracket-only math blocks like:
// [\n ... LaTeX ... \n]
// to standard KaTeX display math: $$ ... $$, outside of code fences.
function normalizeMathDelimiters(input) {
  if (!input) return input;
  // 1) Convert likely-math parentheses to \( ... \) outside of code fences/backticks
  input = convertParenInlineMath(input);

  // 2) Convert bracket-only blocks to $$ ... $$
  const lines = input.split(/\r?\n/);
  const out = [];
  let i = 0;
  let inCode = false;

  const isFence = (l) => /^(\s*)(```|~~~)/.test(l);
  const isOpenBracket = (l) => /^\s*\[\s*$/.test(l);
  const isCloseBracket = (l) => /^\s*\]\s*$/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    if (isFence(line)) { // toggle code fence
      inCode = !inCode;
      out.push(line);
      i += 1;
      continue;
    }

    if (!inCode && isOpenBracket(line)) {
      // search for the matching close bracket
      let j = i + 1;
      while (j < lines.length && !isCloseBracket(lines[j])) {
        // if a fence starts before close, abort conversion
        if (isFence(lines[j])) { j = -1; break; }
        j += 1;
      }
      if (j > i + 1 && j !== -1 && isCloseBracket(lines[j])) {
        out.push("$$");
        for (let k = i + 1; k < j; k += 1) out.push(lines[k]);
        out.push("$$");
        i = j + 1;
        continue;
      }
      // no close found; emit as-is
      out.push(line);
      i += 1;
      continue;
    }

    out.push(line);
    i += 1;
  }

  return out.join("\n");
}

// Detect and convert inline parenthetical math: ( ... ) => \( ... \)
// Heuristics: inside must contain TeX-like tokens: \\command, ^, _, \begin{...}, \left, etc.
// Skips code blocks and inline code.
function convertParenInlineMath(src) {
  const isTeXy = (s) => /\\[a-zA-Z]+|\^|_|\\begin\{|\\left|\\right/.test(s);

  let i = 0;
  const n = src.length;
  let out = "";
  let inFence = false;
  let inInline = false; // backtick inline code
  let fenceMarker = ""; // ``` or ~~~

  while (i < n) {
    // handle fences ``` or ~~~ at line starts
    if (!inInline) {
      const lineStart = i === 0 || src[i-1] === "\n";
      if (lineStart) {
        if (!inFence && (src.startsWith("```", i) || src.startsWith("~~~", i))) {
          inFence = true;
          fenceMarker = src.substr(i, 3);
          out += fenceMarker; i += 3; continue;
        } else if (inFence && src.startsWith(fenceMarker, i)) {
          inFence = false;
          out += fenceMarker; i += 3; continue;
        }
      }
    }

    // handle inline code `...`
    if (!inFence && src[i] === "`") {
      let tickCount = 1;
      let j = i + 1;
      while (j < n && src[j] === "`") { tickCount++; j++; }
      const marker = "`".repeat(tickCount);
      out += marker; i = j;
      // toggle inline — naive but effective
      inInline = !inInline;
      continue;
    }

    if (!inFence && !inInline && src[i] === "(") {
      // attempt to find matching ) with nesting
      let depth = 1;
      let j = i + 1;
      while (j < n && depth > 0) {
        const ch = src[j];
        if (ch === "\\") { j += 2; continue; }
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        j++;
      }
      if (depth === 0) {
        const inner = src.slice(i + 1, j - 1);
        if (inner.length >= 3 && isTeXy(inner)) {
          out += "\\(" + inner + "\\)";
          i = j; // consume
          continue;
        }
      }
    }

    out += src[i];
    i++;
  }

  return out;
}

function mergeSoftBreaksForMath(root) {
  const forbidden = new Set(["CODE", "PRE", "SCRIPT", "STYLE"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
  const candidates = [];
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (forbidden.has(el.nodeName)) continue;
    if (el.closest && el.closest('.katex')) continue;
    const children = Array.from(el.childNodes);
    if (!children.length) continue;
    const onlyTextAndBr = children.every(n => n.nodeType === 3 || (n.nodeType === 1 && n.nodeName === 'BR'));
    const hasBr = children.some(n => n.nodeType === 1 && n.nodeName === 'BR');
    if (onlyTextAndBr && hasBr) candidates.push(el);
  }
  for (const el of candidates) {
    const parts = Array.from(el.childNodes).map(n => n.nodeType === 3 ? n.nodeValue : '\n');
    el.textContent = parts.join("");
  }
}

export function isMathBalanced(text = "") {
  if (!text) return true;
  try {
    // $$ ... $$ pairs
    const dd = (text.match(/\$\$/g) || []).length;
    if (dd % 2 !== 0) return false;

    // inline $ ... $ (ignore escaped \$ and $$)
    let single = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') { i++; continue; }
      if (ch === '$') {
        if (text[i+1] === '$') { i++; continue; } // skip $$ counted above
        single ^= 1; // toggle
      }
    }
    if (single !== 0) return false;

    // \( ... \) and \[ ... \]
    const oR = (text.match(/\\\(/g) || []).length;
    const cR = (text.match(/\\\)/g) || []).length;
    if (oR !== cR) return false;
    const oS = (text.match(/\\\[/g) || []).length;
    const cS = (text.match(/\\\]/g) || []).length;
    if (oS !== cS) return false;

    // 检查 {...} 括号是否平衡（对 \sqrt{...} 等命令很重要）
    let braceBalance = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\\') { i++; continue; } // 跳过转义
      if (ch === '{') braceBalance++;
      if (ch === '}') braceBalance--;
    }
    if (braceBalance !== 0) return false;

    return true;
  } catch (_) {
    return true;
  }
}

export const md = { render };
