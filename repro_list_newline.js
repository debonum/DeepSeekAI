const MarkdownIt = require("markdown-it");
const mdIt = new MarkdownIt({ html: true, linkify: true, breaks: true });

// Case 1: No blank line before list
const textNoBlank = `有序列表：
1. 数字项
1. 括号格式
1. 自动序号`;

console.log("--- No Blank Line ---");
console.log(mdIt.render(textNoBlank));

// Case 2: With blank line
const textWithBlank = `有序列表：

1. 数字项
1. 括号格式
1. 自动序号`;

console.log("\n--- With Blank Line ---");
console.log(mdIt.render(textWithBlank));
