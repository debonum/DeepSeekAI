(function() {
  try {
    if (window.__DeepSeekMathDebugBridgeInstalledPage) return;
    window.__DeepSeekMathDebugBridgeInstalledPage = true;

    const EVENT = "DeepSeekMathDebugToggle";
    const SOURCE = "DeepSeekMathDebugBridge";
    const notify = (flag) => {
      try {
        window.postMessage(
          { source: SOURCE, type: EVENT, enabled: !!flag },
          "*"
        );
      } catch (err) {
        console.warn("DeepSeek math debug notify failed:", err);
      }
    };

    const descriptor = {
      configurable: true,
      get() {
        return window.__DeepSeekMathDebugFlag || false;
      },
      set(value) {
        window.__DeepSeekMathDebugFlag = !!value;
        notify(window.__DeepSeekMathDebugFlag);
      }
    };

    if (!Object.getOwnPropertyDescriptor(window, "__DeepSeekMathDebug")) {
      Object.defineProperty(window, "__DeepSeekMathDebug", descriptor);
    } else {
      const existing = window.__DeepSeekMathDebug;
      Object.defineProperty(window, "__DeepSeekMathDebug", descriptor);
      window.__DeepSeekMathDebug = existing;
      return;
    }

    if (typeof window.__DeepSeekMathDebug !== "undefined") {
      notify(window.__DeepSeekMathDebug);
    }
  } catch (error) {
    console.warn("DeepSeek math debug bridge init failed:", error);
  }
})();
