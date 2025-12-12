// Ensure chunk loading uses the extension package instead of trying to auto-detect.
const getExtensionBaseUrl = () => {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    return chrome.runtime.getURL("/");
  }
  if (typeof browser !== "undefined" && browser.runtime?.getURL) {
    return browser.runtime.getURL("/");
  }
  return "/";
};

// eslint-disable-next-line no-undef
__webpack_public_path__ = getExtensionBaseUrl();
