// 在文件开头添加调试日志
const requestControllers = new Map(); // 存储请求控制器

// 加载自定义Provider
async function loadCustomProviders() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('customProviders', (data) => {
      resolve(data.customProviders || []);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    // 先获取自定义服务商列表，然后再获取其他设置
    chrome.storage.sync.get(['customProviders', 'provider'], async (initialData) => {
      const customProviders = initialData.customProviders || [];
      const provider = initialData.provider || 'deepseek';

      // 构建需要获取的键名列表
      const keysToGet = [
        "deepseekApiKey", "siliconflowApiKey", "openrouterApiKey","volcengineApiKey",
        "tencentcloudApiKey", "iflytekstarApiKey", "baiducloudApiKey", "aliyunApiKey", "aihubmixApiKey",
        "deepseekCustomApiUrl", "siliconflowCustomApiUrl", "openrouterCustomApiUrl",
        "volcengineCustomApiUrl", "tencentcloudCustomApiUrl", "iflytekstarCustomApiUrl",
        "baiducloudCustomApiUrl", "aliyunCustomApiUrl", "aihubmixCustomApiUrl",
        "language", "model"
      ];

      // 为每个自定义服务商添加API key的键名
      customProviders.forEach(p => {
        if (p.id.startsWith('custom_')) {
          keysToGet.push(`${p.id}ApiKey`);
        }
      });

      chrome.storage.sync.get(keysToGet, (data) => {
        let customApiKey = '';
        let customApiUrl = '';

        if (provider.startsWith('custom_')) {
          const customProvider = customProviders.find(p => p.id === provider);
          if (customProvider) {
            // 先从customProvider中获取apiKey
            customApiKey = customProvider.apiKey || '';
            customApiUrl = customProvider.apiUrl || '';

            // 如果customApiKey为空，尝试从${providerId}ApiKey中获取
            if (!customApiKey) {
              const apiKeyName = `${provider}ApiKey`;
              if (data[apiKeyName]) {
                customApiKey = data[apiKeyName];
              }
            }
          }
        }

        sendResponse({
          deepseekApiKey: data.deepseekApiKey || '',
          siliconflowApiKey: data.siliconflowApiKey || '',
          openrouterApiKey: data.openrouterApiKey || '',
          volcengineApiKey: data.volcengineApiKey || '',
          tencentcloudApiKey: data.tencentcloudApiKey || '',
          iflytekstarApiKey: data.iflytekstarApiKey || '',
          baiducloudApiKey: data.baiducloudApiKey || '',
          aliyunApiKey: data.aliyunApiKey || '',
          aihubmixApiKey: data.aihubmixApiKey || '',
          deepseekCustomApiUrl: data.deepseekCustomApiUrl || '',
          siliconflowCustomApiUrl: data.siliconflowCustomApiUrl || '',
          openrouterCustomApiUrl: data.openrouterCustomApiUrl || '',
          volcengineCustomApiUrl: data.volcengineCustomApiUrl || '',
          tencentcloudCustomApiUrl: data.tencentcloudCustomApiUrl || '',
          iflytekstarCustomApiUrl: data.iflytekstarCustomApiUrl || '',
          baiducloudCustomApiUrl: data.baiducloudCustomApiUrl || '',
          aliyunCustomApiUrl: data.aliyunCustomApiUrl || '',
          aihubmixCustomApiUrl: data.aihubmixCustomApiUrl || '',
          language: data.language || 'en',
          model: data.model || 'deepseek-chat',
          provider: provider,
          customApiKey: customApiKey,
          customApiUrl: customApiUrl,
          customProviders: customProviders
        });
      });
    });
    return true;
  }

  if (request.action === "proxyRequest") {


    const controller = new AbortController();
    const signal = controller.signal;

    // 存储控制器
    if (sender?.tab?.id) {
      requestControllers.set(sender.tab.id, controller);
    }

    // 修复: 确保模型参数被正确添加到请求中
    const processRequest = (requestBody) => {


      fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: requestBody,
        signal
      })
      .then(async response => {


        // 如果不是流式响应，直接返回状态
        if (!requestBody.includes('"stream":true')) {
          // 尝试读取响应内容以获取更多错误信息
          try {
            const responseText = await response.text();


            let responseData = null;
            try {
              responseData = JSON.parse(responseText);
            } catch (e) {
              console.log(`⚠️ 响应不是有效的JSON`);
            }

            sendResponse({
              status: response.status,
              ok: response.ok,
              data: responseData,
              text: responseText
            });
          } catch (error) {
            console.error(`❌ 读取响应内容错误:`, error);
            sendResponse({
              status: response.status,
              ok: response.ok,
              error: error.message
            });
          }
          return;
        }

        if (!response.ok) {
          console.error(`❌ HTTP错误! 状态码: ${response.status}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              if (sender?.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  type: "streamResponse",
                  response: { data: 'data: [DONE]\n\n', ok: true, done: true }
                });
              }
              break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim() === '') continue;
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6);
              if (data === '[DONE]') {
                if (sender?.tab?.id) {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "streamResponse",
                    response: { data: 'data: [DONE]\n\n', ok: true, done: true }
                  });
                }
                break;
              }

              if (sender?.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  type: "streamResponse",
                  response: { data: line + '\n\n', ok: true, done: false }
                });
              }
            }
          }
        } catch (error) {
          console.error('读取响应流错误:', error);
          if (sender?.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "streamResponse",
              response: { ok: false, error: error.message }
            });
          }
        } finally {
          reader.releaseLock();
        }
      })
      .catch(error => {
        console.error('请求错误:', error);
        sendResponse({
          ok: false,
          error: error.message
        });
      })
      .finally(() => {
        // 清理控制器
        if (sender?.tab?.id) {
          requestControllers.delete(sender.tab.id);
        }
      });
    };

    // 如果请求体中没有model参数，从storage中获取
    if (request.body && !request.body.includes('"model"')) {
      chrome.storage.sync.get(['model'], (data) => {
        const model = data.model || 'deepseek-chat';
        const bodyObj = JSON.parse(request.body);
        bodyObj.model = model;
        request.body = JSON.stringify(bodyObj);
        processRequest(request.body);
      });
    } else {
      // 请求体已经包含model参数，直接处理

      processRequest(request.body);
    }

    return true;
  }

  if (request.action === "abortRequest") {
    const controller = requestControllers.get(sender.tab.id);
    if (controller) {
      controller.abort();
      requestControllers.delete(sender.tab.id);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "openPopup") {
    chrome.action.openPopup();
    return true;
  }
});

// Create context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "createPopup",
    title: "DeepSeek AI",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "createPopup") {
    chrome.tabs.sendMessage(tab.id, {
      action: "createPopup",
      selectedText: info.selectionText || null,
      message: info.selectionText || getGreeting()
    });
  }
});

// 全局注册命令监听器
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    try {
      // 使用更可靠的方式获取选中文本
      const [{result}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 首先尝试使用window.getSelection()
          const selection = window.getSelection();
          if (selection && selection.toString && selection.toString().trim()) {
            return selection.toString().trim();
          }

          // 如果没有选中文本，尝试检查页面上可能的选中元素
          // 某些网站可能使用自定义选择或点击交互会清除选择
          // 检查是否有具有特定CSS样式的元素表明它们被选中
          const selectedElements = document.querySelectorAll(
            '.selected, .highlight, .highlighted, [aria-selected="true"], ::-moz-selection, ::selection'
          );

          for (const el of selectedElements) {
            if (el.textContent && el.textContent.trim()) {
              return el.textContent.trim();
            }
          }

          // 如果上述都失败，返回空字符串
          return '';
        }
      });


      // 发送toggleChat消息以实现真正的切换功能
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: result, // 发送选中的文本，如果为空则使用问候语
        useGreeting: getGreeting()
      });
    } catch (error) {
      console.error("获取选中文本出错:", error);
      // 即使出错，也发送消息以打开聊天窗口，只是不带选中文本
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: "",
        useGreeting: getGreeting()
      });
    }
  } else if (command === "close-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: "closeChat"
    });
  }
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning 🥰";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon 🥰";
  } else {
    return "Good evening 🥰";
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // 打开说明页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('Instructions/Instructions.html')
    });
  }
});

