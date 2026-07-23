const supportedFormats = new Set(['png', 'jpeg', 'webp']);
const formatFor = (format) => supportedFormats.has(format) ? format : 'png';
const filenameFor = (format) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `Tab Screenshot ${timestamp}.${formatFor(format)}`;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'open-annotator') {
        await chrome.storage.local.set({ pendingScreenshot: { dataUrl: message.dataUrl, format: message.format, destination: message.destination || 'file' } });
        await chrome.tabs.create({ url: chrome.runtime.getURL('annotation.html') });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'download-image') {
        await chrome.downloads.download({
          url: message.dataUrl,
          filename: filenameFor(message.format),
          saveAs: true,
        });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'capture-visible' && sender.tab?.id) {
        const format = formatFor(message.format);
        // captureVisibleTab only guarantees PNG/JPEG; use PNG then encode WebP in the tab.
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: 'full-screenshot', dataUrl, format,
        });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'capture-selection' && sender.tab?.id) {
        const format = formatFor(message.format);
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: 'crop-screenshot', dataUrl, crop: message.crop, format,
        });
        sendResponse({ ok: true });
      }
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true;
});
