# 🚀 DeepSeekAI - 智能网页助手

<div align="center">

<img src="src/icons/logo.webp" alt="DeepSeekAI Logo" width="200" />

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/bjjobdlpgglckcmhgmmecijpfobmcpap)](https://chromewebstore.google.com/detail/bjjobdlpgglckcmhgmmecijpfobmcpap)
[![License](https://img.shields.io/github/license/DeepLifeStudio/DeepSeekAI)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/DeepLifeStudio/DeepSeekAI)](https://github.com/DeepLifeStudio/DeepSeekAI/stargazers)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

## 📖 简介

DeepSeekAI 是一款非官方的浏览器扩展插件，基于 [DeepSeek](https://deepseek.com) API，为用户提供智能的网页交互体验。通过简单的文本选择，即可获得 AI 驱动的实时响应，让您的网页浏览体验更加智能和高效。

> **注意**：本扩展插件为第三方开发，非 DeepSeek 官方产品。使用本插件需要您自己的 DeepSeek API Key。

### 🔌 支持的 API 服务商：
- [DeepSeek](https://deepseek.com) 官方 API
- [字节火山引擎](https://www.volcengine.com/experience/ark?utm_term=202502dsinvite&ac=DSASUQY5&rc=OXTHJAF8) DeepSeek API ⭐ (推荐)
- [硅基流动](https://cloud.siliconflow.cn/i/lStn36vH) DeepSeek API
- [OpenRouter](https://openrouter.ai/models) DeepSeek API
- [腾讯云](https://cloud.tencent.com/document/product/1772/115969) DeepSeek API
- [讯飞星辰](https://training.xfyun.cn/modelService) DeepSeek API
- [百度智能云](https://console.bce.baidu.com/qianfan/modelcenter/model/buildIn/list) DeepSeek API
- [阿里云](https://bailian.console.aliyun.com/#/model-market) DeepSeek API

## ✨ 核心特性

### 🎯 智能交互
- **智能文本分析**：支持网页任意文本选择，即时获取 AI 分析和回复
- **多轮对话**：支持基础的对话功能，实现连续对话交互
- **快捷操作**：支持文本选择、右键菜单和快捷键三种方式唤起对话窗口
- **流式响应**：AI 回复实时流式显示，提供即时反馈 
- **模型选择**：支持选择 DeepSeek V3 和 DeepSeek R1 模型
- **多种 API 提供商**：支持多种 DeepSeek API 服务商，满足不同需求
- **自定义供应商**：支持添加自定义 API 供应商，可配置个性化接入点
- **自定义模型**：支持为每个供应商创建和管理自定义模型

### 💎 用户体验
- **可拖拽界面**：对话窗口支持自由拖拽和大小调整
- **窗口记忆**：支持记住对话窗口的大小和位置
- **一键复制**：便捷的回复内容复制功能
- **重新生成**：支持重新生成 AI 回复
- **快捷键支持**：支持自定义快捷键直接弹出会话窗口
- **余额查询**：支持实时查询 API 余额
- **使用说明**：内置详细的使用教程
  - 📖 [**查看完整使用方式**](src/Instructions/instructions.html) - 点击查看详细说明文档

### 🎨 内容展示
- **Markdown 渲染**：支持丰富的 Markdown 格式，包括代码块、列表和数学公式（MathJax）
- **代码高亮**：支持多种编程语言的语法高亮，并提供一键复制功能
- **多语言支持**：支持中英文界面切换，AI 回复支持自动语言检测或指定语言
- **暗色模式**：根据系统偏好自动切换暗色模式

## 🚀 快速开始

### 安装方式

#### 1. 应用商店安装（推荐）
- [Chrome Web Store](https://chromewebstore.google.com/detail/bjjobdlpgglckcmhgmmecijpfobmcpap)
- [Microsoft Edge Add-ons](https://chromewebstore.google.com/detail/deepseek-ai/bjjobdlpgglckcmhgmmecijpfobmcpap)
- [其他安装地址](https://www.crxsoso.com/webstore/detail/bjjobdlpgglckcmhgmmecijpfobmcpap)（支持 Chromium 内核的浏览器如 Edge/Chrome 等）
  - 安装方法请参考 [这里](https://www.youxiaohou.com/zh-cn/crx.html?spm=1739204947442#edge%E6%B5%8F%E8%A7%88%E5%99%A8)

#### 2. 手动安装
```bash
# 克隆项目
git clone https://github.com/DeepLifeStudio/DeepSeekAI.git

# 安装依赖
pnpm install

# 构建项目
pnpm run build
```

### 配置说明

1. 安装完成后，点击浏览器工具栏中的扩展图标
2. 在弹出窗口中输入您的 DeepSeek API Key
3. 根据个人偏好配置语言、模型和其他选项
4. 开始使用！您可以：
   - 选择网页文本后点击弹出的图标
   - 选择文本后右键选择 "DeepSeek AI"
   - 使用自定义快捷键打开对话窗口/关闭会话窗口

> 💡 **需要帮助？** 查看我们的 [**完整使用方式**](src/Instructions/instructions.html) 了解所有功能的详细说明，包括快捷键自定义等！

## 🛠️ 技术栈

- **前端框架**：JavaScript
- **构建工具**：Webpack
- **API 集成**：DeepSeek API
- **样式处理**：CSS3
- **代码规范**：ESLint

## 🔜 开发路线
- [ ] 添加本地历史记录功能
- [ ] 支持自定义提示词模板



## 🤝 贡献指南

欢迎所有形式的贡献，无论是新功能、bug 修复还是文档改进。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📮 联系我们

- 项目问题：[GitHub Issues](https://github.com/DeepLifeStudio/DeepSeekAI/issues)
- 邮件联系：[1024jianghu@gmail.com](mailto:1024jianghu@gmail.com)
- Twitter/X：[@DeepLifeStudio](https://x.com/DeepLifeStudio)

---

<div align="center">
<h3>如果这个项目对您有帮助，请考虑给它一个 ⭐️</h3>
</div> 