const MarkdownIt = require("markdown-it");
const mdIt = new MarkdownIt({ html: true, linkify: true, breaks: true });

const text = `
列表语法
无序列表：
* 项目符号
* 星号项
* 加号项

有序列表：
1. 数字项
1. 括号格式
1. 自动序号
`;

console.log(mdIt.render(text));
