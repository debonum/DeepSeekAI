import {
  getDeepSeekDefaultModels,
  resolveDeepSeekModel,
} from "./deepseekModelConfig.js";

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
        // 读取主键
        chrome.storage.sync.get(keyName, (data) => {
          let apiKey = data[keyName] || "";

          // 别名迁移：兼容历史拼写错误等情况（如 volcengine <- voiceengine）
          const aliasMap = {
            volcengine: ["voiceengine"],
          };

          const aliases = aliasMap[providerId] || [];
          if (!apiKey && aliases.length > 0) {
            const aliasKeys = aliases.map((a) => `${a}ApiKey`);
            chrome.storage.sync.get(aliasKeys, (aliasData) => {
              const aliasKeyName = aliasKeys.find((k) => aliasData[k]);
              if (aliasKeyName && aliasData[aliasKeyName]) {
                apiKey = aliasData[aliasKeyName];
                // 迁移到正确的键名，保底写入
                chrome.storage.sync.set({ [keyName]: apiKey }, () => {
                  // 可选：清理别名旧键
                  chrome.storage.sync.remove(aliasKeyName, () => {
                    console.log(`已迁移别名密钥 ${aliasKeyName} -> ${keyName}`);
                    resolve(apiKey);
                  });
                });
                return;
              }

              console.log(
                `获取${providerId}的API密钥: ${apiKey ? "已设置" : "未设置"}`
              );
              resolve(apiKey);
            });
          } else {
            console.log(
              `获取${providerId}的API密钥: ${apiKey ? "已设置" : "未设置"}`
            );
            resolve(apiKey);
          }
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

  // 验证API密钥并区分失败原因（必要时使用一次“歧义消解”二次探测）
  async validateApiKey(providerId, apiKey, model) {
    if (!apiKey) return { ok: false, reason: 'invalid_key', status: 0, message: 'Empty API key' };

    try {
      console.log(
        `🔍 开始验证API密钥 - providerId: ${providerId}, model: ${model}`
      );

      // 获取服务商信息
      const provider = await this.getProviderById(providerId);
      if (!provider) {
        console.error(`❌ 未找到服务商信息: ${providerId}`);
        return { ok: false, reason: 'unknown', status: 0, message: 'Provider not found' };
      }

      // 获取API URL
      let apiUrl = (await this.getCustomApiUrl(providerId)) || provider.apiUrl;
      console.log(`🌐 API URL: ${apiUrl}`);
      if (!apiUrl) {
        console.error(`❌ 未找到API URL`);
        return { ok: false, reason: 'unknown', status: 0, message: 'API URL missing' };
      }

      // 非 deepseek 必须提供模型，deepseek 通过兼容层解析成真实请求参数
      const deepseekConfig =
        providerId === "deepseek" ? resolveDeepSeekModel(model) : null;
      const resolvedModel =
        providerId === "deepseek"
          ? (typeof model === "string" && model.trim()) || deepseekConfig.value
          : model;

      if (!resolvedModel) {
        console.error('❌ 验证失败：模型未设置');
        return { ok: false, reason: 'invalid_model', status: 0, message: 'Model not set' };
      }

      const createProbeBody = (probeModel) => {
        if (providerId !== "deepseek") {
          return {
            model: probeModel,
            messages: [{ role: "user", content: "test" }],
            stream: false,
          };
        }

        const probeConfig = resolveDeepSeekModel(probeModel);
        return {
          model: probeConfig.apiModel,
          messages: [{ role: "user", content: "test" }],
          stream: false,
          ...(probeConfig.thinking ? { thinking: probeConfig.thinking } : {}),
          ...(probeConfig.reasoningEffort
            ? { reasoning_effort: probeConfig.reasoningEffort }
            : {}),
        };
      };

      const sendProbe = async (probeModel) => {
        const reqBody = createProbeBody(probeModel);
        return await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "proxyRequest",
              url: apiUrl,
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(reqBody),
            },
            (result) => resolve(result)
          );
        });
      };

      const response = await sendProbe(resolvedModel);

      // 成功
      if (response?.status === 200) {
        await this.saveApiKey(providerId, apiKey);
        return { ok: true, status: 200 };
      }

      // 失败原因判定（含更全面的关键字匹配）
      const classify = (resp) => {
        const status = resp?.status || 0;
        const data = resp?.data || {};
        const text = (resp?.text || resp?.error || '') + '';
        const errorObj = data?.error || {};
        const code = (errorObj.code || errorObj.type || '').toString().toLowerCase();
        const message = (errorObj.message || resp?.error || resp?.text || '').toString();
        const msgLower = message.toLowerCase();

        const isKeyStatus = status === 401 || status === 403;
        const keyHints = ['invalid api key','invalid key','api key','apikey','api-key','unauthorized','authentication','auth','access denied','bearer','token'];
        const modelHints = ['model','not found','no such','does not exist','unknown','unsupported'];

        const matchAny = (hay, arr) => arr.some(w => hay.includes(w));

        const isKeyKeyword = matchAny(code, keyHints) || matchAny(msgLower, keyHints);
        const isModelKeyword = matchAny(code, modelHints) || (msgLower.includes('model') && matchAny(msgLower, modelHints));

        if (isKeyStatus || isKeyKeyword) return { reason: 'invalid_key', status, message };
        if (status === 404 || isModelKeyword) return { reason: 'invalid_model', status, message };
        if (status === 429) return { reason: 'rate_limited', status, message };
        if (status >= 500 && status < 600) return { reason: 'server_error', status, message };
        return { reason: 'unknown', status, message };
      };

      let verdict = classify(response);

      // 歧义消解：当原因为 unknown 或 400 且无明显关键词时，再用“已知有效模型”二次探测
      if (verdict.reason === 'unknown' || verdict.status === 400) {
        try {
          const defaults = this.getDefaultModels(providerId);
          const fallbackModel =
            (defaults && defaults[0]?.value) ||
            (providerId === "deepseek" ? "deepseek-v4-flash" : null);
          if (fallbackModel) {
            const probeResp = await sendProbe(fallbackModel);
            // 如果 fallback 仍然失败且被判定为 key 错，则认定 key 错
            const probeVerdict = classify(probeResp);
            if (!probeResp?.ok) {
              if (probeVerdict.reason === 'invalid_key' || probeResp?.status === 401 || probeResp?.status === 403) {
                verdict = { reason: 'invalid_key', status: probeResp?.status || verdict.status, message: probeVerdict.message };
              } else if (probeVerdict.reason === 'invalid_model') {
                // fallback 也报模型，说明可能不是模型问题而是服务端报文差异，保留 unknown 但倾向 key
                verdict = { reason: 'unknown', status: probeResp?.status || verdict.status, message: probeVerdict.message };
              }
            } else {
              // fallback 成功 → key 正常，原模型异常
              verdict = { reason: 'invalid_model', status: response?.status || 400, message: verdict.message };
            }
          }
        } catch (e) {
          // 忽略二次探测异常，维持原判定
        }
      }

      if (verdict.reason === 'invalid_key') {
        return { ok: false, reason: 'invalid_key', status: verdict.status, message: verdict.message };
      }
      if (verdict.reason === 'invalid_model') {
        return { ok: false, reason: 'invalid_model', status: verdict.status, message: verdict.message };
      }
      if (verdict.reason === 'rate_limited') {
        return { ok: false, reason: 'rate_limited', status: verdict.status, message: verdict.message };
      }
      if (verdict.reason === 'server_error') {
        return { ok: false, reason: 'server_error', status: verdict.status, message: verdict.message };
      }

      return { ok: false, reason: 'unknown', status: verdict.status, message: verdict.message };
    } catch (error) {
      console.error("❌ 验证API密钥错误:", error);
      return { ok: false, reason: 'network', status: 0, message: String(error?.message || error) };
    }
  }

  // 获取服务商的模型列表
  async getModels(providerId) {
    try {
      const { models: storedModels, hasStoredValue } =
        await this.getStoredModelsSnapshot(providerId);

      // 只要用户已经显式保存过该 provider 的模型列表，就以它为准。
      // 这里要区分“空数组”和“未初始化”，否则删到最后一个模型后会被默认模型重新顶回来。
      if (hasStoredValue) {
        return storedModels;
      }

      const legacyModels = await this.getLegacyModels(providerId);

      const deletedDefaultModels = await this.getDeletedDefaultModels(providerId);
      const defaultModels = this.getDefaultModels(providerId);
      const availableDefaultModels = defaultModels.filter(
        (model) => !deletedDefaultModels.includes(model.value)
      );

      return this.mergeModels(legacyModels, availableDefaultModels);
    } catch (error) {
      console.error("获取模型列表错误:", error);
      return [];
    }
  }

  async getStoredModelsSnapshot(providerId) {
    const keyName = `${providerId}Models`;

    return new Promise((resolve) => {
      chrome.storage.sync.get(keyName, (data) => {
        const hasStoredValue = Object.prototype.hasOwnProperty.call(data, keyName);
        const models = Array.isArray(data[keyName]) ? data[keyName] : [];
        resolve({ models, hasStoredValue });
      });
    });
  }

  async getLegacyModels(providerId) {
    try {
      const syncModels = await new Promise((resolve) => {
        chrome.storage.sync.get("customModels", (data) => {
          const models = data?.customModels?.[providerId];
          resolve(Array.isArray(models) ? models : []);
        });
      });

      let localModels = [];
      try {
        const raw = localStorage.getItem(`customModels_${providerId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        localModels = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn(`读取 legacy localStorage 模型失败: ${providerId}`, error);
      }

      return this.mergeModels(syncModels, localModels);
    } catch (error) {
      console.error("获取 legacy 模型列表错误:", error);
      return [];
    }
  }

  mergeModels(...groups) {
    const seen = new Set();
    const merged = [];

    groups.flat().forEach((model) => {
      const value = model?.value;
      if (!value || seen.has(value)) {
        return;
      }

      seen.add(value);
      merged.push({
        value,
        label: model?.label || value,
      });
    });

    return merged;
  }

  async getDeletedDefaultModels(providerId) {
    try {
      const keyName = `${providerId}DeletedDefaultModels`;
      return await new Promise((resolve) => {
        chrome.storage.sync.get(keyName, (data) => {
          resolve(Array.isArray(data[keyName]) ? data[keyName] : []);
        });
      });
    } catch (error) {
      console.error("获取已删除默认模型列表失败:", error);
      return [];
    }
  }

  // 获取服务商的默认模型列表
  getDefaultModels(providerId) {
    const defaultModels = {
      deepseek: getDeepSeekDefaultModels(),
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
