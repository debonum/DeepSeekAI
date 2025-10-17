import MarkdownIt from "markdown-it";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import bash from "highlight.js/lib/languages/bash";
import python from "highlight.js/lib/languages/python";
import markdown from "highlight.js/lib/languages/markdown";

// 仅注册常用语言，减少体积
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('markdown', markdown);
// 延迟加载 mathjax，仅在检测到数学公式时再引入插件

// 使用 WeakMap 来缓存已处理过的数学公式
const mathCache = new WeakMap();
const processedTexts = new Map();

// 使用 Memoization 优化预处理数学公式
const memoizedPreprocessMath = (() => {
  const cache = new Map();
  return (text) => {
    if (cache.has(text)) {
      return cache.get(text);
    }
    const result = preprocessMath(text);
    cache.set(text, result);
    return result;
  };
})();

// 预处理数学公式
function preprocessMath(text) {
  // 使用正则表达式优化：减少重复处理
  const patterns = {
    brackets: /[{([})\]]/g,
    blockFormula: /\\\[([\s\S]*?)\\\]/g,
    inlineFormula: /\\\(([\s\S]*?)\\\)/g,
    subscripts: /(\d+|[a-zA-Z])([_^])(\d+)(?!\})/g,
    specialSymbols: /\\(pm|mp|times|div|gamma|ln|int|infty|leq|geq|neq|approx)\b/g,
  };

  // 优化括号匹配检查
  const checkBrackets = (str) => {
    const stack = [];
    const pairs = { '{': '}', '[': ']', '(': ')' };
    for (const char of str.match(patterns.brackets) || []) {
      if ('{(['.includes(char)) {
        stack.push(char);
      } else if (stack.length === 0 || pairs[stack.pop()] !== char) {
        return false;
      }
    }
    return stack.length === 0;
  };

  // 批量处理文本替换
  let processed = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '');

  // 优化块级公式处理
  processed = processed.replace(patterns.blockFormula, (_, p1) =>
    `\n$$${p1.trim().replace(/\n\s+/g, '\n')}$$\n`
  );

  // 优化行内公式处理
  processed = processed.replace(patterns.inlineFormula, (_, p1) =>
    `$${p1.trim()}$`
  );

  // 优化上下标处理
  processed = processed.replace(patterns.subscripts, '$1$2{$3}');

  // 使用 Map 优化特殊字符替换
  const specialChars = new Map([
    ['∫', '\\int '],
    ['±', '\\pm '],
    ['∓', '\\mp '],
    ['×', '\\times '],
    ['÷', '\\div '],
    ['∞', '\\infty '],
    ['≤', '\\leq '],
    ['≥', '\\geq '],
    ['≠', '\\neq '],
    ['≈', '\\approx ']
  ]);

  // 批量处理特殊字符
  for (const [char, replacement] of specialChars) {
    processed = processed.replaceAll(char, replacement);
  }

  return processed;
}

// 创建 MarkdownIt 实例并优化配置
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (str, lang) => {
    if (!lang || !hljs.getLanguage(lang)) {
      return `<div class="code-wrap">${md.utils.escapeHtml(str)}</div>`;
    }
    try {
      return `<div class="code-wrap">${hljs.highlight(str, { language: lang }).value}</div>`;
    } catch {
      return `<div class="code-wrap">${md.utils.escapeHtml(str)}</div>`;
    }
  }
});

// 优化 mathjax 配置
const mathjaxOptions = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
    processEscapes: true,
    processEnvironments: true,
    packages: ['base', 'ams', 'noerrors', 'noundefined']
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    ignoreHtmlClass: 'tex2jax_ignore',
    processHtmlClass: 'tex2jax_process'
  },
  chtml: {
    scale: 1,
    minScale: .5,
    mtextInheritFont: true,
    merrorInheritFont: true
  }
};

let mathPluginEnabled = false; // 仅在需要时启用一次

function shouldRenderMath(text) {
  // 检测 $$...$$ 或 $...$
  return /\$\$[\s\S]+?\$\$/.test(text) || /(^|[^$])\$([^$]+)\$(?!\$)/.test(text);
}

