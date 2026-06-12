// 在文件开头添加调试日志
const requestControllers = new Map(); // 存储请求控制器

// Load custom Provider
async function loadCustomProviders() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("customProviders", (data) => {
      resolve(data.customProviders || []);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    // First, get the list of custom service providers, then get other settings.
    chrome.storage.sync.get(
      ["customProviders", "provider"],
      async (initialData) => {
        const customProviders = initialData.customProviders || [];
        const provider = initialData.provider || "deepseek";

        // Build the list of keys to be retrieved
        const keysToGet = [
          "deepseekApiKey",
          "siliconflowApiKey",
          "openrouterApiKey",
          "volcengineApiKey",
          "tencentcloudApiKey",
          "iflytekstarApiKey",
          "baiducloudApiKey",
          "aliyunApiKey",
          "aihubmixApiKey",
          "deepseekCustomApiUrl",
          "siliconflowCustomApiUrl",
          "openrouterCustomApiUrl",
          "volcengineCustomApiUrl",
          "tencentcloudCustomApiUrl",
          "iflytekstarCustomApiUrl",
          "baiducloudCustomApiUrl",
          "aliyunCustomApiUrl",
          "aihubmixCustomApiUrl",
          "language",
          "model",
          "customSystemPrompt",
        ];

        // Add the API key name for each custom service provider
        customProviders.forEach((p) => {
          if (p.id.startsWith("custom_")) {
            keysToGet.push(`${p.id}ApiKey`);
          }
        });

        chrome.storage.sync.get(keysToGet, (data) => {
          let customApiKey = "";
          let customApiUrl = "";

          if (provider.startsWith("custom_")) {
            const customProvider = customProviders.find(
              (p) => p.id === provider,
            );
            if (customProvider) {
              // First, obtain the apiKey from the customProvider.
              customApiKey = customProvider.apiKey || "";
              customApiUrl = customProvider.apiUrl || "";

              // If customApiKey is empty, try to get it from ${providerId}ApiKey
              if (!customApiKey) {
                const apiKeyName = `${provider}ApiKey`;
                if (data[apiKeyName]) {
                  customApiKey = data[apiKeyName];
                }
              }
            }
          }

          sendResponse({
            deepseekApiKey: data.deepseekApiKey || "",
            siliconflowApiKey: data.siliconflowApiKey || "",
            openrouterApiKey: data.openrouterApiKey || "",
            volcengineApiKey: data.volcengineApiKey || "",
            tencentcloudApiKey: data.tencentcloudApiKey || "",
            iflytekstarApiKey: data.iflytekstarApiKey || "",
            baiducloudApiKey: data.baiducloudApiKey || "",
            aliyunApiKey: data.aliyunApiKey || "",
            aihubmixApiKey: data.aihubmixApiKey || "",
            deepseekCustomApiUrl: data.deepseekCustomApiUrl || "",
            siliconflowCustomApiUrl: data.siliconflowCustomApiUrl || "",
            openrouterCustomApiUrl: data.openrouterCustomApiUrl || "",
            volcengineCustomApiUrl: data.volcengineCustomApiUrl || "",
            tencentcloudCustomApiUrl: data.tencentcloudCustomApiUrl || "",
            iflytekstarCustomApiUrl: data.iflytekstarCustomApiUrl || "",
            baiducloudCustomApiUrl: data.baiducloudCustomApiUrl || "",
            aliyunCustomApiUrl: data.aliyunCustomApiUrl || "",
            aihubmixCustomApiUrl: data.aihubmixCustomApiUrl || "",
            language: data.language || "en",
            model: data.model || "",
            provider: provider,
            customApiKey: customApiKey,
            customApiUrl: customApiUrl,
            customProviders: customProviders,
            customSystemPrompt: data.customSystemPrompt || "",
          });
        });
      },
    );
    return true;
  }

  if (request.action === "proxyRequest") {
    // Add debug log
    console.log(`🌐 proxy request: ${request.url}`);

    // Check if it's a Volcengine request
    if (
      request.url.includes("volcengine") ||
      request.url.includes("volces.com")
    ) {
      console.log(`🔍 Volcengine request details:`);
      console.log(`🔍 Full URL: ${request.url}`);
      console.log(`🔍 Request headers: ${JSON.stringify(request.headers)}`);
      console.log(`🔍 Request body: ${request.body}`);
      // Attempt to parse the request body to obtain model information
      try {
        const requestData = JSON.parse(request.body);
        console.log(`🔍 Volcengine Request Model: ${requestData.model}`);
      } catch (e) {
        console.log(`⚠️ Unable to parse the request body JSON`);
      }
    }

    const controller = new AbortController();
    const signal = controller.signal;

    // storage controller
    if (sender?.tab?.id) {
      requestControllers.set(sender.tab.id, controller);
    }

    // Fix: Ensure model parameters are correctly added to the request
    const processRequest = (requestBody) => {
      fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: requestBody,
        signal,
      })
        .then(async (response) => {
          // Add response status log
          console.log(`📥 Received response: Status code ${response.status}`);

          // If it's a Volcengine request, add more detailed logs
          if (
            request.url.includes("volcengine") ||
            request.url.includes("volces.com")
          ) {
            console.log(
              `🔍 Volcengine response status code: ${response.status}`,
            );

            if (response.status === 404) {
              console.log(`❌ Volcengine 404 error - Possible causes:

1. Incorrect API endpoint: ${request.url}

2. Incorrect model ID format

3. Permission issue`);
            }
          }

          // If it's not a streaming response, return the status directly
          if (!requestBody.includes('"stream":true')) {
            // Try reading the response content to get more error information
            try {
              const responseText = await response.text();

              // Add response content log
              if (
                request.url.includes("volcengine") ||
                request.url.includes("volces.com")
              ) {
                console.log(`🔍 Volcengine response content: ${responseText}`);
              }

              let responseData = null;
              try {
                responseData = JSON.parse(responseText);

                // Add parsed response logs
                if (
                  request.url.includes("volcengine") ||
                  request.url.includes("volces.com")
                ) {
                  console.log(
                    `🔍 Volcengine's parsed response: ${JSON.stringify(responseData)}`,
                  );
                }
              } catch (e) {
                console.log(`⚠️ The response is not valid JSON.`);
              }

              sendResponse({
                status: response.status,
                ok: response.ok,
                data: responseData,
                text: responseText,
              });
            } catch (error) {
              console.error(`❌ Error reading response content: `, error);
              sendResponse({
                status: response.status,
                ok: response.ok,
                error: error.message,
              });
            }
            return;
          }

          if (!response.ok) {
            console.error(`❌ HTTP error! Status code: ${response.status}`);

            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let sseBuffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // Flush any remaining event
                if (sseBuffer.trim()) {
                  const event = sseBuffer;
                  sseBuffer = "";
                  // Process final event
                  const dataLines = event
                    .split("\n")
                    .filter((l) => l.startsWith("data: "));
                  const payload = dataLines.map((l) => l.slice(6)).join("\n");
                  if (sender?.tab?.id) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                      type: "streamResponse",
                      response: {
                        data: `data: ${payload}\n\n`,
                        ok: true,
                        done: false,
                      },
                    });
                  }
                }

                if (sender?.tab?.id) {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "streamResponse",
                    response: {
                      data: "data: [DONE]\n\n",
                      ok: true,
                      done: true,
                    },
                  });
                }
                break;
              }

              sseBuffer += decoder.decode(value, { stream: true });

              // Extract complete SSE events separated by blank line (\n\n)
              let sepIndex;
              while ((sepIndex = sseBuffer.indexOf("\n\n")) !== -1) {
                const event = sseBuffer.slice(0, sepIndex);
                sseBuffer = sseBuffer.slice(sepIndex + 2);

                if (!event.trim()) continue;

                // Collect all data lines for the event
                const dataLines = event
                  .split("\n")
                  .filter((l) => l.startsWith("data: "));
                if (dataLines.length === 0) continue;

                const payload = dataLines.map((l) => l.slice(6)).join("\n");

                if (payload === "[DONE]") {
                  if (sender?.tab?.id) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                      type: "streamResponse",
                      response: {
                        data: "data: [DONE]\n\n",
                        ok: true,
                        done: true,
                      },
                    });
                  }
                  // Continue to drain but mark done for content
                  continue;
                }

                if (sender?.tab?.id) {
                  chrome.tabs.sendMessage(sender.tab.id, {
                    type: "streamResponse",
                    response: {
                      data: `data: ${payload}\n\n`,
                      ok: true,
                      done: false,
                    },
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error reading response stream: ", error);
            if (sender?.tab?.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: "streamResponse",
                response: { ok: false, error: error.message },
              });
            }
          } finally {
            reader.releaseLock();
          }
        })
        .catch((error) => {
          console.error("Request error: ", error);

          // Add more detailed error logs
          if (
            request.url.includes("volcengine") ||
            request.url.includes("volces.com")
          ) {
            console.log(`❌ Volcengine request failed: ${error.message}`);

            console.log(`❌ Request URL: ${request.url}`);

            console.log(
              `❌ Request model: ${JSON.parse(request.body || "{}").model || "unknown"}`,
            );
          }

          sendResponse({
            ok: false,
            error: error.message,
          });
        })
        .finally(() => {
          // Clean up the controller
          if (sender?.tab?.id) {
            requestControllers.delete(sender.tab.id);
          }
        });
    };

    // No longer inject missing models, process directly according to the passed request body.
    processRequest(request.body);

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
      message: info.selectionText || getGreeting(),
    });
  }
});

