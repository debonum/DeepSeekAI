import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/common";
import DOMPurify from "dompurify";


import katex from "katex";
import "katex/dist/katex.min.css";

const isBrowserEnvironment = typeof window !== "undefined" && typeof document !== "undefined";

// Minimal markdown-it: default rules only (no plugins, no custom rules)
const mdIt = new MarkdownIt({ html: true, linkify: true, breaks: true });

const sanitizeHtml = (html) => {
  if (!isBrowserEnvironment) return html;
  try {
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target", "rel", "aria-label", "style"],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|ftp|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  } catch (error) {
    console.warn("DOMPurify failed to sanitize HTML:", error);
    return html;
  }
};

function protectMath(text) {
  const map = new Map();
  let index = 0;

  // Regex to match code blocks (fence or inline) OR math blocks
  // Group 1: Code (```...``` or `...`)
  // Group 2: Math ($$...$$ or \[...\] or \(...\) or \begin{...}...\end{...} or $...$)
  const regex = /((?:^|\n)```[\s\S]*?```|`[^`]*`|(?:^|\n)(?: {4}|\t).*)|(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\s*\{([a-zA-Z]+\*?)\}[\s\S]*?\\end\s*\{\3\}|(?<!\\)\$[^$]+(?<!\\)\$)/g;

  const protectedText = text.replace(regex, (match, code, math) => {
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
      return katex.renderToString(entry.content, {
        displayMode: entry.isDisplay,
        throwOnError: false
      });
    } catch (err) {
      console.warn("KaTeX render error:", err);
      return match;
    }
  });
}

export function render(text) {
  if (!text) return "";
  try {
    // Pre-process custom Markdown features
    const processedText = processMarkdownFeatures(String(text));
    const { protectedText, map } = protectMath(processedText);
    const html = mdIt.render(protectedText);
    const sanitized = sanitizeHtml(html);
    return restoreMath(sanitized, map);
  } catch (error) {
    console.warn("Markdown render failed:", error);
    return sanitizeHtml(String(text));
  }
}

// ——— Code block copy button utilities (kept for UX, independent of renderer) ———
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

    // Add hljs classes for theming even without tokenization
    if (!pre.classList.contains("hljs")) pre.classList.add("hljs");
    if (!codeElement.classList.contains("hljs")) codeElement.classList.add("hljs");

    // Optional client-side highlighting (no custom markdown-it rules used)
    try {
      const alreadyTokenized = codeElement.querySelector('[class^="hljs-"]');
      if (!alreadyTokenized && codeElement.textContent) {
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

function _old_isMathBalanced(text = "") {
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

    // bracket-only block lines [ ... ]
    const lines = text.split(/\r?\n/);
    let balance = 0;
    for (const l of lines) {
      if (/^\s*\[\s*$/.test(l)) balance += 1;
      if (/^\s*\]\s*$/.test(l)) balance -= 1;
    }
    if (balance !== 0) return false;

    return true;
  } catch (_) {
    return true;
  }
}

export function isMathBalanced() { return true; }

export const md = { render };
