# 🚀 DeepSeekAI - Smart Web Assistant

<div align="center">

<img src="src/icons/logo.webp" alt="DeepSeekAI Logo" width="200" />

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/bjjobdlpgglckcmhgmmecijpfobmcpap)](https://chromewebstore.google.com/detail/bjjobdlpgglckcmhgmmecijpfobmcpap)
[![License](https://img.shields.io/github/license/DeepLifeStudio/DeepSeekAI)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/DeepLifeStudio/DeepSeekAI)](https://github.com/DeepLifeStudio/DeepSeekAI/stargazers)

[English](README.md) | [简体中文](README.zh-CN.md)

</div>

## 📖 Introduction

DeepSeekAI is an unofficial browser extension powered by the [DeepSeek](https://deepseek.com) API, designed to enhance your web browsing experience with intelligent interactions. Through simple text selection, you can instantly receive AI-driven responses, making your web browsing more efficient and intelligent.

> **Note**: This extension is a third-party development, not an official DeepSeek product. You need your own DeepSeek API Key to use this extension.

### 🔌 Supported API Providers:
- [DeepSeek](https://deepseek.com) Official API
- [ByteDance Volcengine](https://www.volcengine.com/experience/ark?utm_term=202502dsinvite&ac=DSASUQY5&rc=OXTHJAF8) DeepSeek API ⭐ (Recommended)
- [SiliconFlow](https://cloud.siliconflow.cn/i/lStn36vH) DeepSeek API
- [OpenRouter](https://openrouter.ai/models) DeepSeek API
- [Tencent Cloud](https://cloud.tencent.com/document/product/1772/115969) DeepSeek API
- [IFlytek Star](https://training.xfyun.cn/modelService) DeepSeek API
- [Baidu Cloud](https://console.bce.baidu.com/qianfan/modelcenter/model/buildIn/list) DeepSeek API
- [Aliyun](https://bailian.console.aliyun.com/#/model-market) DeepSeek API

## ✨ Core Features

### 🎯 Smart Interaction
- **Intelligent Text Analysis**: Select any text on web pages for instant AI analysis and responses
- **Multi-turn Dialogue**: Support for continuous conversation interactions
- **Quick Access**: Three ways to invoke the chat window - text selection, right-click menu, and keyboard shortcuts
- **Streaming Response**: Real-time streaming display of AI responses
- **Model Selection**: Choose between DeepSeek V3 and DeepSeek R1 models
- **Multiple API Providers**: Support for various DeepSeek API providers to fit your needs
- **Custom Providers**: Add your own custom API providers with personalized endpoints
- **Custom Models**: Create and manage your own custom models for each provider

### 💎 User Experience
- **Draggable Interface**: Freely drag and resize the chat window
- **Window Memory**: Remember chat window size and position
- **One-click Copy**: Easy copying of response content
- **Regenerate**: Support for regenerating AI responses
- **Keyboard Shortcuts**: Support custom shortcuts to directly pop up the chat window
- **Balance Query**: Real-time API balance checking
- **User Guide**: Built-in detailed usage instructions
  - 📖 [**View Complete Usage Guide**](src/Instructions/instructions.html) - Click to view comprehensive instructions

### 🎨 Content Display
- **Markdown Rendering**: Support for rich Markdown formatting, including code blocks, lists, and mathematical formulas (MathJax)
- **Code Highlighting**: Syntax highlighting for multiple programming languages with copy functionality
- **Multi-language Support**: UI in English/Chinese, AI responses with auto-language detection or specified language
- **Dark Mode**: Automatic dark mode support based on system preferences

## 🚀 Quick Start

### Installation

#### 1. Install from Store (Recommended)
- [Chrome Web Store](https://chromewebstore.google.com/detail/bjjobdlpgglckcmhgmmecijpfobmcpap)
- [Microsoft Edge Add-ons](https://chromewebstore.google.com/detail/deepseek-ai/bjjobdlpgglckcmhgmmecijpfobmcpap)

#### 2. Manual Installation
```bash
# Clone the repository
git clone https://github.com/DeepLifeStudio/DeepSeekAI.git

# Install dependencies
pnpm install

# Build the project
pnpm run build
```

### Configuration

1. Click the extension icon in your browser toolbar
2. Enter your DeepSeek API Key in the popup window
3. Configure language, model, and other preferences
4. Start using! You can:
   - Click the popup icon after selecting text
   - Right-click and select "DeepSeek AI" after text selection
   - Use custom shortcuts to open dialog window/close session window

> 💡 **Need Help?** Check out our [**Complete Usage Guide**](src/Instructions/instructions.html) for detailed instructions on all features including keyboard shortcuts customization!

## 🛠️ Tech Stack

- **Frontend Framework**: JavaScript
- **Build Tool**: Webpack
- **API Integration**: DeepSeek API
- **Styling**: CSS3
- **Code Standard**: ESLint

## 🔜 Roadmap

- [ ] Local history record feature
- [ ] Custom prompt template support

## 🤝 Contributing

All forms of contributions are welcome, whether it's new features, bug fixes, or documentation improvements.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📮 Contact Us

- Project Issues: [GitHub Issues](https://github.com/DeepLifeStudio/DeepSeekAI/issues)
- Email: [1024jianghu@gmail.com](mailto:1024jianghu@gmail.com)
- Twitter/X: [@DeepLifeStudio](https://x.com/DeepLifeStudio)

---

<div align="center">
<h3>If this project helps you, please consider giving it a ⭐️</h3>
</div>