// Global registration command listener
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-chat") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tab ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://")
    ) {
      return;
    }

    // Check if there are local file access permissions
    if (tab.url.startsWith("file://")) {
      const isAllowed = await new Promise((resolve) =>
        chrome.extension.isAllowedFileSchemeAccess(resolve),
      );
      if (!isAllowed) {
        chrome.tabs.create({
          url: chrome.runtime.getURL(
            "Instructions/Instructions.html#file-access",
          ),
        });
        return;
      }
    }

    try {
      // Use a more reliable method to obtain the selected text
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          if (selection && selection.toString && selection.toString().trim()) {
            return selection.toString().trim();
          }
          return "";
        },
      });

      // Send a toggleChat message to enable the actual toggle functionality
      chrome.tabs
        .sendMessage(tab.id, {
          action: "toggleChat",
          selectedText: result,
          useGreeting: getGreeting(),
        })
        .catch((err) => {
          console.error(
            "DeepSeek AI: Failed to send toggleChat message. Is content script running? ",
            err,
          );
        });
    } catch (error) {
      console.error("Error retrieving selected text: ", error);
      chrome.tabs
        .sendMessage(tab.id, {
          action: "toggleChat",
          selectedText: "",
          useGreeting: getGreeting(),
        })
        .catch((err) =>
          console.error("DeepSeek AI: Failed to send fallback message: ", err),
        );
    }
  } else if (command === "show-hide-chat") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tab ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://")
    ) {
      return;
    }

    // 检查是否有本地文件访问权限
    if (tab.url.startsWith("file://")) {
      const isAllowed = await new Promise((resolve) =>
        chrome.extension.isAllowedFileSchemeAccess(resolve),
      );
      if (!isAllowed) {
        chrome.tabs.create({
          url: chrome.runtime.getURL(
            "Instructions/Instructions.html#file-access",
          ),
        });
        return;
      }
    }

    try {
      // Get selected text
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selection = window.getSelection();
          if (selection && selection.toString && selection.toString().trim()) {
            return selection.toString().trim();
          }
          return "";
        },
      });

      // Send a showHideChat message to preserve window state
      chrome.tabs
        .sendMessage(tab.id, {
          action: "showHideChat",
          selectedText: result,
          useGreeting: getGreeting(),
        })
        .catch((err) => {
          console.error(
            "DeepSeek AI: Failed to send showHideChat message. Is content script running? ",
            err,
          );
        });
    } catch (error) {
      console.error("Error retrieving selected text: ", error);
      chrome.tabs
        .sendMessage(tab.id, {
          action: "showHideChat",
          selectedText: "",
          useGreeting: getGreeting(),
        })
        .catch((err) =>
          console.error("DeepSeek AI: Failed to send fallback message:", err),
        );
    }
  } else if (command === "close-chat") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (
      !tab ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://")
    ) {
      return;
    }

    chrome.tabs
      .sendMessage(tab.id, {
        action: "closeChat",
      })
      .catch((err) => {
        console.error("DeepSeek AI: Failed to send closeChat message: ", err);
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
    // Open the instructions page
    chrome.tabs.create({
      url: chrome.runtime.getURL("Instructions/Instructions.html"),
    });
  }
});
