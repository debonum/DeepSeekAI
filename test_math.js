
const katex = require("katex");

function protectMath(text) {
  const map = new Map();
  let index = 0;

  // Regex to match code blocks (fence or inline) OR math blocks
  // Group 1: Code (```...``` or `...` or indented lines)
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

const testCase1 = `
Here is a formula:
\\begin{equation}
E = mc^2
\\end{equation}
`;

const testCase2 = `
Here is some code:

    \\begin{equation}
    E = mc^2
    \\end{equation}
`;

const result1 = protectMath(testCase1);
console.log("Test Case 1 (Bare):");
console.log(result1.protectedText);

const result2 = protectMath(testCase2);
console.log("Test Case 2 (Indented):");
console.log(result2.protectedText);
