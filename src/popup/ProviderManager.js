export class ProviderManager {
  constructor() {
    // 默认服务商列表
    this.defaultProviders = [
      {
        id: "deepseek",
        name: "DeepSeek",
        apiUrl: "https://api.deepseek.com/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://platform.deepseek.com/api_keys",
      },
      {
        id: "openrouter",
        name: "OpenRouter",
        apiUrl: "https://openrouter.ai/api/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://openrouter.ai/settings/keys",
      },
      {
        id: "aihubmix",
        name: "AiHubMix",
        apiUrl: "https://aihubmix.com/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://aihubmix.com?aff=SmJB",
      },
      {
        id: "siliconflow",
        name: "SiliconFlow",
        apiUrl: "https://api.siliconflow.cn/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://cloud.siliconflow.cn/i/lStn36vH",
      },
      {
        id: "volcengine",
        name: "VolcEngine",
        apiUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
        isDefault: true,
        apiKeyLink:
          "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey?apikey=%7B%7D",
      },
      {
        id: "tencentcloud",
        name: "Tencent Cloud",
        apiUrl: "https://api.lkeap.cloud.tencent.com/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://console.cloud.tencent.com/lkeap/api",
      },
      {
        id: "iflytekstar",
        name: "IFlytek Star",
        apiUrl: "https://maas-api.cn-huabei-1.xf-yun.com/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://training.xfyun.cn/modelService",
      },
      {
        id: "baiducloud",
        name: "Baidu Cloud",
        apiUrl: "https://qianfan.baidubce.com/v2/chat/completions",
        isDefault: true,
        apiKeyLink: "https://console.bce.baidu.com/iam/#/iam/apikey/create",
      },
      {
        id: "aliyun",
        name: "Aliyun",
        apiUrl:
          "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
        isDefault: true,
        apiKeyLink: "https://bailian.console.aliyun.com/?apiKey=1#/api-key",
      },
    ];

    // 初始化自定义服务商和隐藏服务商列表
    this.customProviders = [];
    this.hiddenProviders = [];

    // 异步加载自定义和隐藏服务商
    this.init();
  }

  async init() {
    try {
      // 加载自定义服务商
      this.customProviders = await this.loadCustomProviders();

      // 加载隐藏服务商
      this.hiddenProviders = await this.loadHiddenProviders();

    } catch (error) {
      console.error("ProviderManager初始化错误:", error);
    }
  }

  // 获取所有可见的服务商（默认+自定义-隐藏-已删除）
  async getAllVisibleProviders() {
    // 获取隐藏和已删除的服务商ID
    const hiddenProviderIds = this.hiddenProviders.map((p) => p.id);
    const deletedProviderIds = await this.getDeletedDefaultProviders();

    // 合并所有需要过滤的ID
    const filteredIds = [
      ...new Set([...hiddenProviderIds, ...deletedProviderIds]),
    ];

    // 过滤默认服务商
    const visibleDefaultProviders = this.defaultProviders.filter(
      (p) => !filteredIds.includes(p.id)
    );

    return [...visibleDefaultProviders, ...this.customProviders];
  }

  // 获取所有服务商（包括隐藏的）
  async getAllProviders() {
    return [...this.defaultProviders, ...this.customProviders];
  }

  // 根据ID获取服务商
  async getProviderById(id) {
    const allProviders = await this.getAllProviders();
    return allProviders.find((p) => p.id === id) || null;
  }

  // 加载自定义服务商
  async loadCustomProviders() {
    try {
      return new Promise((resolve) => {
        chrome.storage.sync.get("customProviders", (data) => {
          const customProviders = data.customProviders || [];
          resolve(customProviders);
        });
      });
    } catch (error) {
      console.error("加载自定义服务商失败:", error);
      return [];
    }
  }

  // 加载隐藏的服务商
  async loadHiddenProviders() {
    try {
      return new Promise((resolve) => {
        chrome.storage.sync.get("hiddenProviders", (data) => {
          const hiddenProviders = data.hiddenProviders || [];
          resolve(hiddenProviders);
        });
      });
    } catch (error) {
      console.error("加载隐藏服务商失败:", error);
      return [];
    }
  }

  // 保存自定义服务商
  async saveCustomProvider(provider) {
    try {
      // 如果已存在，则更新
      const index = this.customProviders.findIndex((p) => p.id === provider.id);
      if (index !== -1) {
        this.customProviders[index] = provider;
      } else {
        // 确保新服务商有唯一ID
        if (!provider.id) {
          provider.id = "custom_" + Date.now();
        }
        this.customProviders.push(provider);
      }

      return new Promise((resolve) => {
        chrome.storage.sync.set(
          { customProviders: this.customProviders },
          () => {
            if (chrome.runtime.lastError) {
              console.error("保存自定义服务商错误:", chrome.runtime.lastError);
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      console.error("保存自定义服务商错误:", error);
      return false;
    }
  }

  // 隐藏默认服务商
  async hideDefaultProvider(providerId) {
    try {
      const provider = this.defaultProviders.find((p) => p.id === providerId);
      if (!provider) return false;

      // 检查是否已经在隐藏列表中
      if (!this.hiddenProviders.some((p) => p.id === providerId)) {
        this.hiddenProviders.push(provider);
      }

      return new Promise((resolve) => {
        chrome.storage.sync.set(
          { hiddenProviders: this.hiddenProviders },
          () => {
            if (chrome.runtime.lastError) {
              console.error("隐藏服务商错误:", chrome.runtime.lastError);
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      console.error("隐藏服务商错误:", error);
      return false;
    }
  }

  // 显示被隐藏的默认服务商
  async showDefaultProvider(providerId) {
    try {
      // 从隐藏列表中移除
      this.hiddenProviders = this.hiddenProviders.filter(
        (p) => p.id !== providerId
      );

      return new Promise((resolve) => {
        chrome.storage.sync.set(
          { hiddenProviders: this.hiddenProviders },
          () => {
            if (chrome.runtime.lastError) {
              console.error("显示服务商错误:", chrome.runtime.lastError);
              resolve(false);
            } else {
              resolve(true);
            }
          }
        );
      });
    } catch (error) {
      console.error("显示服务商错误:", error);
      return false;
    }
  }

  // 删除自定义服务商
  async deleteCustomProvider(providerId) {
    try {
      // 检查是否是自定义服务商
      const isCustom = this.customProviders.some((p) => p.id === providerId);

      // 删除相关的API密钥和自定义URL
      await this.deleteProviderData(providerId);

      if (isCustom) {
        // 从自定义列表中移除
        this.customProviders = this.customProviders.filter(
          (p) => p.id !== providerId
        );

        // 保存更新后的自定义服务商列表
        return new Promise((resolve) => {
          chrome.storage.sync.set(
            { customProviders: this.customProviders },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "删除自定义服务商错误:",
                  chrome.runtime.lastError
                );
                resolve(false);
              } else {
                resolve(true);
              }
            }
          );
        });
      } else {
        // 如果是默认服务商，添加到永久删除列表中
        // 获取已删除的默认服务商列表
        const deletedDefaultProviders = await this.getDeletedDefaultProviders();

        // 检查是否已经在删除列表中
        if (!deletedDefaultProviders.includes(providerId)) {
          deletedDefaultProviders.push(providerId);
        }

        // 保存更新后的删除列表
        return new Promise((resolve) => {
          chrome.storage.sync.set({ deletedDefaultProviders }, () => {
            if (chrome.runtime.lastError) {
              console.error("删除默认服务商错误:", chrome.runtime.lastError);
              resolve(false);
            } else {
              // 同时也添加到隐藏列表中，确保立即在UI中隐藏
              const provider = this.defaultProviders.find(
                (p) => p.id === providerId
              );
              if (
                provider &&
                !this.hiddenProviders.some((p) => p.id === providerId)
              ) {
                this.hiddenProviders.push(provider);
                chrome.storage.sync.set({
                  hiddenProviders: this.hiddenProviders,
                });
              }
              resolve(true);
            }
          });
        });
      }
    } catch (error) {
      console.error("删除服务商错误:", error);
      return false;
    }
  }

  // 获取已删除的默认服务商列表
  async getDeletedDefaultProviders() {
    try {
      return new Promise((resolve) => {
        chrome.storage.sync.get("deletedDefaultProviders", (data) => {
          const deletedProviders = data.deletedDefaultProviders || [];
          resolve(deletedProviders);
        });
      });
    } catch (error) {
      console.error("获取已删除服务商列表失败:", error);
      return [];
    }
  }

  // 删除服务商相关的所有数据
  async deleteProviderData(providerId) {
    try {
      const keysToRemove = [
        `${providerId}ApiKey`,
        `${providerId}CustomApiUrl`,
        `${providerId}Models`,
      ];

      return new Promise((resolve) => {
        chrome.storage.sync.remove(keysToRemove, () => {
          if (chrome.runtime.lastError) {
            console.error("删除服务商数据错误:", chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("删除服务商数据错误:", error);
      return false;
    }
  }

  // 获取服务商的API密钥
  async getApiKey(providerId) {
    try {
      const keyName = `${providerId}ApiKey`;
      return new Promise((resolve) => {
        chrome.storage.sync.get(keyName, (data) => {
          const apiKey = data[keyName] || "";
          console.log(
            `获取${providerId}的API密钥: ${apiKey ? "已设置" : "未设置"}`
          );
          resolve(apiKey);
        });
      });
    } catch (error) {
      console.error("获取API密钥错误:", error);
      return "";
    }
  }

  // 保存服务商的API密钥
  async saveApiKey(providerId, apiKey) {
    try {
      const keyName = `${providerId}ApiKey`;
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [keyName]: apiKey }, () => {
          if (chrome.runtime.lastError) {
            console.error("保存API密钥错误:", chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("保存API密钥错误:", error);
      return false;
    }
  }

  // 获取服务商的自定义API URL
  async getCustomApiUrl(providerId) {
    try {
      const keyName = `${providerId}CustomApiUrl`;
      return new Promise((resolve) => {
        chrome.storage.sync.get(keyName, (data) => {
          const customApiUrl = data[keyName] || "";
          resolve(customApiUrl);
        });
      });
    } catch (error) {
      console.error("获取自定义API URL错误:", error);
      return "";
    }
  }

  // 保存服务商的自定义API URL
  async saveCustomApiUrl(providerId, customApiUrl) {
    try {
      const keyName = `${providerId}CustomApiUrl`;
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [keyName]: customApiUrl }, () => {
          if (chrome.runtime.lastError) {
            console.error("保存自定义API URL错误:", chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("保存自定义API URL错误:", error);
      return false;
    }
  }

  // 获取服务商的默认API URL
  getDefaultApiUrl(providerId) {
    const provider = this.defaultProviders.find((p) => p.id === providerId);
    if (provider) {
      console.log(`获取${providerId}的默认API URL: ${provider.apiUrl}`);
      return provider.apiUrl;
    }

    // 如果是自定义服务商，从自定义列表中获取
    const customProvider = this.customProviders?.find(
      (p) => p.id === providerId
    );
    if (customProvider) {
      console.log(
        `获取自定义服务商${providerId}的API URL: ${customProvider.apiUrl}`
      );
      return customProvider.apiUrl;
    }

    return "";
  }

  // 获取服务商的API密钥链接
  getApiKeyLink(providerId) {
    const provider = this.defaultProviders.find((p) => p.id === providerId);
    if (provider) {
      return provider.apiKeyLink;
    }

    return "";
  }

  // 验证API密钥
  async validateApiKey(providerId, apiKey, model) {
    if (!apiKey) return false;

    try {
      console.log(
        `🔍 开始验证API密钥 - providerId: ${providerId}, model: ${model}`
      );

      // 获取服务商信息
      const provider = await this.getProviderById(providerId);
      if (!provider) {
        console.error(`❌ 未找到服务商信息: ${providerId}`);
        return false;
      }

      // 获取API URL
      let apiUrl = (await this.getCustomApiUrl(providerId)) || provider.apiUrl;
      console.log(`🌐 API URL: ${apiUrl}`);
      if (!apiUrl) {
        console.error(`❌ 未找到API URL`);
        return false;
      }

      // 构建请求体
      const requestBody = {
        model: model || "deepseek-chat",
        messages: [{ role: "user", content: "test" }],
        stream: false,
      };

      // 发送验证请求


      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "proxyRequest",
            url: apiUrl,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
          },
          (result) => {
            resolve(result);
          }
        );
      });

      if (response?.status === 200) {
        // 验证成功，保存API密钥
        await this.saveApiKey(providerId, apiKey);
        return true;
      }

      console.error(
        `❌ API密钥验证失败 - 状态码: ${response?.status}, 错误: ${
          response?.error || "未知错误"
        }`
      );
      return false;
    } catch (error) {
      console.error("❌ 验证API密钥错误:", error);
      return false;
    }
  }

  // 获取服务商的模型列表
  async getModels(providerId) {
    try {
      // 首先尝试获取自定义模型列表
      const keyName = `${providerId}Models`;
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(keyName, (data) => {
          resolve(data[keyName] || []);
        });
      });

      // 获取已删除的默认模型列表
      const deletedModelsKeyName = `${providerId}DeletedDefaultModels`;
      const deletedDefaultModels = await new Promise((resolve) => {
        chrome.storage.sync.get(deletedModelsKeyName, (data) => {
          resolve(data[deletedModelsKeyName] || []);
        });
      });

      // 如果有自定义模型，返回它们
      if (result && result.length > 0) {
        return result;
      }

      // 否则返回默认模型列表（过滤掉已删除的）
      const defaultModels = this.getDefaultModels(providerId);
      return defaultModels.filter(
        (model) => !deletedDefaultModels.includes(model.value)
      );
    } catch (error) {
      console.error("获取模型列表错误:", error);
      return [];
    }
  }

  // 获取服务商的默认模型列表
  getDefaultModels(providerId) {
    const defaultModels = {
      deepseek: [
        { value: "deepseek-chat", label: "DeepSeek-V3" },
        { value: "deepseek-reasoner", label: "DeepSeek-R1" },
      ],
      siliconflow: [
        { value: "deepseek-ai/DeepSeek-V3", label: "DeepSeek-V3" },
        { value: "deepseek-ai/DeepSeek-R1", label: "DeepSeek-R1" },
        { value: "Pro/deepseek-ai/DeepSeek-V3", label: "DeepSeek-V3 Pro" },
        { value: "Pro/deepseek-ai/DeepSeek-R1", label: "DeepSeek-R1 Pro" },
      ],
      openrouter: [
        { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek-V3" },
        { value: "deepseek/deepseek-r1-0528", label: "DeepSeek-R1" },
        { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek-V3 free" },
        { value: "deepseek/deepseek-r1-0528:free", label: "DeepSeek-R1 free" },
      ],
      tencentcloud: [
        { value: "deepseek-v3", label: "DeepSeek-V3" },
        { value: "deepseek-r1", label: "DeepSeek-R1" },
      ],
      volcengine: [
        { value: "deepseek-v3-250324", label: "DeepSeek-V3" },
        { value: "deepseek-r1-250528", label: "DeepSeek-R1" },
      ],
      iflytekstar: [
        { value: "xdeepseekv3", label: "DeepSeek-V3" },
        { value: "xdeepseekr1", label: "DeepSeek-R1" },
      ],
      baiducloud: [
        { value: "deepseek-v3", label: "DeepSeek-V3" },
        { value: "deepseek-r1-250528", label: "DeepSeek-R1" },
      ],
      aliyun: [
        { value: "deepseek-v3", label: "DeepSeek-V3" },
        { value: "deepseek-r1", label: "DeepSeek-R1" },
      ],
      aihubmix: [
        { value: "DeepSeek-V3", label: "DeepSeek-V3 ByteDance" },
        { value: "deepseek-chat", label: "DeepSeek-V3 DeepSeek" },
        { value: "deepseek-reasoner", label: "DeepSeek-R1 DeepSeek" },
        { value: "DeepSeek-R1", label: "DeepSeek-R1 ByteDance" },
        { value: "aihubmix-DeepSeek-R1", label: "DeepSeek-R1 Azure" },
      ],
    };

    return defaultModels[providerId] || [];
  }

  // 保存服务商的模型列表
  async saveModels(providerId, models) {
    try {
      const keyName = `${providerId}Models`;
      return new Promise((resolve) => {
        chrome.storage.sync.set({ [keyName]: models }, () => {
          if (chrome.runtime.lastError) {
            console.error("保存模型列表错误:", chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("保存模型列表错误:", error);
      return false;
    }
  }

  // 添加模型到服务商
  async addModel(providerId, model) {
    try {
      // 获取当前模型列表
      const models = await this.getModels(providerId);

      // 检查模型是否已存在
      if (models.some((m) => m.value === model.value)) {
        return false;
      }

      // 添加新模型
      models.push(model);

      // 保存更新后的模型列表
      return await this.saveModels(providerId, models);
    } catch (error) {
      console.error("添加模型错误:", error);
      return false;
    }
  }

  // 删除服务商的模型
  async deleteModel(providerId, modelId) {
    try {
      // 获取当前模型列表
      const models = await this.getModels(providerId);

      // 检查是否是默认模型
      const isDefaultModel = this.isDefaultModel(providerId, modelId);

      // 过滤掉要删除的模型
      const updatedModels = models.filter((m) => m.value !== modelId);

      // 如果没有变化，说明模型不存在
      if (updatedModels.length === models.length) {
        return false;
      }

      // 如果是默认模型，需要记录到已删除默认模型列表中
      if (isDefaultModel) {
        await this.addToDeletedDefaultModels(providerId, modelId);
      }

      // 保存更新后的模型列表
      return await this.saveModels(providerId, updatedModels);
    } catch (error) {
      console.error("删除模型错误:", error);
      return false;
    }
  }

  // 检查是否是默认模型
  isDefaultModel(providerId, modelId) {
    const defaultModels = this.getDefaultModels(providerId);
    return defaultModels.some((m) => m.value === modelId);
  }

  // 添加到已删除默认模型列表
  async addToDeletedDefaultModels(providerId, modelId) {
    try {
      // 获取已删除的默认模型列表
      const keyName = `${providerId}DeletedDefaultModels`;
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(keyName, (data) => {
          resolve(data[keyName] || []);
        });
      });

      // 如果模型ID不在列表中，添加它
      if (!result.includes(modelId)) {
        result.push(modelId);

        // 保存更新后的列表
        return new Promise((resolve) => {
          chrome.storage.sync.set({ [keyName]: result }, () => {
            if (chrome.runtime.lastError) {
              console.error(
                "保存已删除默认模型列表错误:",
                chrome.runtime.lastError
              );
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });
      }

      return true;
    } catch (error) {
      console.error("添加到已删除默认模型列表错误:", error);
      return false;
    }
  }

  // 获取第一个可用的服务商
  async getFirstAvailableProvider() {
    const providers = await this.getAllVisibleProviders();
    return providers.length > 0 ? providers[0].id : "deepseek";
  }
}