// 优化渲染方法
const originalRender = md.render.bind(md);
md.render = function(text) {
  try {
    // 使用缓存的预处理结果
    const preprocessedText = memoizedPreprocessMath(text);

    if (processedTexts.has(preprocessedText)) {
      return processedTexts.get(preprocessedText);
    }

    // 使用 Promise 和 requestAnimationFrame 优化渲染时机
    const renderPromise = new Promise(async (resolve) => {
      // 如需数学渲染，按需加载插件（代码分割）
      if (!mathPluginEnabled && shouldRenderMath(preprocessedText)) {
        try {
          const { default: mathjax3 } = await import(/* webpackChunkName: "mathjax3" */ "markdown-it-mathjax3");
          md.use(mathjax3, mathjaxOptions);
          mathPluginEnabled = true;
        } catch (e) {
          console.warn('MathJax plugin load failed, fallback to plain text:', e);
        }
      }

      requestAnimationFrame(() => {
        const result = originalRender(preprocessedText)
          .replace(/\$\$([\s\S]+?)\$\$/g, (_, p1) =>
            `<div class="math-block">$$${p1}$$</div>`
          )
          .replace(/\$([^$]+?)\$/g, (_, p1) =>
            `<span class="math-inline">$${p1}$</span>`
          );

        processedTexts.set(preprocessedText, result);
        resolve(result);
      });
    });

    return renderPromise;
  } catch (error) {
    console.error('渲染错误:', error);
    return originalRender(text);
  }
};

// 优化代码块渲染器
md.renderer.rules.fence = (() => {
  const defaultFence = md.renderer.rules.fence;

  return function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const code = token.content.trim();
    const lang = token.info.trim();

    const rawHtml = defaultFence(tokens, idx, options, env, self);

    return `
      <div class="code-block-wrapper">
        <pre class="code-wrap">${rawHtml}</pre>
        <button class="copy-button" data-code="${encodeURIComponent(code)}">
          <img src="${chrome.runtime.getURL("icons/copy.svg")}" alt="Copy" class="copy-icon" />
        </button>
      </div>
    `.trim();
  };
})();

// 使用事件委托处理复制按钮点击
document.addEventListener('click', async function(event) {
  const copyButton = event.target.closest('.copy-button');
  if (!copyButton) return;

  event.preventDefault();
  event.stopPropagation();

  const code = decodeURIComponent(copyButton.dataset.code);
  if (code) {
    try {
      await navigator.clipboard.writeText(code);

      // 复制成功的视觉反馈
      copyButton.classList.add('copied');

      // 更新复制按钮文本/图标
      const copyIcon = copyButton.querySelector('.copy-icon');
      if (copyIcon) {
        // 使用check.svg图标
        copyButton.innerHTML = `<img src="${chrome.runtime.getURL("icons/check.svg")}" alt="Copied" class="copy-icon copied-icon" />`;
      }

      // 2秒后恢复原始状态
      setTimeout(() => {
        copyButton.classList.remove('copied');
        copyButton.innerHTML = `<img src="${chrome.runtime.getURL("icons/copy.svg")}" alt="Copy" class="copy-icon" />`;
      }, 2000);

    } catch (error) {
      console.error('Failed to copy:', error);
    }
  } else {
    console.warn('No code text found to copy');
  }
}, true);

// 添加全局处理函数，在AI响应完成后才显示复制按钮
export function initCopyButtonsVisibility() {
  // 监听DOM变化，处理流式响应过程中的代码块
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 查找新添加的代码块
            const codeBlocks = node.querySelectorAll ? node.querySelectorAll('.code-block-wrapper') : [];
            codeBlocks.forEach(block => {
              // 隐藏复制按钮直到代码完成加载
              const button = block.querySelector('.copy-button');
              if (button) {
                button.style.display = 'none';
              }
            });
          }
        });
      }
    });
  });

  // 观察AI响应容器
  const aiResponseContainer = document.getElementById('ai-response');
  if (aiResponseContainer) {
    observer.observe(aiResponseContainer, {
      childList: true,
      subtree: true
    });
  }

  return observer;
}

// 检查代码块是否已完成渲染（在AI响应完成后调用）
export function showCodeCopyButtons() {
  const aiResponseContainer = document.getElementById('ai-response');
  if (!aiResponseContainer) return;

  // 查找所有代码块中的复制按钮
  const copyButtons = aiResponseContainer.querySelectorAll('.code-block-wrapper .copy-button');

  // 显示所有复制按钮
  copyButtons.forEach(button => {
    if (button.style.display === 'none') {
      // 先保持透明并逐渐淡入，避免突然出现
      button.style.opacity = '0';
      button.style.display = '';

      // 使用requestAnimationFrame确保样式变化已经应用
      requestAnimationFrame(() => {
        button.style.transition = 'opacity 0.3s ease';
        button.style.opacity = '';
      });
    }
  });
}

export { md };
